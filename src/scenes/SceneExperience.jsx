import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { localizePath, setLocale, useLocale } from '../locale.mjs';
import { getLabController } from '../sound-lab.mjs';
import { SCENES, sceneById, sceneText } from './catalog.mjs';
import { levelsForScene, readScenePreferences, writeScenePreferences } from './preferences.mjs';
import { INTENTS, JOURNEYS, intentById, journeyById, journeyForScene, recommendedJourneyForIntent, levelsForJourney, controlsForJourney, sceneForJourney } from './journeys.mjs';
import { createStreamingJourneyPlayer } from './stream-player.mjs';

const iconPaths = {
  play: <path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
  pause: <><path d="M9 5v14M16 5v14" strokeWidth="3" /></>,
  sound: <><path d="M4 10v4h4l5 4V6l-5 4ZM17 8c3 2 3 6 0 8M20 5c5 4 5 10 0 14" /></>,
  tune: <><path d="M5 4v7m0 5v4M12 4v2m0 5v9M19 4v10m0 5v1"/><circle cx="5" cy="13.5" r="2.5"/><circle cx="12" cy="8.5" r="2.5"/><circle cx="19" cy="16.5" r="2.5"/></>,
  clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>,
  expand: <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  arrow: <path d="M4 12h15m-5-5 5 5-5 5" />,
  back: <path d="M20 12H5m5-5-5 5 5 5" />,
  leaf: <><path d="M19 3C6 3 3 8 5 14c2 6 12 7 14-11ZM5 20c1-7 5-10 10-13"/></>,
  cup: <><path d="M5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5Zm12 1h2a3 3 0 1 1 0 6h-2M7 22h11M9 3v2m5-3v3"/></>,
  music: <><path d="M10 17V5l10-2v12M10 8l10-2"/><ellipse cx="7" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/></>,
  spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/></>,
  wind: <><path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 17h7"/></>,
  bookmark: <path d="M7 3h10v18l-5-4-5 4Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.3"/></>,
  motion: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/></>,
};
function Icon({ name, ...props }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{iconPaths[name] || iconPaths.leaf}</svg>;
}
function Brand() {
  return <span className="sc-brand"><svg viewBox="0 0 38 42" aria-hidden="true"><path d="M8 8c1 12 7 18 12 18S31 19 31 8ZM20 26v10m-6 1h12M12 13h15M21 9c1-5 4-7 8-6-1 4-4 6-8 6Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><span>Sound Cocktail<small>AN EVERYDAY ESCAPE</small></span></span>;
}
const copy = {
  en: { places:'Places', studio:'Sound studio', saved:'Saved mixes', listen:'Enter & listen', pause:'Pause listening', resume:'Resume listening', loading:'Finding your rhythm…', sound:'Sound', timer:'Sleep timer', continuous:'No timer', immersive:'Immerse', leave:'Back to the room', motionOn:'Pause motion', motionOff:'Play motion', change:'Change place', foot:'A small escape. A little more you.', choose:'Where shall we go?', chooseSub:'Two little corners of the world. Stay as long as you like.', here:'You are here', go:'Stay here', soundTitle:'Make it yours.', soundSub:'A little more of what you need.', reset:'Reset', save:'Save this mix', savedToast:'Your mix is saved for this journey.', storageError:'Your browser could not save this mix. You can keep listening.', resetToast:'Back to the original balance.', timerTitle:'Drift away, on your time.', timerSub:'Music gently stops when the timer ends. Leave it off to keep listening.', minutes:'min', timerDone:'Your listening timer has ended.', ready:'Ready when you are', listening:'A LITTLE ROOM TO EXHALE', paused:'Take your time', videoFallback:'Still view · music is available', retry:'Try listening again', error:'The sound could not load. Check your connection and try again.', info:'About this place', close:'Close', volume:'Master volume', savedTitle:'Your familiar places.', savedSub:'Your saved sound balance, ready for your next visit.', noneSaved:'Make a place yours. Open Sound, adjust the layers, and save your mix.', loadSaved:'Return to this mix', savedBadge:'Your saved mix', sources:'Sound sources', inspired:'A place-inspired listening room', inspiredText:'These scenes evoke Bali and Chiang Mai. The licensed films are mood references, not verified recordings from those destinations. Music comes from our original V3.1 compositions; each control adjusts a real, separate audio layer.', musicCredit:'Music · Sound Cocktail V3.1', continuousNote:'Original three-minute compositions, gently joined for continuous listening.', videoCredit:'Film credits', full:'Full screen', exitFull:'Exit full screen' },
  zh: { places:'去往哪里', studio:'声音调制室', saved:'我的收藏', listen:'进入，慢慢听', pause:'暂停聆听', resume:'继续聆听', loading:'让声音慢慢到来…', sound:'调音', timer:'定时停止', continuous:'不限时', immersive:'沉浸', leave:'回到房间', motionOn:'暂停画面', motionOff:'播放画面', change:'换个地方', foot:'一场小小的逃离，找回自己的节奏。', choose:'这次，想去哪里？', chooseSub:'世界的两个小角落。想待多久，就待多久。', here:'你在这里', go:'在这里待一会儿', soundTitle:'调成你的样子。', soundSub:'多一点此刻需要的声音。', reset:'恢复默认', save:'保存这份配比', savedToast:'已保存这段声音旅程的配比。', storageError:'浏览器暂时无法保存，你仍可以继续聆听。', resetToast:'已恢复这个场景的原始配比。', timerTitle:'按自己的时间，慢慢来。', timerSub:'时间到了，音乐会轻柔停止。选择不限时即可持续聆听。', minutes:'分钟', timerDone:'本次定时聆听已结束。', ready:'准备好了，就开始吧', listening:'给自己一点呼吸的空间', paused:'慢慢来，时间还在', videoFallback:'静态画面 · 仍可聆听音乐', retry:'重新加载声音', error:'声音加载失败，请检查网络后重试。', info:'关于这个地方', close:'关闭', volume:'总音量', savedTitle:'回到熟悉的地方。', savedSub:'带着你保存的声音配比，开始下一次小旅行。', noneSaved:'打开调音，调整声音层，再保存一份属于你的配比。', loadSaved:'回到这份配比', savedBadge:'已保存配比', sources:'声音来源', inspired:'以目的地为灵感的聆听空间', inspiredText:'场景以巴厘岛与清迈为灵感。授权视频用于营造氛围，并非经核实的当地实拍。音乐来自我们的 V3.1 原创作品，每个调音控件都对应真实独立音轨。', musicCredit:'音乐 · Sound Cocktail V3.1', continuousNote:'原创三分钟音乐，经过循环衔接处理，可长时间连续聆听。', videoCredit:'视频来源', full:'全屏显示', exitFull:'退出全屏' },
};

