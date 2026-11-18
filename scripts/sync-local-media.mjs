#!/usr/bin/env node
/**
 * Restore destination films/posters and 15-minute MP3 stems for a local checkout.
 * Large generated media is excluded from Git and built in CI.
 * Examples: npm run assets:sync
 *           npm run assets:sync -- --scene chiang-mai
 *           npm run assets:check
 * Override: SOUNDLAB_MEDIA_ORIGIN=https://your-worker.workers.dev
 */
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

export const SCENE_IDS = Object.freeze(['bali', 'chiang-mai', 'da-lat', 'kyoto', 'lisbon', 'hoi-an']);
export const DEFAULT_MEDIA_ORIGIN = 'https://sound-cocktail.weiyezhu180.workers.dev';
const LAYERS = Object.freeze(['harmony', 'details', 'atmosphere']);
const FILM_SUFFIXES = Object.freeze(['travel.mp4','travel-mobile.mp4','travel.jpg','travel-mobile.jpg']);

export function assetsForScene(scene) {
  if (!SCENE_IDS.includes(scene)) throw new Error('Unknown scene: ' + scene);
  return [
    ...FILM_SUFFIXES.map(x => 'public/assets/scenes/' + scene + '-' + x),
    ...LAYERS.map(x => 'public/assets/audio/journeys/' + scene + '-' + x + '.mp3'),
  ];
}

export function parseMediaArgs(argv) {
  const result = { mode: 'sync', origin: process.env.SOUNDLAB_MEDIA_ORIGIN || DEFAULT_MEDIA_ORIGIN,
    scenes: [...SCENE_IDS], force: false };
  for (let i=0;i<argv.length;i++) {
    const [key,inline] = argv[i].split('=',2);
    if (key === '--check') result.mode = 'check';
    else if (key === '--force') result.force = true;
    else if (key === '--help' || key === '-h') result.mode = 'help';
    else if (key === '--scene' || key === '--origin') {
      const value = inline || argv[++i];
      if (!value) throw new Error('Missing value for ' + key);
      if (key === '--scene') {
        if (!SCENE_IDS.includes(value)) throw new Error('Unknown scene: ' + value);
        result.scenes = [value];
      } else result.origin = value;
    } else throw new Error('Unknown option: ' + argv[i]);
  }
  const url = new URL(result.origin);
  if (url.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(url.hostname)) {
    throw new Error('Media source must be HTTPS unless localhost');
  }
  result.origin = url.origin;
  return result;
}

const sizeThreshold = p => p.endsWith('.mp3') ? 300_000 : p.endsWith('.mp4') ? 150_000 : p.endsWith('.jpg') ? 4_000 : 10;
const manifestPaths = ['public/assets/scenes/real-travel-films.json','public/assets/audio/journeys/manifest.json'];
const readJson = async p => { try { return JSON.parse(await readFile(p,'utf8')); } catch { return null; } };
const fileName = p => p.split('/').at(-1);

export function expectedFilmHash(asset, manifest) {
  const name = fileName(asset);
  const scene = SCENE_IDS.find(x => name.startsWith(x + '-'));
  return manifest?.scenes?.[scene]?.files?.[name]?.sha256 || null;
}

async function validAsset(asset, root, filmManifest) {
  const path = join(root, asset);
  try {
    const s = await stat(path);
    if (!s.isFile() || s.size < sizeThreshold(asset)) return false;
    const expected = expectedFilmHash(asset, filmManifest);
    if (expected) {
      const actual = createHash('sha256').update(await readFile(path)).digest('hex');
      if (actual !== expected) return false;
    }
    return true;
  } catch { return false; }
}

async function request(origin, asset) {
  const url = origin + asset.replace(/^public/,'');
  const res = await fetch(url,{signal:AbortSignal.timeout(120_000),redirect:'follow'});
  if (!res.ok) throw new Error('HTTP ' + res.status + ' from ' + url);
  if ((res.headers.get('content-type') || '').includes('text/html')) {
    throw new Error('Expected media but received HTML from ' + url);
  }
  return res;
}

async function fetchAsset(origin, asset, root) {
  const target = join(root,asset);
  const temporary = target + '.partial-' + process.pid;
  await mkdir(dirname(target),{recursive:true});
  try {
    const res = await request(origin,asset);
    if (!res.body) throw new Error('Empty media response for ' + asset);
    await pipeline(Readable.fromWeb(res.body),createWriteStream(temporary));
    if ((await stat(temporary)).size < sizeThreshold(asset)) {
      throw new Error('Media too small: ' + asset);
    }
    await rename(temporary,target);
  } catch(error) {
    await rm(temporary,{force:true}).catch(()=>{});
    throw error;
  }
}

async function restoreManifest(origin,asset,root) {
  const response = await request(origin,asset);
  const payload = await response.json();
  if (!payload?.scenes || !SCENE_IDS.every(id=>payload.scenes[id])) {
    throw new Error('Invalid scene manifest: ' + asset);
  }
  const target=join(root,asset), tmp=target+'.partial-'+process.pid;
  await mkdir(dirname(target),{recursive:true});
  try {
    await writeFile(tmp,JSON.stringify(payload,null,2)+'\n');
    await rename(tmp,target);
  } catch(error) {
    await rm(tmp,{force:true}).catch(()=>{});
    throw error;
  }
  return payload;
}

export async function runLocalMedia(argv=process.argv.slice(2),root=resolve(dirname(fileURLToPath(import.meta.url)),'..')) {
  const args=parseMediaArgs(argv);
  if (args.mode==='help') {
    console.log('npm run assets:sync [-- --scene bali] [-- --origin https://host] [-- --force]');
    console.log('npm run assets:check [-- --scene chiang-mai]');
    return;
  }
  const [filmPath,audioPath]=manifestPaths;
  let filmManifest=await readJson(join(root,filmPath));
  let audioManifest=await readJson(join(root,audioPath));
  if (args.mode==='sync') {
    console.log('Fetching media from '+args.origin);
    filmManifest=await restoreManifest(args.origin,filmPath,root);
    audioManifest=await restoreManifest(args.origin,audioPath,root);
  }
  const missing=[];
  let downloaded=0;
  const assets=args.scenes.flatMap(assetsForScene);
  for (const asset of assets) {
    const okay=await validAsset(asset,root,filmManifest);
    if (args.mode==='sync' && (!okay || args.force)) {
      console.log('Download '+asset);
      await fetchAsset(args.origin,asset,root);
      downloaded++;
    }
    if (!await validAsset(asset,root,filmManifest)) missing.push(asset);
    if ((asset.endsWith('.mp4')||asset.endsWith('.jpg'))&&!expectedFilmHash(asset,filmManifest)) {
      missing.push('Missing film SHA256 for '+asset);
    }
  }
  for (const id of args.scenes) if (!filmManifest?.scenes?.[id] || !audioManifest?.scenes?.[id]) {
    missing.push('Invalid/missing scene in manifests: '+id);
  }
  if (missing.length) throw new Error('Missing or invalid assets:\n'+missing.map(p=>' - '+p).join('\n')+
    '\nRun npm run assets:sync or consult docs/local-media.md');
  console.log('PASS '+assets.length+'/'+assets.length+' required assets checked. Downloaded '+downloaded+'.');
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  runLocalMedia().catch(err=>{console.error('Media setup failed: '+err.message);process.exitCode=1;});
}
