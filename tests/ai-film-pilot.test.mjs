import test from 'node:test';
import assert from 'node:assert/strict';
import { AI_FILM_PILOT, AI_FILM_MODEL, getAiFilmShot } from '../src/scenes/ai-film-pilot.mjs';
import { parseFilmArgs, aiFilmRequest, estimatedUsd } from '../scripts/generate-ai-film.mjs';

test('AI video pilot consists only of first-batch Bali and Chiang Mai',()=>{
  assert.deepEqual(AI_FILM_PILOT.map(s=>s.id),['bali','chiang-mai']);
  assert.equal(AI_FILM_MODEL,'gemini_omni_flash_1.2');
  for(const scene of AI_FILM_PILOT){
    assert.deepEqual(scene.shots.map(x=>x.id),['hero','detail']);
    assert.match(scene.locationBasis,/fictional environment|fictional café/i);
    assert.match(scene.editorialDisclosure.en,/AI-generated/i);
    assert.ok(scene.shots.every(s=>s.duration===10));
    for(const shot of scene.shots){
      const x=getAiFilmShot(scene.id,shot.id);
      assert.ok(x.promptText.length>100 && x.promptText.length<4000);
      assert.match(x.promptText,/No people close to camera/);
      assert.match(x.promptText,/no text/);
      assert.match(x.promptText,/continuous|Continuous/);
    }
  }
  assert.equal(getAiFilmShot('lisbon','hero'),null);
});

test('generator defaults to dry run and has an explicit per-shot cost ceiling',()=>{
  const args=parseFilmArgs(['--scene','chiang-mai','--shot','detail']);
  assert.equal(args.execute,false);
  assert.equal(args.scene,'chiang-mai');
  assert.equal(args.ratio,'1920:1080');
  const payload=aiFilmRequest(args);
  assert.deepEqual(Object.keys(payload),['model','promptText','ratio','duration']);
  assert.equal(payload.model,'gemini_omni_flash_1.2');
  assert.equal(payload.duration,10);
  assert.equal(estimatedUsd(args),1);
  const hi=parseFilmArgs(['--scene','bali','--shot','hero','--ratio','3840:2160','--execute','--max-usd','3']);
  assert.equal(hi.execute,true);
  assert.equal(hi.maxUsd,3);
  assert.equal(estimatedUsd(hi),2.1);
  assert.throws(()=>parseFilmArgs(['--scene','unknown']),/Choose a known/);
  assert.throws(()=>parseFilmArgs(['--ratio','small']),/Unsupported ratio/);
  assert.throws(()=>parseFilmArgs(['--max-usd','nonsense']),/positive/);
});

test('actual AI generator never calls provider on a dry run without credentials',async()=>{
  const {run} = await import('../scripts/generate-ai-film.mjs');
  const old=process.env.RUNWAYML_API_SECRET;
  try{
    delete process.env.RUNWAYML_API_SECRET;
    const logs=[];
    const original=console.log;
    console.log=(...args)=>logs.push(args.join(' '));
    try {
      await run(parseFilmArgs(['--scene','bali','--shot','hero']));
    } finally {
      console.log=original;
    }
    assert.ok(logs.join('\n').includes('DRY_RUN'));
  }finally{
    if(old!==undefined) process.env.RUNWAYML_API_SECRET=old;
  }
});