const goalCopy = {
  en: { kicker:'SOUND COCKTAIL · YOUR NEXT ESCAPE', title:'How would you like to feel?', intro:'Start with a feeling. Find a place to stay for a while.', action:'Change intention', suggestion:'Recommended journey', minutes:'Suggested', hint:'Choose a state, then enter the music. No timer or paywall during this preview.' },
  zh: { kicker:'SOUND COCKTAIL · 由此出发', title:'此刻，想进入什么状态？', intro:'先选择你需要的状态，再去世界某个角落待一会儿。', action:'换一种状态', suggestion:'为此刻推荐的声音旅程', minutes:'建议', hint:'选择状态后就能开始音乐旅行。体验期不限时、不设付费墙。' },
};

const moodCopy = {
  en:{warmth:'Warmth',space:'Space',energy:'Musical activity',nature:'Nature & air',simple:'Feel the sound',advanced:'Advanced mixing',compare:'Compare original V3.1',newVersion:'Return to V3.2',focus:'Focus session',break:'Your work block is complete. Take a gentle break.',breathe:'Breathing guide',journey:'Switch journey',studio:'Open studio',chapter:'Now in the journey',noFilm:'Illustrated place concept · no local footage',save:'Save this journey'},
  zh:{warmth:'温暖感',space:'空间深度',energy:'音乐活跃度',nature:'自然环境',simple:'调节你想要的感受',advanced:'高级混音',compare:'对比原版 V3.1',newVersion:'返回 V3.2',focus:'专注时段',break:'这段专注结束了，可以休息一下。',breathe:'呼吸引导',journey:'切换旅程',studio:'进入调音室',chapter:'此刻的旅程',noFilm:'原创概念插画 · 非当地实拍',save:'保存这段旅程'},
};

