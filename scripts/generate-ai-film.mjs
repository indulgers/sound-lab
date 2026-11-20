#!/usr/bin/env node
/**
 * Generate one *candidate* Bali or Chiang Mai AI film from Runway Dev.
 *
 * Dry-run by default, and never charge a provider without --execute and
 * an explicit per-shot --max-usd ceiling. The caller provides its own API
 * credentials in RUNWAYML_API_SECRET, never through a URL or tracked file.
 *
 * See https://docs.dev.runwayml.com/guides/using-the-api/
 *
 * Examples:
 *  node scripts/generate-ai-film.mjs --scene bali --shot hero
 *  RUNWAYML_API_SECRET=... node scripts/generate-ai-film.mjs --scene bali --shot hero --execute --max-usd 2
 *  node scripts/generate-ai-film.mjs --task TASK_ID --scene bali --shot hero --execute
 */
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { AI_FILM_MODEL, getAiFilmShot } from '../src/scenes/ai-film-pilot.mjs';

const API = 'https://api.dev.runwayml.com';
const VERSION = '2024-11-06';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RATIOS = Object.freeze({
  '1920:1080': { folder: 'landscape', tag: '1920x1080', rateCredits: 10 },
  '1080:1920': { folder: 'portrait', tag: '1080x1920', rateCredits: 10 },
  '3840:2160': { folder: 'landscape', tag: '3840x2160', rateCredits: 21 },
  '2160:3840': { folder: 'portrait', tag: '2160x3840', rateCredits: 21 },
});

export function parseFilmArgs(argv) {
  const values = { scene: 'bali', shot: 'hero', ratio: '1920:1080', execute: false, maxUsd: null, task: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') continue;
    if (a === '--execute') values.execute = true;
    else if (a === '--help' || a === '-h') values.help = true;
    else if (['--scene','--shot','--ratio','--max-usd','--task'].includes(a)) {
      const key = a.substring(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
      values[key] = argv[++i];
      if (!values[key]) throw new Error('Missing argument for ' + a);
    } else throw new Error('Unknown option: ' + a);
  }
  if (!values.help && !getAiFilmShot(values.scene, values.shot)) throw new Error('Choose a known --scene and --shot');
  if (!values.help && !RATIOS[values.ratio]) throw new Error('Unsupported ratio');
  values.maxUsd = values.maxUsd === null ? null : Number(values.maxUsd);
  if (values.maxUsd !== null && (!Number.isFinite(values.maxUsd) || values.maxUsd <= 0)) {
    throw new Error('--max-usd must be positive');
  }
  return values;
}

export function aiFilmRequest(args) {
  const shot = getAiFilmShot(args.scene,args.shot);
  if (!shot) throw new Error('Unknown scene/shot');
  return { model: AI_FILM_MODEL, promptText: shot.promptText, ratio: args.ratio, duration: shot.duration };
}

export function estimatedUsd(args) {
  const ratio = RATIOS[args.ratio];
  if (!ratio) throw new Error('Invalid ratio');
  return (ratio.rateCredits * getAiFilmShot(args.scene,args.shot).duration) / 100;
}

async function runwayRequest(path, options = {}) {
  const key = process.env.RUNWAYML_API_SECRET;
  if (!key) throw new Error('Set RUNWAYML_API_SECRET locally; never commit it.');
  const response = await fetch(API + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + key,
      'X-Runway-Version': VERSION,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Runway HTTP '+response.status+': '+JSON.stringify(data).slice(0,900));
  return data;
}

const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));

async function waitForTask(taskId) {
  const deadline = Date.now() + 15 * 60_000;
  while (Date.now() < deadline) {
    const task = await runwayRequest('/v1/tasks/' + encodeURIComponent(taskId));
    if (task.status === 'SUCCEEDED') return task;
    if (['FAILED','CANCELED'].includes(task.status)) throw new Error('Video task '+taskId+' ended: '+JSON.stringify(task).slice(0,900));
    await sleep(6_000);
  }
  throw new Error('Task still pending: '+taskId+'. Resume with --task '+taskId+' (no new charge).');
}

