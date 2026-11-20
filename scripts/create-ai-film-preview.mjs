#!/usr/bin/env node
/**
 * Generate a local, noindex, side-by-side QA screen for both destinations.
 * The AI versions must be rendered first. This is not an active product route.
 */
import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const comparisons=[];
for(const scene of ['bali','chiang-mai']){
  for(const variant of ['desktop','mobile']){
    const suffix=variant==='mobile'?'-mobile':'';
    const original=join(root,'public/assets/scenes/'+scene+'-travel'+suffix+'.mp4');
    const candidate=join(root,'public/assets/scenes/ai-pilot/'+scene+'-ai-travel'+suffix+'.mp4');
    const meta=join(root,'public/assets/scenes/ai-pilot/'+scene+'-ai-travel'+suffix+'.json');
    await access(original);
    await access(candidate);
    const info=JSON.parse(await readFile(meta,'utf8'));
    if(info.status!=='QA_CANDIDATE_NOT_PUBLISHED')throw new Error('Invalid QA status in '+meta);
    comparisons.push({scene,variant,original:'/assets/scenes/'+scene+'-travel'+suffix+'.mp4',
      candidate:'/assets/scenes/ai-pilot/'+scene+'-ai-travel'+suffix+'.mp4',
      sizeMb:(info.sizeBytes/1e6).toFixed(1),duration:info.durationSeconds});
  }
}
const json=JSON.stringify(comparisons).replace(/</g,'\\u003c');
const html=[
'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>Sound Lab — Unpublished AI film quality review</title>',
'<style>body{background:#102019;color:#e9eee8;font:14px/1.6 system-ui;margin:auto;padding:clamp(16px,5vw,72px);max-width:1500px}h1{font:400 clamp(36px,5vw,72px)/1.1 Georgia,serif}h2{font:400 32px Georgia,serif}p{max-width:900px;color:#c2d2c8}section{border-top:1px solid #496258;margin-top:40px;padding:30px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}video{width:100%;height:auto;max-height:580px;background:#263c33;object-fit:contain;border-radius:9px}label{display:block;margin:8px 0;color:#e6dbb9}.bar{display:flex;gap:12px;flex-wrap:wrap}button{background:#f5efe5;color:#183226;border:0;border-radius:30px;padding:13px 20px;cursor:pointer}@media(max-width:720px){.pair{grid-template-columns:1fr}}</style></head>',
'<body><header><small>UNPUBLISHED / SOUND LAB FILM QA</small><h1>Place-inspired moving footage.</h1><p>Left: current sourced video. Right: fictional AI-rendered candidate, NOT an actual filmed spa or café. Check architectural consistency, foliage, water, rain, image quality, movement, and loop seams before replacing anything in production.</p></header>',
'<div class="bar"><button id="play">Play muted videos</button><button id="pause">Pause</button><button id="restart">Restart</button></div><main id="content"></main>',
'<script>const rows='+json+';const mount=document.getElementById("content");for(const item of rows){const section=document.createElement("section");const title=document.createElement("h2");title.textContent=(item.scene==="bali"?"Ubud jungle spa":"Chiang Mai rainy café")+" / "+item.variant;section.append(title);const pair=document.createElement("div");pair.className="pair";for(const [label,src] of [["Current source video",item.original],["AI candidate (fictional)",item.candidate]]){const box=document.createElement("div");const cap=document.createElement("label");cap.textContent=label;const video=document.createElement("video");video.src=src;video.controls=true;video.muted=true;video.loop=true;video.playsInline=true;video.preload="metadata";box.append(cap,video);pair.append(box)}section.append(pair);const note=document.createElement("p");note.textContent="QA only: "+item.duration+"s, "+item.sizeMb+"MB; no production promotion.";section.append(note);mount.append(section)}const vids=()=>Array.from(document.querySelectorAll("video"));document.getElementById("play").onclick=()=>vids().forEach(v=>v.play().catch(()=>{}));document.getElementById("pause").onclick=()=>vids().forEach(v=>v.pause());document.getElementById("restart").onclick=()=>vids().forEach(v=>{v.pause();v.currentTime=0});</script></body></html>',
].join('\n');
await writeFile(join(root,'public/ai-film-pilot-preview.html'),html);
console.log('Open http://localhost:3000/ai-film-pilot-preview.html (while pnpm dev is running).');
console.log('QA only. AI files stay unpublished and active scene assets remain unchanged.');
