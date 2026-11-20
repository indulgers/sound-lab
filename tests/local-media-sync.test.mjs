import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  SCENE_IDS, assetsForScene, parseMediaArgs, expectedFilmHash, runLocalMedia,
} from '../scripts/sync-local-media.mjs';

test('media inventory includes four authentic film derivatives and three stems per scene', () => {
  assert.equal(SCENE_IDS.length,6);
  for (const scene of SCENE_IDS) {
    const assets=assetsForScene(scene);
    assert.equal(assets.length,7);
    assert.ok(assets.some(x => x.endsWith('-travel.mp4')));
    assert.ok(assets.some(x => x.endsWith('-travel-mobile.mp4')));
    assert.ok(assets.some(x => x.endsWith('-travel.jpg')));
    assert.ok(assets.some(x => x.endsWith('-travel-mobile.jpg')));
    assert.ok(assets.some(x => x.endsWith('-harmony.mp3')));
    assert.ok(assets.some(x => x.endsWith('-details.mp3')));
    assert.ok(assets.some(x => x.endsWith('-atmosphere.mp3')));
  }
  assert.throws(()=>assetsForScene('unrelated-city'),/Unknown scene/);
});

test('asset sync options are restrictive and keep HTTPS unless localhost', () => {
  assert.deepEqual(parseMediaArgs(['--scene','bali','--check']).scenes,['bali']);
  assert.equal(parseMediaArgs(['--scene=chiang-mai']).scenes[0],'chiang-mai');
  assert.equal(parseMediaArgs(['--origin=http://localhost:9000']).origin,'http://localhost:9000');
  assert.throws(()=>parseMediaArgs(['--origin','http://example.org']),/HTTPS/);
  assert.throws(()=>parseMediaArgs(['--scene','bogus']),/Unknown scene/);
});

test('local sync downloads assets from a mock origin and rejects tampered media', async () => {
  const root=await mkdtemp(join(tmpdir(),'sound-lab-media-'));
  const filmManifest={scenes:Object.fromEntries(SCENE_IDS.map(id=>[id,{files:{}}]))};
  const audioManifest={scenes:Object.fromEntries(SCENE_IDS.map(id=>[id,{durationSeconds:900}]))};
  const assets=assetsForScene('chiang-mai');
  const files=new Map();
  for (const path of assets) {
    const isAudio=path.endsWith('.mp3'),isVideo=path.endsWith('.mp4');
    const buf=Buffer.alloc(isAudio?305_000:isVideo?155_000:5_000,0x53);
    if (isAudio) buf.write('ID3',0,'ascii');
    else if (isVideo) buf.write('ftyp',4,'ascii');
    else {buf[0]=0xff;buf[1]=0xd8;buf[2]=0xff;}
    const key=path.slice('public'.length);
    files.set(key,buf);
    if (!isAudio) filmManifest.scenes['chiang-mai'].files[path.split('/').at(-1)] = {
      sha256:createHash('sha256').update(buf).digest('hex'),
    };
  }
  files.set('/assets/scenes/real-travel-films.json',Buffer.from(JSON.stringify(filmManifest)));
  files.set('/assets/audio/journeys/manifest.json',Buffer.from(JSON.stringify(audioManifest)));
  const server=createServer((req,res)=>{
    const data=files.get(req.url || '');
    if (!data) {res.statusCode=404;res.end('missing');return;}
    res.setHeader('content-type',req.url.endsWith('.json')?'application/json':'application/octet-stream');
    res.end(data);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  try {
    await runLocalMedia(['--scene','chiang-mai','--origin',origin],root);
    await runLocalMedia(['--scene','chiang-mai','--check','--origin',origin],root);
    const path=join(root,'public/assets/scenes/chiang-mai-travel.jpg');
    const downloaded=await readFile(path);
    assert.equal(expectedFilmHash('public/assets/scenes/chiang-mai-travel.jpg',filmManifest),
      createHash('sha256').update(downloaded).digest('hex'));
    downloaded[24] ^= 1;
    await writeFile(path,downloaded);
    await assert.rejects(
      runLocalMedia(['--scene','chiang-mai','--check','--origin',origin],root),
      /Media is incomplete|Missing or invalid assets/
    );
    await runLocalMedia(['--scene','chiang-mai','--origin',origin],root);
    await runLocalMedia(['--scene','chiang-mai','--check','--origin',origin],root);
  } finally {
    await new Promise(resolve=>server.close(resolve));
    await rm(root,{recursive:true,force:true});
  }
});