async function saveMp4(url, destination) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!response.ok || !response.body) throw new Error('Failed to retrieve generated video: HTTP '+response.status);
  if (!new URL(url).protocol.startsWith('https:')) throw new Error('Refusing non-HTTPS output.');
  await mkdir(dirname(destination), { recursive: true });
  const temp = destination+'.partial-'+process.pid;
  try {
    await pipeline(Readable.fromWeb(response.body),createWriteStream(temp));
    const bytes = await stat(temp);
    if (bytes.size < 100_000) throw new Error('Generated output is unexpectedly small.');
    const { open } = await import('node:fs/promises');
    const handle = await open(temp,'r');
    const header = Buffer.alloc(12);
    try { await handle.read(header,0,12,0); }
    finally { await handle.close(); }
    if (header.toString('ascii',4,8) !== 'ftyp') throw new Error('Output is not an MP4; inspect provider format.');
    await rename(temp,destination);
    return bytes.size;
  } catch(error) {
    await rm(temp,{force:true}).catch(()=>{});
    throw error;
  }
}

export async function run(args = parseFilmArgs(process.argv.slice(2))) {
  if (args.help) {
    console.log('node scripts/generate-ai-film.mjs --scene bali|chiang-mai --shot hero|detail [--ratio 1920:1080] [--execute --max-usd 2]');
    console.log('Resume an existing task: --task TASK_ID --execute --scene bali --shot hero');
    return;
  }
  const payload = aiFilmRequest(args), usd = estimatedUsd(args);
  const scene = getAiFilmShot(args.scene,args.shot);
  console.log(JSON.stringify({title:scene.title,disclosure:scene.disclosure,request:payload,estimatedCostUsd:usd,mode:args.execute?'EXECUTE':'DRY_RUN'},null,2));
  if (!args.execute) return;
  if (!args.task && (args.maxUsd === null || args.maxUsd < usd)) {
    throw new Error('Paid generation requires --max-usd '+usd+' or higher. Budget must be explicitly approved.');
  }

  const ratio = RATIOS[args.ratio];
  const target = join(ROOT,'private/ai-film-inputs',args.scene,args.scene+'-'+args.shot+'-'+ratio.tag+'.mp4');
  let taskId = args.task;
  if (!taskId) {
    const created = await runwayRequest('/v1/text_to_video', { method:'POST', body:JSON.stringify(payload) });
    taskId = created.id;
    if (!taskId) throw new Error('Provider did not return task ID');
    console.log('Task created:',taskId,'(may be billable).');
  } else {
    if (!/^[a-f0-9-]{15,70}$/i.test(taskId)) throw new Error('Invalid task ID');
    console.log('Resuming existing task:',taskId,'(no new generation requested).');
  }
  try {
    const task = await waitForTask(taskId);
    const output = task.output?.find(u => typeof u === 'string' && /^https:\/\//.test(u));
    if (!output) throw new Error('Task completed but no HTTPS MP4 output was returned.');
    const size = await saveMp4(output,target);
    await writeFile(target+'.json',JSON.stringify({
      scene:args.scene,shot:args.shot,title:scene.title,disclosure:scene.disclosure,
      origin:'AI-generated / fictional place-inspired',model:payload.model,
      provider:'Runway Dev',taskId,ratio:args.ratio,duration:payload.duration,
      costEstimateUsd:usd,acceptedForProduction:false,
      createdAt:new Date().toISOString(),fileName:target.split('/').at(-1),
      bytes:size,
    },null,2)+'\n');
    console.log('Candidate saved:',target);
    console.log('NOT PUBLISHED: run film QA before any use in production.');
  } catch(error) {
    console.error('Task ID for resuming without re-billing:',taskId);
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(error=>{console.error(error.message);process.exitCode=1;});
}