function SceneVideo({ scene, motion, onUnavailable }) {
  const video = useRef(null);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 680px)');
    const update = () => setMobile(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const src = mobile && scene.mobileVideo ? scene.mobileVideo : scene.video;
  const poster = mobile && scene.mobilePoster ? scene.mobilePoster : scene.poster;
  useEffect(() => {
    onUnavailable(!src);
    if (!src || !video.current) return;
    if (motion) video.current.play().catch(() => onUnavailable(true));
    else video.current.pause();
  }, [motion, src]);
  return <div className="sc-landscape" data-motion={motion?'on':'off'} data-artwork={src?'film':'illustration'} style={{ '--scene-position':scene.position, '--scene-mobile-position':scene.mobilePosition, backgroundImage:`url(${poster})` }}>
    <img className="sc-poster" src={poster} alt="" loading="eager" fetchPriority="high" aria-hidden="true" />
    {src && <video ref={video} key={src} className={`sc-video ${motion ? 'is-moving' : 'is-paused'}`} src={src} poster={poster} muted loop playsInline autoPlay={motion} preload="metadata" aria-hidden="true" onError={() => onUnavailable(true)} onPlaying={() => onUnavailable(false)} />}
    <div className="sc-shade" />
  </div>;
}

export default function SceneExperience() {
  const [locale] = useLocale();
  const C = copy[locale] || copy.en;
  const G = goalCopy[locale] || goalCopy.en;
  const M = moodCopy[locale] || moodCopy.en;
  const T = value => sceneText(value, locale);
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(() => readScenePreferences(null));
  const [intentId, setIntentId] = useState(null);
  const [sceneId, setSceneId] = useState('bali');
  const [journeyId, setJourneyId] = useState(null);
  const [audioVersion, setAudioVersion] = useState('3.2');
  const journey = journeyById(journeyId);
  const intent = intentById(intentId);
  const scene = journey ? sceneForJourney(journey, audioVersion) : sceneById(sceneId);
  const [levels, setLevels] = useState(() => levelsForScene(SCENES[0]));
  const [controls, setControls] = useState({warmth:.55,space:.35,energy:.40,nature:.35});
  const [advanced, setAdvanced] = useState(false);
  const [breath, setBreath] = useState(false);
  const [focusSession, setFocusSession] = useState(null);
  const [audio, setAudio] = useState({status:'idle', sceneId:'bali', error:null});
  const [entered, setEntered] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [motion, setMotion] = useState(false);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState('');
  const [deadline, setDeadline] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [full, setFull] = useState(false);
  const player = useRef(null);
  const preferences = useRef(prefs);
  const dialog = useRef(null);
  const opener = useRef(null);
  const root = useRef(null);
  const current = useRef({ scene, levels });
  current.current = {scene,levels};
  const playing = audio.status === 'playing';
  const loading = audio.status === 'loading';

  function persist(next) {
    preferences.current = next; setPrefs(next);
    try { return writeScenePreferences(window.localStorage,next); } catch { return false; }
  }
  useEffect(() => {
    let saved;
    try { saved = readScenePreferences(window.localStorage); } catch { saved = readScenePreferences(null); }
    preferences.current = saved; setPrefs(saved); setSceneId(SCENES[0].id);
    const initial = SCENES[0];
    const initialLevels = levelsForScene(initial,saved.mixes[initial.id]);
    setLevels(initialLevels);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotion(saved.motion && !reduced.matches);
    const onReduced = () => { if (reduced.matches) setMotion(false); };
    reduced.addEventListener('change',onReduced);
    const engine = createStreamingJourneyPlayer({ onState:setAudio, claimAudio:() => getLabController()?.pauseForScene?.() });
    player.current = engine;
    engine.setMaster(saved.master);
    engine.setScene(initial,initialLevels,{play:false});
    const pauseForStudio = () => engine.pause();
    const onFull = () => setFull(document.fullscreenElement === root.current);
    window.addEventListener('soundcocktail:legacy-play',pauseForStudio);
    document.addEventListener('fullscreenchange',onFull);
    return () => {
      reduced.removeEventListener('change',onReduced);
      window.removeEventListener('soundcocktail:legacy-play',pauseForStudio);
      document.removeEventListener('fullscreenchange',onFull);
      engine.dispose(); player.current = null;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''),3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    if (panel && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!panel && dialog.current?.open) dialog.current.close();
  }, [panel]);
  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape' && !panel) setImmersive(false);
    };
    document.addEventListener('keydown',onKey);
    return () => document.removeEventListener('keydown',onKey);
  }, [panel]);
  useEffect(() => {
    if (!deadline) { setRemaining(0); return; }
    const tick = () => {
      const left = Math.max(0,deadline-Date.now()); setRemaining(left);
      if (left === 0) { player.current?.pause(); player.current?.setSleepTimer(null); setDeadline(null); setToast(C.timerDone); }
    };
    tick();
    const interval = window.setInterval(tick,1000);
    document.addEventListener('visibilitychange',tick);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange',tick); };
  }, [deadline, C.timerDone]);

  function openPanel(name) { opener.current = document.activeElement; setPanel(name); }
  function closePanel() { setPanel(null); dialog.current?.close(); opener.current?.focus?.(); }
  function selectJourney(next) {
    if (!next) return;
    const place = sceneForJourney(next);
    const saved = preferences.current.mixes[next.id];
    const nextLevels = levelsForJourney(next, saved);
    const nextControls = controlsForJourney(next, saved);
    setJourneyId(next.id);
    setAudioVersion('3.2');
    setIntentId(next.intentId);
    setSceneId(place.id);
    setLevels(nextLevels);
    setControls(nextControls);
    setBreath(false);
    persist({ ...preferences.current, sceneId: place.id });
    player.current?.setMixControls(nextControls);
    void player.current?.setScene(place, nextLevels, { play: playing || loading });
    closePanel();
  }
  function chooseIntent(id) { selectJourney(recommendedJourneyForIntent(id)); }
  function choosePlace(place) { selectJourney(journeyForScene(place.id, intentId)); }
  function changeIntent() {
    player.current?.pause();
    setIntentId(null);
    setImmersive(false);
  }
  function toggleListening() {
    if (playing || loading) { player.current?.pause(); return; }
    getLabController()?.pauseForScene?.();
    setEntered(true);
    void player.current?.play();
  }
  function enter() { if (!playing && !loading) toggleListening(); setImmersive(true); }
  function changeLevel(id, value) {
    const next = Number(value); setLevels(previous => ({...previous,[id]:next})); player.current?.setLevel(id,next);
  }
  function changeMaster(value) { const master=Number(value); player.current?.setMaster(master); persist({...preferences.current,master}); }
  function saveMix() {
    if (!journey) return;
    const saved = persist({ ...preferences.current, mixes: { ...preferences.current.mixes, [journey.id]: { ...levels, ...controls } } });
    setToast(saved ? C.savedToast : C.storageError);
  }
  function resetMix() {
    const reset = journey ? levelsForJourney(journey) : levelsForScene(scene);
    const nextControls = controlsForJourney(journey);
    setLevels(reset); setControls(nextControls);
    Object.entries(reset).forEach(([id, value]) => player.current?.setLevel(id, value));
    player.current?.setMixControls(nextControls);
    setToast(C.resetToast);
  }
  function changeControl(key, input) {
    const value = Number(input);
    setControls(previous => ({ ...previous, [key]: value }));
    player.current?.setMixControls({ [key]: value });
  }
  function switchVersion() {
    if (!journey || !scene.legacyLayers?.length) return;
    const nextVersion = audioVersion === '3.2' ? '3.1' : '3.2';
    const place = sceneForJourney(journey, nextVersion);
    const nextLevels = Object.fromEntries(place.layers.map(layer => [layer.id, levels[layer.id] ?? layer.defaultLevel]));
    setAudioVersion(nextVersion); setLevels(nextLevels);
    void player.current?.setScene(place, nextLevels, { play: playing || loading });
  }
  function startFocus(minutes) {
    const elapsed = player.current?.getElapsedSeconds() ?? 0;
    setFocusSession(minutes ? { minutes, until: elapsed + minutes * 60 } : null);
    closePanel();
  }
  const focusSecondsRemaining = focusSession ? Math.max(0, Math.ceil(focusSession.until - (audio.elapsedSeconds || 0))) : 0;
  function toggleMotion() {
    const next=!motion; setMotion(next); persist({...preferences.current,motion:next});
  }
  function chooseTimer(minutes) {
    setDeadline(player.current?.setSleepTimer(minutes ? minutes*60000 : null) ?? null);
    closePanel();
  }
  async function toggleFullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.current?.requestFullscreen(); }
    catch { setImmersive(true); }
  }
  function changeLanguage(event) {
    const next=event.target.value; setLocale(next); void navigate({to:localizePath('/',next),resetScroll:false});
  }
  const timerLabel = deadline ? `${Math.ceil(remaining/60000)} ${C.minutes}` : C.continuous;
  const focusLabel = focusSession ? `${Math.floor(focusSecondsRemaining/60)}:${String(focusSecondsRemaining%60).padStart(2,'0')}` : null;
  const dialogTitle = panel==='mix' ? C.soundTitle : panel==='timer' ? C.timerTitle : panel==='saved' ? C.savedTitle : panel==='info' ? C.info : C.choose;
  useEffect(() => {
    if (focusSession && focusSecondsRemaining <= 0) {
      setFocusSession(null);
      setToast(M.break);
    }
  }, [focusSession, focusSecondsRemaining, M.break]);

  return <section ref={root} className={`scene-experience ${immersive?'sc-immersive':''} ${entered?'sc-entered':''}`} data-scene={sceneId} data-intent={intentId||'choose'} data-chapter={audio.chapter??0} data-audio-state={audio.status}>
    <SceneVideo scene={scene} motion={motion} onUnavailable={setVideoUnavailable}/>
    {intentId && playing && <div className="sc-chapter-hint" aria-live="off">{M.chapter} · {scene.chapters?.[audio.chapter || 0] || ''}</div>}
    {intentId === 'meditate' && breath && playing && <div className="sc-breath-guide" role="status"><div className="sc-breath-circle"/><span>{locale==='zh'?'缓缓吸气 · 缓缓呼气':'Breathe in · breathe out'}</span><button onClick={()=>setBreath(false)} aria-label={locale==='zh'?'关闭呼吸引导':'Close breathing guide'}>×</button></div>}
    <header className="sc-header">
      <a href={localizePath('/',locale)} className="sc-brand-link" aria-label="Sound Cocktail"><Brand/></a>
      <nav className="sc-nav" aria-label={locale==='zh'?'场景导航':'Scene navigation'}>
        <button className="sc-nav-active" onClick={()=>openPanel('places')}>{C.places}</button>
        <button onClick={()=>{setAdvanced(true);openPanel('mix')}}>{M.studio}</button>
        <button onClick={()=>openPanel('saved')}>{C.saved}</button>
      </nav>
      <div className="sc-header-end"><span className="sc-tiny-flower">✳</span><select value={locale} onChange={changeLanguage} aria-label={locale==='zh'?'语言':'Language'}><option value="en">EN</option><option value="zh">中</option></select></div>
    </header>

    {intentId && <div className="sc-scene-top"><span className="sc-live-dot"/><span>{T(scene.name)} · {T(scene.location)}</span></div>}
    {!intentId && <div className="sc-intent-entry">
      <span className="sc-kicker">{G.kicker}</span>
      <h1>{G.title}</h1>
      <p>{G.intro}</p>
      <div className="sc-intent-options" role="group" aria-label={G.title}>
        {INTENTS.map(option=><button key={option.id} type="button" onClick={()=>chooseIntent(option.id)}>
          <span>{T(option.name)}</span><small>{T(option.prompt)}</small><Icon name="arrow"/>
        </button>)}
      </div>
      <small className="sc-intent-hint">{G.hint}</small>
    </div>}
    {intentId && <div className="sc-copy" key={journey?.id||sceneId}>
      <div className="sc-journey-context">
        <button type="button" className="sc-change-goal" onClick={changeIntent} aria-label={G.action}>{T(intent?.name)} · {G.action}</button>
        <span>{G.suggestion} · {T(journey?.name)} · {journey?.suggestedMinutes ? `${G.minutes} ${journey.suggestedMinutes} ${C.minutes}` : C.continuous}</span>
      </div>
      <span className="sc-eyebrow"><span>{scene.number}</span> {T(scene.tag)}</span>
      <h1>{T(scene.title)}</h1>
      <p>{T(journey?.description)}</p>
      <button className="sc-enter" onClick={enter} disabled={loading}><span className="sc-enter-icon"><Icon name={playing?'expand':'play'}/></span>{loading?C.loading:playing?C.immersive:C.listen}<Icon name="arrow"/></button>
      <span className="sc-hand-note"><Icon name="leaf"/>{T(scene.note)}</span>
    </div>}

    {intentId && <div className="sc-place-preview">
      <span className="sc-kicker">{C.change}</span>
      <div className="sc-place-chips">{SCENES.slice(0,3).map(place=>{const next=journeyForScene(place.id,intentId);return <button key={place.id} className={`sc-place-chip ${sceneId===place.id?'is-current':''}`} onClick={()=>choosePlace(place)} aria-pressed={sceneId===place.id} aria-label={`${T(place.name)} · ${T(intentById(next?.intentId)?.name)}`}><img src={place.poster} alt=""/><span><small>{T(intentById(next?.intentId)?.name)}</small>{T(place.name)}</span>{place.id===sceneId?<span className="sc-chip-dot"/>:<Icon name="arrow"/>}</button>;})}</div>
    </div>}

    {immersive && <button className="sc-leave sc-glass-button" onClick={()=>setImmersive(false)}><Icon name="back"/>{C.leave}</button>}
    {intentId && <div className="sc-bottom">
      <div className="sc-player" aria-label={locale==='zh'?'场景播放器':'Scene player'}>
        <button className={`sc-play ${loading?'is-loading':''}`} aria-label={loading?C.pause:playing?C.pause:C.resume} onClick={toggleListening}><Icon name={playing||loading?'pause':'play'}/></button>
        <div className="sc-now"><strong>{T(scene.trackTitle)}</strong><span>{loading?C.loading:playing?C.listening:entered?C.paused:C.ready}</span></div>
        <div className="sc-master"><Icon name="sound"/><input type="range" min="0" max="1" step=".01" aria-label={C.volume} value={prefs.master} onChange={event=>changeMaster(event.target.value)} style={{'--range-value':`${prefs.master*100}%`}}/></div>
        <div className="sc-player-actions">
          <button onClick={()=>openPanel('places')} aria-label={M.journey} title={M.journey} aria-haspopup="dialog"><Icon name="leaf"/></button>
          <button onClick={()=>openPanel('mix')} aria-label={C.sound} aria-haspopup="dialog"><Icon name="tune"/><span>{C.sound}</span></button>
          <button className={deadline?'sc-timer-active':''} onClick={()=>openPanel('timer')} aria-label={`${C.timer}: ${timerLabel}`} aria-haspopup="dialog"><Icon name="clock"/><span>{timerLabel}</span></button>
          <button onClick={()=>setImmersive(value=>!value)} aria-label={immersive?C.leave:C.immersive} aria-pressed={immersive}><Icon name="expand"/></button>
        </div>
      </div>
      <div className="sc-bottom-line"><span>{focusLabel ? `${M.focus} · ${focusLabel}` : C.foot}</span><div>{intentId==='meditate' && <button onClick={()=>setBreath(v=>!v)} aria-pressed={breath}><Icon name="wind"/>{M.breathe}</button>}{intentId==='focus' && <button onClick={()=>openPanel('timer')}><Icon name="clock"/>{focusLabel || M.focus}</button>}<button onClick={toggleMotion} aria-pressed={!motion}><Icon name={motion?'pause':'motion'}/><span>{motion?C.motionOn:C.motionOff}</span></button><button onClick={()=>openPanel('info')} aria-label={C.info}><Icon name="info"/></button><button className="sc-fullscreen" onClick={toggleFullscreen} aria-label={full?C.exitFull:C.full}><Icon name="expand"/></button></div></div>
    </div>}
    {videoUnavailable && <span className="sc-video-status">{scene.video ? C.videoFallback : M.noFilm}</span>}
    {audio.status==='error' && <div className="sc-error" role="alert"><span>{C.error}</span><button onClick={()=>void player.current?.play()}>{C.retry}<Icon name="arrow"/></button></div>}
    <div className="sc-toast" role="status" aria-live="polite">{toast}</div>

    <dialog ref={dialog} className={`sc-dialog sc-dialog--${panel||'closed'}`} aria-labelledby="sc-dialog-title" onCancel={event=>{event.preventDefault();closePanel();}} onClick={event=>{if(event.target===dialog.current)closePanel();}}>
      <div className="sc-dialog-inner">
        <div className="sc-dialog-head"><span className="sc-kicker">SOUND COCKTAIL · {T(scene.name)}</span><button className="sc-icon-button" aria-label={C.close} onClick={closePanel}><Icon name="close"/></button></div>
        <h2 id="sc-dialog-title">{dialogTitle}</h2>
        {panel==='mix' && <>
          <p className="sc-panel-sub">{C.soundSub}</p>
          <h3 className="sc-mixer-section">{M.simple}</h3>
          <div className="sc-emotion-controls">{['warmth','space','energy','nature'].map(key=><div className="sc-emotion-control" key={key}>
            <label htmlFor={`sc-mix-${key}`}><span>{M[key]}</span><output>{Math.round((controls[key] ?? .5)*100)}%</output></label>
            <input id={`sc-mix-${key}`} type="range" min="0" max="1" step=".01" value={controls[key] ?? .5} onChange={event=>changeControl(key,event.target.value)} style={{'--range-value':`${(controls[key]??.5)*100}%`}}/>
          </div>)}</div>
          <button className="sc-advanced-toggle" onClick={()=>setAdvanced(v=>!v)} aria-expanded={advanced}>{M.advanced} <Icon name="tune"/></button>
          {advanced && <div className="sc-advanced-mixer">
            <div className="sc-layers">{scene.layers.map(layer=><div className="sc-layer" key={layer.id}>
              <div className="sc-layer-title"><span><Icon name={layer.icon}/>{T(layer.label)}</span><output>{Math.round((levels[layer.id] ?? layer.defaultLevel)*100)}<small>%</small></output></div>
              <input type="range" min="0" max="1" step=".01" value={levels[layer.id] ?? layer.defaultLevel} aria-label={T(layer.label)} onChange={event=>changeLevel(layer.id,event.target.value)} style={{'--range-value':`${(levels[layer.id]??layer.defaultLevel)*100}%`}}/><small>{T(layer.detail)}</small>
            </div>)}</div>
            {scene.legacyLayers?.length>0 && <button className="sc-version-button" onClick={switchVersion}>{audioVersion==='3.2'?M.compare:M.newVersion} · {audioVersion}</button>}
            <div className="sc-mixer-provenance">{locale==='zh'?'长时音景为程序合成实验；音符密度控制通过细节声部分段门控实现。':'Long-form music is a procedural prototype. Musical activity gates intervals of the detail stem.'}</div>
          </div>}
          <div className="sc-sheet-master"><label htmlFor="sc-sheet-volume"><Icon name="sound"/>{C.volume}<output>{Math.round(prefs.master*100)}%</output></label><input id="sc-sheet-volume" type="range" min="0" max="1" step=".01" value={prefs.master} onChange={event=>changeMaster(event.target.value)} style={{'--range-value':`${prefs.master*100}%`}}/></div>
          <div className="sc-sheet-status" role="status">{toast}</div><div className="sc-panel-buttons"><button onClick={resetMix}>{C.reset}</button><button className="sc-primary" onClick={saveMix}><Icon name="bookmark"/>{M.save}</button></div>
        </>}
        {(panel==='places'||panel==='saved') && <><p className="sc-panel-sub">{panel==='saved'?C.savedSub:C.chooseSub}</p><div className="sc-gallery">{JOURNEYS.filter(next=>panel!=='saved'||prefs.mixes[next.id]).map(next=>{const place=sceneById(next.sceneId);return <button className={`sc-gallery-card ${journey?.id===next.id?'is-current':''}`} onClick={()=>selectJourney(next)} key={next.id}><img src={place.poster} alt=""/><span className="sc-gallery-number">{place.number}</span><div><small>{T(intentById(next.intentId)?.name)} · {T(place.location)}</small><h3>{T(next.name)}</h3><span>{panel==='saved'?C.loadSaved:journey?.id===next.id?C.here:C.go}<Icon name={journey?.id===next.id?'check':'arrow'}/></span></div></button>;})}</div>{panel==='saved'&&!JOURNEYS.some(next=>prefs.mixes[next.id])&&<p className="sc-empty">{C.noneSaved}</p>}<div className="sc-gallery-links"><button onClick={()=>{setAdvanced(true);setPanel('mix')}}>{M.studio}<Icon name="arrow"/></button><button onClick={()=>setPanel(panel==='saved'?'places':'saved')}>{panel==='saved'?C.places:C.saved}<Icon name="bookmark"/></button></div></>}
        {panel==='timer' && <>
          <p className="sc-panel-sub">{C.timerSub}</p>
          {intentId==='focus' && <div className="sc-focus-options"><h3>{M.focus}</h3><p className="sc-panel-sub">{locale==='zh'?'专注计时仅作提醒，音乐不会被打断。暂停播放也会暂停计时。':'A gentle focus reminder; music never cuts off. Pausing sound pauses the clock.'}</p>
            <div className="sc-timer-options">{[0,25,45,60].map(minutes=><button key={minutes} onClick={()=>startFocus(minutes)}>{minutes?`${minutes} ${C.minutes}`:C.continuous}<Icon name={minutes?'clock':'wind'}/></button>)}</div>
          </div>}
          <h3>{C.timer}</h3><div className="sc-timer-options">{[0,20,30,45,60,90].map(minutes=><button key={minutes} onClick={()=>chooseTimer(minutes)} className={!deadline&&minutes===0?'is-selected':''}>{minutes?`${minutes} ${C.minutes}`:C.continuous}<Icon name={minutes?'clock':'wind'}/></button>)}</div>
        </>}
        {panel==='info' && <div className="sc-credits"><span className="sc-credit-tag">{C.inspired}</span><p>{C.inspiredText}</p><h3>{C.musicCredit}</h3><p>{C.continuousNote}</p><h3>{C.videoCredit}</h3><p><a href="https://www.pexels.com/video/view-of-the-flowing-water-in-the-forest-8310457/" target="_blank" rel="noreferrer">Forest stream · I Am Sorin / Pexels</a></p><p><a href="https://www.pexels.com/video/charming-cafe-with-lush-garden-view-40913579/" target="_blank" rel="noreferrer">Garden café · LayG Traveller / Pexels</a><br/>{locale==='zh'?'清迈灵感声景 · 影像摄于阳朔':'Chiang Mai-inspired soundscape · filmed in Yangshuo'}</p><p><a href="/assets/scenes/credits.json" target="_blank" rel="noreferrer">{locale==='zh'?'完整视频来源与授权记录':'Complete film sources & license record'}</a></p><Link to={localizePath('/sources',locale)} onClick={closePanel}>{C.sources}<Icon name="arrow"/></Link></div>}
      </div>
    </dialog>
  </section>;
}
