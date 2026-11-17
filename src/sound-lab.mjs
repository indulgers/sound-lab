import { AUDIO_LICENSES, SOUND_AUDIO } from './audio/catalog.mjs'
import { prepareRecording, playInstrumentNote } from './audio/playback.mjs'
import { SOUNDS, autoRecipeName, formatRecipeDate, mixSummaryText, recipeDisplay, soundDisplayName } from './catalog.mjs'
import { createSession, freeMix, isFreeSound } from './listening-session.mjs'
import { SLEEP_TIMER_FADE_SECONDS, applyFadeSchedule, fadeSchedule, sleepRemainingMs } from './sleep-timer.mjs'
import { getLocale, t } from './locale.mjs'
import { PACKS } from './packs.mjs'
import { createRuntimeScope } from './runtime-scope.mjs'

/* 单例控制器：mountSoundLab 只由根路由外壳调一次（音频引擎常驻，
   路由切换不重启）；各页面组件用 getLabController() 拿到它，再调
   bindMine/bindSources 把自己那块 DOM 接到已挂载
   的引擎上。服务端渲染时 mountSoundLab 从不执行，这里恒为 null，
   页面组件须自行守卫（typeof window / 空值检查）。 */
let labController = null;
export function getLabController() {
  return labController;
}

export function mountSoundLab() {
  const scope=createRuntimeScope();
  const {setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame,cancelAnimationFrame,listen}=scope;
  let disposed=false;
  /* ============================== data ============================== */
  var ICONS = {
    rain:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 15a5 5 0 1 1 .9-9.9A6 6 0 0 1 19.5 7 4.2 4.2 0 0 1 18 15.2"/><path d="M8 18l-1 2.2M12.5 18l-1 2.2M17 18l-1 2.2"/></svg>',
    fire:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5c.8 3.2-3.4 5-3.4 8.6a3.6 3.6 0 0 0 7.2 0c0-1.5-.7-2.4-1.4-3.6 2 1.1 3.6 3 3.6 5.5A6 6 0 0 1 6 14.6C6 9.6 10.6 7.4 12 3.5z"/></svg>',
    piano:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M8 4.5v8M12 4.5v8M16 4.5v8M8 19.5v-7M16 19.5v-7"/></svg>',
    waves:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2.5 9c2.8-2.6 5.2-2.6 8 0s5.2 2.6 8 0 2.4-2.2 2.5-2.1"/><path d="M2.5 15c2.8-2.6 5.2-2.6 8 0s5.2 2.6 8 0 2.4-2.2 2.5-2.1"/></svg>',
    birds:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15c4.5.6 7-1 8.6-4.4L16 5l1.2 3.4L21 9.5l-3.4 1.6c.3 4.4-2.8 8-7.4 8.4L8.5 21l-.7-2.6C5.6 17.9 4.4 16.6 4 15z"/><circle cx="15" cy="9.5" r=".4" fill="currentColor"/></svg>',
    wind:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 8.5h9.5a2.8 2.8 0 1 0-2.7-3.6M2.5 12.5h13.5a2.8 2.8 0 1 1-2.7 3.6M3 16.5h6"/></svg>',
    train:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="3.5" width="14" height="13" rx="3"/><path d="M5 11h14M9.5 20l1.8-3.5M14.5 20l-1.8-3.5"/><circle cx="9" cy="13.8" r=".5" fill="currentColor"/><circle cx="15" cy="13.8" r=".5" fill="currentColor"/></svg>',
    cafe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4.5 10h12v5.5a4.5 4.5 0 0 1-4.5 4.5H9A4.5 4.5 0 0 1 4.5 15.5z"/><path d="M16.5 11h1.2a2.9 2.9 0 0 1 0 5.8h-1.4M8 3.8c0 1.2-1 1.4-1 2.5M12 3.8c0 1.2-1 1.4-1 2.5"/></svg>',
    thunder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14a5 5 0 1 1 .9-9.9A6 6 0 0 1 19.5 6 4.2 4.2 0 0 1 18.5 14"/><path d="M12.5 13.5L10 18h3l-2 3.5"/></svg>',
    stream:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4c3 3.5 1.5 5.5 3.5 8S6 17 8.5 20"/><path d="M12 3.5c3 3.5 1.5 5.5 3.5 8s-1.5 5 0 9"/><path d="M19 5c2 3 .8 4.8 2.4 7"/></svg>',
    insects:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><ellipse cx="12" cy="14" rx="3.4" ry="4.6"/><path d="M12 9.4V7M9 7.5L6.5 5M15 7.5L17.5 5M8.8 13L4.5 11.5M8.8 16.5L4.8 17.5M15.2 13l4.3-1.5M15.2 16.5l4 1"/></svg>',
    traffic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15.5l1.6-5A2.5 2.5 0 0 1 8 8.7h8a2.5 2.5 0 0 1 2.4 1.8l1.6 5"/><rect x="3" y="15.5" width="18" height="3.6" rx="1.4"/><circle cx="7.5" cy="19.4" r="1.6"/><circle cx="16.5" cy="19.4" r="1.6"/></svg>',
    rural:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/><path d="M17.5 4.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z"/></svg>',
    market:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5l1.4-5h13.2l1.4 5a3 3 0 0 1-5.6 1.5 3.2 3.2 0 0 1-4.8 0A3 3 0 0 1 4 10.5z"/><path d="M5.5 13.5V20h13v-6.5M9.5 20v-4h5v4"/></svg>',
    rainstreet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3.5a7.5 7.5 0 0 1 7.5 7.5H4.5A7.5 7.5 0 0 1 12 3.5z"/><path d="M12 11v6.5"/><path d="M7.5 15l-.8 2.4M16.5 15l-.8 2.4M4 20.5h16"/></svg>',
    guitar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.5" cy="15" r="5.2"/><circle cx="9.5" cy="15" r="1.9"/><path d="M13 11.5L19.5 5M17 4.5h2.5V7"/></svg>',
    chimes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 5.5h16M8 5.5V14M12 5.5v10.5M16 5.5V13"/><rect x="6.6" y="14" width="2.8" height="5" rx="1.4"/><rect x="10.6" y="16" width="2.8" height="5" rx="1.4"/><rect x="14.6" y="13" width="2.8" height="5" rx="1.4"/></svg>',
    muyu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13.5a7 5.8 0 0 0 14 0z"/><path d="M8.5 12.6c2.2 1.3 4.8 1.3 7 0M15.5 4L19 10"/></svg>',
    forest:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4 3 12h3l-3 5h10l-3-5h3L8 4zm0 13v3m8-14-3 5h3l-3 5h8l-2-4h2l-5-6zm1 10v4"/></svg>',
    boat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h16l-2 4H7l-3-4zm8 0V4l6 7h-6M3 21q2-2 4 0 2-2 5 0 2-2 5 0 2-2 4 0"/></svg>',
    keyboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h1m3 0h1m3 0h1m-9 3h1m3 0h1m3 0h1m-7 2.5h6"/></svg>',
    harp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 3.5v17M6 3.5c5 0 11 2.4 12.5 8 .9 3.4-.6 6.7-3.5 9H6"/><path d="M9.5 4.2v15M13 5.4v13.4M16 7.6v9.6"/></svg>',
  };

  /* cat: nature 自然 / city 城市·乡村 / inst 乐器。p 为出厂参数（密度 density / 明亮度 bright / 远近 dist / 随机度 rand / 节奏 tempo） */
  var MASTER_CAP = 0.85;

  /* ============================== state ============================== */
  var levels = {}; SOUNDS.forEach(function(s){ levels[s.id]=0; });
  /* 当前播放的配方名（now-playing 条显示用；随 engine-state 事件发出）。 */
  var currentLabel="";
  /* per-sound synth params: density / bright / dist / rand / tempo
     （出厂参数，配方保存/导入时随配比一起存） */
  var PARAM_DEFS = [
    { k:"density" }, { k:"bright" }, { k:"dist" },
    { k:"rand" }, { k:"tempo" }
  ];
  var PARAM_DEFAULT = { density:.55, bright:.5, dist:.35, rand:.5, tempo:.5 };
  var params = {};
  SOUNDS.forEach(function(s){
    var p={}; PARAM_DEFS.forEach(function(d){ p[d.k]=PARAM_DEFAULT[d.k]; });
    if(s.p) PARAM_DEFS.forEach(function(d){ if(typeof s.p[d.k]==="number") p[d.k]=s.p[d.k]; });
    params[s.id]=p;
  });
  var RECIPE_STORAGE="sound-lab.recipes";
  var myRecipes=loadSavedRecipes();
  function loadSavedRecipes(){
    try{
      var saved=JSON.parse(localStorage.getItem(RECIPE_STORAGE)||"[]");
      if(!Array.isArray(saved)) return [];
      return saved.filter(function(r){ return r && typeof r.name==="string" && r.mix && r.at; })
        .map(function(r){ r.at=new Date(r.at); return r; });
    }catch(error){ return []; }
  }
  function persistRecipes(){
    try{
      localStorage.setItem(RECIPE_STORAGE,JSON.stringify(myRecipes));
      return true;
    }catch(error){ return false; }
  }
  var playing = false;
  var masterVol = .55;
  // 已拥有的包解锁的通道（服务端权益，登录后由 setOwnedPacks 传入）。
  // “能不能用” = 免费通道 或 已拥有包里的通道 或 订阅用户（全部通道）；
  // 引擎里所有 sessionTools.isFreeSound / freeMix 的调用点都走这两个包装，
  // 所以解锁后调音、配方、随机、音源替换全部自动放行。
  var ownedSounds = new Set();
  var isSubscriber = false;
  function isPlayable(id){ return isFreeSound(id) || ownedSounds.has(id) || isSubscriber; }
  function playableMix(mix){
    return Object.fromEntries(Object.entries(mix).filter(function(entry){
      return isPlayable(entry[0]) && Number.isFinite(entry[1]) && entry[1] > 0;
    }).map(function(entry){ return [entry[0], Math.min(1, entry[1])]; }));
  }
  var sessionTools={createSession,freeMix:playableMix,isFreeSound:isPlayable};
  var session=sessionTools.createSession({
    getItem:function(key){ return localStorage.getItem(key); },
    setItem:function(key,value){ localStorage.setItem(key,value); }
  });
  var activeScene=null, pendingScene=null;

  function $(id){ return document.getElementById(id); }
  function soundById(id){ for(var i=0;i<SOUNDS.length;i++) if(SOUNDS[i].id===id) return SOUNDS[i]; return null; }
  function clamp01(v){ return Math.max(0, Math.min(1, v)); }

  /* 按块绑定的监听器：bind* 把 remover 记进对应块的数组，unbind*
     全部撤掉（路由切换/重复挂载时不留重复监听）。元素不存在时跳过。 */
  function track(list, el, type, fn, opts){
    if(!el) return;
    el.addEventListener(type, fn, opts);
    list.push(function(){ el.removeEventListener(type, fn, opts); });
  }
  function untrack(list){
    while(list.length){ var rm=list.pop(); try{ rm(); }catch(e){} }
  }

  /* 界面语言：所有引擎文案都按当前 uiLocale 取（locale.mjs 的字典），
     中文界面只显示中文名、英文界面只显示英文名，绝不同时出现两种语言。
     语言切换只改文案，不改支付方式和价格（2026-11-12 解耦规则）。
     切换竞态：setLocale() 先发事件、后导航，事件触发的同步重绘仍看到
     旧 URL；重绘期间用事件带来的新语言覆盖 L()，重绘完立即清掉，
     之后再按 URL 取语言。 */
  var repaintingLocale = null;
  function L(){ return repaintingLocale || getLocale(); }
  function activeSounds(){
    return SOUNDS.filter(function(s){ return levels[s.id]>0.02; })
      .map(function(s){ return { sound: s, level: levels[s.id] }; });
  }
  function toast(msg){
    var t=$("toast"); t.textContent=msg; t.classList.add("show");
    clearTimeout(t._h); t._h=setTimeout(function(){ t.classList.remove("show"); },2600);
  }

  /* ============================== audio engine ============================== */
  var AC=null, master=null, transport=null, sessionGain=null, sleepGain=null, masterAnalyser=null;
  var buffers={};
  var chans={};
  var recordings={};

  function ensureCtx(){
    if(AC) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    AC = new Ctx();
    var comp = AC.createDynamicsCompressor();
    comp.threshold.value=-18; comp.knee.value=14; comp.ratio.value=8;
    comp.attack.value=.005; comp.release.value=.25;
    master = AC.createGain(); master.gain.value=masterVol*masterVol;
    sessionGain=AC.createGain(); sessionGain.gain.value=0;
    // Sleep timer's own gain, after the session gain: transport ->
    // sessionGain -> sleepGain -> master. It sits at 1 and only fades
    // when a sleep timer is armed (see armSleepGain).
    sleepGain=AC.createGain(); sleepGain.gain.value=1;
    sessionGain.connect(sleepGain); sleepGain.connect(master);
    transport=AC.createGain(); transport.gain.value=0; transport.connect(sessionGain);
    masterAnalyser = AC.createAnalyser(); masterAnalyser.fftSize=256;
    master.connect(comp); comp.connect(masterAnalyser); masterAnalyser.connect(AC.destination);
    SOUNDS.forEach(function(s){
      var g=AC.createGain(); g.gain.value=0;
      var an=AC.createAnalyser(); an.fftSize=256;
      var inp=AC.createGain();
      /* v3 tone chain: in -> bright lowpass （明亮度/远近） -> dist gain -> analyser -> master,
         plus a feedback-delay send whose wet level grows with 远近， giving real distance */
      var brightF=filt("lowpass", 3200);
      var distG=AC.createGain(); distG.gain.value=1;
      var dly=AC.createDelay(1); dly.delayTime.value=.19;
      var fb=AC.createGain(); fb.gain.value=.32;
      var wet=AC.createGain(); wet.gain.value=0;
      inp.connect(brightF); brightF.connect(g); g.connect(distG); distG.connect(an); an.connect(transport);
      distG.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(an);
      chans[s.id]={ in:inp, gain:g, analyser:an, bag:null, brightF:brightF, distG:distG, wet:wet };
      applyParams(s.id);
    });
    AC.addEventListener("statechange", function(){
      if(AC.state==="running") armSessionGain();
    });
  }
  /* push one sound's 明亮度/远近 into its tone chain — called live while sliders move */
  function applyParams(id){
    if(!AC) return;
    var ch=chans[id]; if(!ch || !ch.brightF) return;
    var P=params[id], t=AC.currentTime;
    var fc=800+Math.pow(P.bright,1.15)*9800;
    fc*= (1-P.dist*0.55);
    fc=Math.max(280, Math.min(9200, fc));
    ch.brightF.frequency.setTargetAtTime(fc, t, .05);
    ch.distG.gain.setTargetAtTime(1-P.dist*0.35, t, .05);
    var loop=ch.bag && ch.bag.loop;
    ch.wet.gain.setTargetAtTime(P.dist*(loop ? .09 : .20), t, .05);
    if(loop) loop.playbackRate.setTargetAtTime(0.82+P.tempo*.36, t, .12);
  }
  function noiseBuffer(kind){
    if(buffers[kind]) return buffers[kind];
    var len=AC.sampleRate*2, buf=AC.createBuffer(1,len,AC.sampleRate), d=buf.getChannelData(0), i, last=0, w;
    if(kind==="white"){ for(i=0;i<len;i++) d[i]=Math.random()*2-1; }
    else if(kind==="pink"){ var b0=0,b1=0,b2=0; for(i=0;i<len;i++){ w=Math.random()*2-1; b0=0.997*b0+w*0.029; b1=0.985*b1+w*0.032; b2=0.95*b2+w*0.048; d[i]=(b0+b1+b2+w*0.05)*2.4; } }
    else if(kind==="brown"){ for(i=0;i<len;i++){ w=Math.random()*2-1; last=(last+0.02*w)/1.02; d[i]=last*3.2; } }
    else if(kind==="short"){ var l2=AC.sampleRate*0.12, b2=AC.createBuffer(1,l2,AC.sampleRate), d2=b2.getChannelData(0); for(i=0;i<l2;i++) d2[i]=(Math.random()*2-1)*(1-i/l2); buffers[kind]=b2; return b2; }
    buffers[kind]=buf; return buf;
  }
  function loopSrc(bag, kind, rate){
    var src=AC.createBufferSource(); src.buffer=noiseBuffer(kind); src.loop=true;
    if(rate) src.playbackRate.value=rate;
    bag.srcs.push(src); return src;
  }
  function filt(type, freq, q){
    var f=AC.createBiquadFilter(); f.type=type; f.frequency.value=freq; if(q) f.Q.value=q; return f;
  }
  function lfo(bag, freq, depth, param, base){
    var o=AC.createOscillator(); o.frequency.value=freq;
    var g=AC.createGain(); g.gain.value=depth;
    o.connect(g); g.connect(param); o.start(); bag.srcs.push(o);
    if(base!==undefined) param.value=base;
    return o;
  }
  function burst(bag, out, opt){
    if(!bag.alive) return;
    var src=AC.createBufferSource(); src.buffer=noiseBuffer("short");
    src.playbackRate.value=opt.rate||1;
    var f=filt(opt.ftype||"bandpass", opt.freq||1500, opt.q||1);
    var g=AC.createGain(); var t=AC.currentTime;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(Math.max(opt.gain||.3,0.0002), t+(opt.a||0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t+(opt.dur||0.08));
    src.connect(f); f.connect(g); g.connect(out);
    src.onended=function(){ src.disconnect(); f.disconnect(); g.disconnect(); };
    src.start(); src.stop(t+(opt.dur||0.08)+0.05);
  }
  function tone(bag, out, opt){
    if(!bag.alive) return;
    var t=AC.currentTime+(opt.at||0);
    var o=AC.createOscillator(); o.type=opt.type||"sine";
    o.frequency.setValueAtTime(opt.f0, t);
    if(opt.f1) o.frequency.exponentialRampToValueAtTime(opt.f1, t+(opt.dur||0.3));
    var g=AC.createGain();
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(opt.gain||.2, t+(opt.a||0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t+(opt.dur||0.3));
    o.connect(g); g.connect(out);
    o.onended=function(){ o.disconnect(); g.disconnect(); };
    o.start(t); o.stop(t+(opt.dur||0.3)+0.1);
    if(opt.oct){ tone(bag,out,{f0:opt.f0*2, gain:(opt.gain||.2)*0.22, dur:opt.dur, a:opt.a, at:opt.at, type:"sine"}); }
  }

  var GENS = {
    rain: function(bag,out){
      var s1=loopSrc(bag,"white"); var f1=filt("lowpass",880); var g1=AC.createGain(); g1.gain.value=.5;
      s1.connect(f1); f1.connect(g1); g1.connect(out); s1.start();
      var s2=loopSrc(bag,"white",0.7); var f2=filt("highpass",4200); var g2=AC.createGain(); g2.gain.value=.03;
      s2.connect(f2); f2.connect(g2); g2.connect(out); s2.start();
      bag.every(700,function(){ f1.frequency.setTargetAtTime(1050+Math.random()*450, AC.currentTime, .3); });
    },
    fire: function(bag,out){
      var s=loopSrc(bag,"brown"); var f=filt("lowpass",380); var g=AC.createGain(); g.gain.value=.55;
      s.connect(f); f.connect(g); g.connect(out); s.start();
      (function crackle(){
        bag.after(50+Math.random()*380, function(){
          if(levels.fire>0.02) burst(bag,out,{freq:700+Math.random()*2600, q:2.5, gain:.08+Math.random()*.4, dur:.03+Math.random()*.06, rate:.7+Math.random()*.9});
          crackle();
        });
      })();
    },
    piano: function(bag,out){
      var lp=filt("lowpass",2500); lp.connect(out);
      var dly=AC.createDelay(1); dly.delayTime.value=.36;
      var fb=AC.createGain(); fb.gain.value=.3; var wet=AC.createGain(); wet.gain.value=.22;
      lp.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(out);
      var chords=[[220,261.6,329.6,392],[174.6,220,261.6,329.6],[196,246.9,293.7,392],[164.8,196,246.9,329.6]];
      var mel=[440,523.3,587.3,659.3,784,880,1046.5];
      var step=0;
      bag.every(1250,function(){
        if(levels.piano<=0.02) return;
        var ch=chords[Math.floor(step/2)%chords.length];
        if(step%2===0){ for(var i=0;i<ch.length;i++) playPiano(bag,lp,ch[i],.045,i*.06); }
        if(Math.random()<.88){
          var n=mel[Math.floor(Math.random()*mel.length)];
          playPiano(bag,lp,n,.12+Math.random()*.035,0);
          if(Math.random()<.24) playPiano(bag,lp,mel[Math.floor(Math.random()*mel.length)],.075,.35);
        }
        step++;
      });
    },
    waves: function(bag,out){
      var s=loopSrc(bag,"white"); var f=filt("lowpass",480); var g=AC.createGain(); g.gain.value=.5;
      s.connect(f); f.connect(g); g.connect(out); s.start();
      lfo(bag, 0.075, 260, f.frequency, 520);
      lfo(bag, 0.075, 0.26, g.gain, 0.52);
    },
    birds: function(bag,out){
      (function chirp(){
        bag.after(900+Math.random()*3200, function(){
          if(levels.birds>0.02){
            var base=2300+Math.random()*900, n=2+Math.floor(Math.random()*3);
            for(var i=0;i<n;i++){
              tone(bag,out,{f0:base+Math.random()*500, f1:base+900+Math.random()*600, gain:.05+Math.random()*.04, dur:.14, a:.015, at:i*0.17});
            }
          }
          chirp();
        });
      })();
    },
    wind: function(bag,out){
      var s=loopSrc(bag,"white",0.5); var f=filt("bandpass",520,0.9); var g=AC.createGain(); g.gain.value=.5;
      s.connect(f); f.connect(g); g.connect(out); s.start();
      lfo(bag, 0.06, 260, f.frequency, 560);
      bag.every(2600,function(){ f.frequency.setTargetAtTime(320+Math.random()*620, AC.currentTime, 1.4); });
    },
    stream: function(bag,out){
      var s=loopSrc(bag,"white",0.6); var f=filt("bandpass",1050,0.65); var g=AC.createGain(); g.gain.value=.42;
      s.connect(f); f.connect(g); g.connect(out); s.start();
      var s2=loopSrc(bag,"white",1.3); var f2=filt("lowpass",640); var g2=AC.createGain(); g2.gain.value=.16;
      s2.connect(f2); f2.connect(g2); g2.connect(out); s2.start();
      lfo(bag, 0.14, 260, f.frequency, 1080);
      (function bubble(){
        bag.after(260+Math.random()*700, function(){
          if(levels.stream>0.02) tone(bag,out,{f0:820+Math.random()*760, f1:430+Math.random()*220, gain:.035+Math.random()*.03, dur:.12, a:.006});
          bubble();
        });
      })();
    },
    insects: function(bag,out){
      (function chirp(){
        bag.after(700+Math.random()*1500, function(){
          if(levels.insects>0.02){
            var base=4150+Math.random()*450, n=3+Math.floor(Math.random()*3);
            for(var i=0;i<n;i++) tone(bag,out,{f0:base, gain:.026+Math.random()*.012, dur:.055, a:.008, at:i*0.085});
          }
          chirp();
        });
      })();
    },
    train: function(bag,out){
      var s=loopSrc(bag,"brown"); var f=filt("lowpass",130); var g=AC.createGain(); g.gain.value=.85;
      s.connect(f); f.connect(g); g.connect(out); s.start();
      bag.every(1500,function(){
        if(levels.train<=0.02) return;
        tone(bag,out,{f0:88, gain:.16, dur:.16, a:.008});
        tone(bag,out,{f0:82, gain:.14, dur:.16, a:.008, at:.22});
      });
    },
    cafe: function(bag,out){
      var s=loopSrc(bag,"brown"); var f=filt("lowpass",620); var g=AC.createGain(); g.gain.value=.4;
      s.connect(f); f.connect(g); g.connect(out); s.start();
      var s2=loopSrc(bag,"white",0.4); var f2=filt("bandpass",950,0.6); var g2=AC.createGain(); g2.gain.value=.05;
      s2.connect(f2); f2.connect(g2); g2.connect(out); s2.start();
      bag.every(1900,function(){ g2.gain.setTargetAtTime(.03+Math.random()*.05, AC.currentTime, .8); });
      (function clink(){
        bag.after(5000+Math.random()*9000,function(){
          if(levels.cafe>0.02) tone(bag,out,{f0:2900+Math.random()*900, gain:.028, dur:.5, a:.004});
          clink();
        });
      })();
    },
    traffic: function(bag,out){
      var s=loopSrc(bag,"white",0.5); var f=filt("lowpass",300); var g=AC.createGain(); g.gain.value=.34;
      s.connect(f); f.connect(g); g.connect(out); s.start();
      var s2=loopSrc(bag,"brown"); var f2=filt("lowpass",150); var g2=AC.createGain(); g2.gain.value=.3;
      s2.connect(f2); f2.connect(g2); g2.connect(out); s2.start();
      (function passby(){
        bag.after(2600+Math.random()*5200, function(){
          if(levels.traffic>0.02){
            var src=loopSrc(bag,"white",0.8); bag.srcs.pop();
            var bf=filt("bandpass",420,1.1); var bg=AC.createGain(); var t=AC.currentTime;
            bg.gain.setValueAtTime(0.0001,t);
            bg.gain.exponentialRampToValueAtTime(.14+Math.random()*.1, t+0.9);
            bg.gain.exponentialRampToValueAtTime(0.0001, t+2.1);
            bf.frequency.setValueAtTime(300,t);
            bf.frequency.exponentialRampToValueAtTime(880, t+0.9);
            bf.frequency.exponentialRampToValueAtTime(240, t+2.1);
            src.connect(bf); bf.connect(bg); bg.connect(out); src.start(); src.stop(t+2.3);
          }
          passby();
        });
      })();
    },
    rural: function(bag,out){
      var s=loopSrc(bag,"brown"); var f=filt("lowpass",260); var g=AC.createGain(); g.gain.value=.4;
      s.connect(f); f.connect(g); g.connect(out); s.start();
      var s2=loopSrc(bag,"white",0.4); var f2=filt("bandpass",480,0.8); var g2=AC.createGain(); g2.gain.value=.07;
      s2.connect(f2); f2.connect(g2); g2.connect(out); s2.start();
      lfo(bag, 0.05, 170, f2.frequency, 520);
      (function cricket(){
        bag.after(1500+Math.random()*2600, function(){
          if(levels.rural>0.02){
            var n=2+Math.floor(Math.random()*3);
            for(var i=0;i<n;i++) tone(bag,out,{f0:4300+Math.random()*300, gain:.016, dur:.05, a:.008, at:i*0.11});
          }
          cricket();
        });
      })();
      (function owl(){
        bag.after(12000+Math.random()*16000, function(){
          if(levels.rural>0.02){
            tone(bag,out,{f0:342, gain:.045, dur:.34, a:.05});
            tone(bag,out,{f0:326, gain:.04, dur:.42, a:.05, at:.55});
          }
          owl();
        });
      })();
    },
    market: function(bag,out){
      var s=loopSrc(bag,"brown"); var f=filt("lowpass",760); var g=AC.createGain(); g.gain.value=.42;
      s.connect(f); f.connect(g); g.connect(out); s.start();
      var s2=loopSrc(bag,"white",0.45); var f2=filt("bandpass",1150,0.55); var g2=AC.createGain(); g2.gain.value=.045;
      s2.connect(f2); f2.connect(g2); g2.connect(out); s2.start();
      bag.every(1700,function(){ g2.gain.setTargetAtTime(.03+Math.random()*.05, AC.currentTime, .7); });
      (function chatter(){
        bag.after(420+Math.random()*1300, function(){
          if(levels.market>0.02){
            var n=2+Math.floor(Math.random()*3), t=0;
            for(var i=0;i<n;i++){ (function(tt){ bag.after(tt,function(){ burst(bag,out,{freq:850+Math.random()*650, q:2.2, gain:.07+Math.random()*.06, dur:.11+Math.random()*.07, rate:.8+Math.random()*.4}); }); })(t); t+=130+Math.random()*110; }
            if(Math.random()<.22) tone(bag,out,{f0:2600+Math.random()*700, gain:.02, dur:.4, a:.004});
          }
          chatter();
        });
      })();
    },
    rainstreet: function(bag,out){
      var s1=loopSrc(bag,"white"); var f1=filt("lowpass",840); var g1=AC.createGain(); g1.gain.value=.46;
      s1.connect(f1); f1.connect(g1); g1.connect(out); s1.start();
      var s2=loopSrc(bag,"white",0.7); var f2=filt("highpass",4600); var g2=AC.createGain(); g2.gain.value=.022;
      s2.connect(f2); f2.connect(g2); g2.connect(out); s2.start();
      (function car(){
        bag.after(5000+Math.random()*8000, function(){
          if(levels.rainstreet>0.02){
            var src=loopSrc(bag,"white",0.7); bag.srcs.pop();
            var bf=filt("bandpass",520,1); var bg=AC.createGain(); var t=AC.currentTime;
            bg.gain.setValueAtTime(0.0001,t);
            bg.gain.exponentialRampToValueAtTime(.09, t+1.1);
            bg.gain.exponentialRampToValueAtTime(0.0001, t+2.6);
            bf.frequency.setValueAtTime(340,t);
            bf.frequency.exponentialRampToValueAtTime(760, t+1.1);
            bf.frequency.exponentialRampToValueAtTime(280, t+2.6);
            src.connect(bf); bf.connect(bg); bg.connect(out); src.start(); src.stop(t+2.8);
          }
          car();
        });
      })();
      (function drip(){
        bag.after(1500+Math.random()*2600, function(){
          if(levels.rainstreet>0.02) tone(bag,out,{f0:1150+Math.random()*380, f1:590, gain:.07, dur:.18, a:.004});
          drip();
        });
      })();
    },
    guitar: function(bag,out){
      var lp=filt("lowpass",2900); lp.connect(out);
      var chords=[[110,164.8,196,246.9],[87.3,130.8,174.6,220],[98,146.8,196,293.7],[82.4,123.5,164.8,246.9]];
      var step=0;
      bag.every(980,function(){
        if(levels.guitar<=0.02) return;
        var ch=chords[Math.floor(step/2)%chords.length];
        if(step%2===0) playString("guitar",bag,lp,ch[0],.19);
        var seq=[1,2,3,2];
        var idx=seq[step%seq.length];
        playString("guitar",bag,lp,ch[idx]*(Math.random()<.2?2:1),.17+Math.random()*.05,.055);
        if(Math.random()<.27) playString("guitar",bag,lp,ch[2]*2,.09,.28);
        step++;
      });
    },
    chimes: function(bag,out){
      var scale=[1567.98,1760,2093,2349.31,2637.02,3135.96];
      (function ring(){
        bag.after(1100+Math.random()*2400, function(){
          if(levels.chimes>0.02){
            var n=1+Math.floor(Math.random()*3);
            for(var i=0;i<n;i++){
              var f0=scale[Math.floor(Math.random()*scale.length)];
              tone(bag,out,{f0:f0, gain:.05+Math.random()*.035, dur:3.4, a:.005, at:i*(0.1+Math.random()*0.14), oct:true});
            }
          }
          ring();
        });
      })();
    },
    thunder: function(bag,out){
      (function rumble(){
        bag.after(6000+Math.random()*11000, function(){
          if(levels.thunder>0.02){
            var src=loopSrc(bag,"brown"); bag.srcs.pop();
            var f=filt("lowpass",320); var g=AC.createGain(); var t=AC.currentTime;
            g.gain.setValueAtTime(0.0001,t);
            g.gain.exponentialRampToValueAtTime(.5+Math.random()*.35, t+0.7+Math.random()*.8);
            g.gain.exponentialRampToValueAtTime(0.0001, t+3+Math.random()*2.2);
            src.connect(f); f.connect(g); g.connect(out); src.start();
            src.stop(t+6); f.frequency.setTargetAtTime(70, t+1, 1.2);
          }
          rumble();
        });
      })();
    },
    keyboard: function(bag,out){
      function type(){
        bag.after(95+Math.random()*410,function(){
          burst(bag,out,{freq:1100+Math.random()*1100,q:1.2,gain:.07,dur:.034});
          type();
        });
      }
      type();
    },
    muyu: function(bag,out){
      var step=0;
      bag.every(880,function(){
        if(levels.muyu<=0.02){ step++; return; }
        if(step%4===3){
          /* hand-drum thump on the fourth beat */
          tone(bag,out,{f0:168, f1:64, gain:.24, dur:.24, a:.005});
        } else {
          /* wooden-fish knock: fast pitch-drop body + woody click */
          tone(bag,out,{f0:640+Math.random()*60, f1:250, gain:.17, dur:.085, a:.003});
          burst(bag,out,{freq:1750, q:2, gain:.07, dur:.028, rate:1.2});
          if(step%4===1 && Math.random()<.45) (function(){ bag.after(190,function(){ tone(bag,out,{f0:600, f1:240, gain:.1, dur:.08, a:.003}); }); })();
        }
        step++;
      });
    },
    harp: function(bag,out){
      var lp=filt("lowpass",3100); lp.connect(out);
      var dly=AC.createDelay(1); dly.delayTime.value=.31;
      var fb=AC.createGain(); fb.gain.value=.17; var wet=AC.createGain(); wet.gain.value=.13;
      lp.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(out);
      var scale=[261.63,293.66,329.63,392,440,523.25,587.33,659.25];
      var last=3;
      (function note(){
        bag.after(1900+Math.random()*2300, function(){
          if(levels.harp>0.02){
            last=Math.max(0, Math.min(scale.length-1, last + (Math.floor(Math.random()*5)-2)));
            playString("harp",bag,lp,scale[last],.19);
            if(Math.random()<.25) playString("harp",bag,lp,scale[Math.max(0,last-2)],.09,.38);
          }
          note();
        });
      })();
    }
  };

  function playPiano(bag,out,freq,volume,at){
    var sample=recordings.piano && recordings.piano.sample;
    if(sample) playInstrumentNote(AC,out,sample,freq,volume,AC.currentTime+.015+at);
    else tone(bag,out,{f0:freq,gain:volume*.65,dur:2.8,a:.02,at:at,oct:true});
  }

  function playString(id,bag,out,freq,volume,at){
    var sample=recordings[id] && recordings[id].sample;
    if(sample){
      playInstrumentNote(AC,out,sample,freq,volume,AC.currentTime+.015+(at||0));
      return;
    }
    // Deterministic, decaying harmonics for offline playback. No feedback loop.
    var harp=id==="harp";
    var partials=harp ? [1,.46,.19,.07] : [1,.35,.23,.10];
    [1,2,3,4].forEach(function(harmonic,i){
      tone(bag,out,{f0:freq*harmonic, gain:volume*partials[i]*.46,
        dur:(harp?2.15:1.35)/(1+i*.42), a:.018, at:at});
    });
  }

  function startGen(id){
    var ch=chans[id];
    if(ch.bag) return;
    var bag={ timers:new Set(), srcs:[], alive:true, out:AC.createGain() };
    function schedule(delay,fn){
      var timer=setTimeout(function(){
        bag.timers.delete(timer);
        if(bag.alive) fn();
      },delay);
      bag.timers.add(timer);
    }
    bag.every=function(ms,fn){
      function tick(){
        var p=params[id];
        var delay=ms*(1.35-p.tempo*.85)*(1+(Math.random()-.5)*p.rand*.5);
        schedule(Math.max(40,delay),function(){
          if(ms<400 || Math.random()<=.3+params[id].density*.7) fn();
          tick();
        });
      }
      tick();
    };
    bag.after=function(ms,fn){
      var p=params[id];
      var delay=ms*(1.55-p.density*1.05)*(1.25-p.tempo*.5)*(1+(Math.random()-.5)*p.rand*.9);
      schedule(Math.max(30,delay),fn);
    };
    var t=AC.currentTime;
    bag.out.gain.setValueAtTime(0,t);
    bag.out.gain.linearRampToValueAtTime(1,t+.32);
    bag.out.connect(ch.in);
    ch.bag=bag;
    var recording=recordings[id];
    if(recording && recording.loop){
      var loop=AC.createBufferSource();
      loop.buffer=recording.loop;
      loop.loop=true;
      loop.playbackRate.value=.82+params[id].tempo*.36;
      loop.connect(bag.out);
      loop.start();
      bag.srcs.push(loop);
      bag.loop=loop;
      applyParams(id);
    } else {
      var fallback={ forest:"wind", boat:"waves" };
      GENS[fallback[id]||id](bag,bag.out);
    }
  }

  function stopGen(id){
    var ch=chans[id], bag=ch && ch.bag;
    if(!bag) return;
    ch.bag=null;
    bag.alive=false;
    bag.timers.forEach(function(timer){ clearTimeout(timer); });
    bag.timers.clear();
    var t=AC.currentTime;
    bag.out.gain.cancelScheduledValues(t);
    bag.out.gain.setTargetAtTime(0,t,.075);
    bag.srcs.forEach(function(node){ node.stop(t+.34); });
    setTimeout(function(){ bag.out.disconnect(); },400);
  }

  function loadBundledSound(id){
    var meta=SOUND_AUDIO[id];
    if(!meta || location.protocol==="file:" || recordings[id]) return;
    var entry={loading:true};
    recordings[id]=entry;
    updateSourceUI(id);
    fetch(meta.file).then(function(response){
      if(!response.ok) throw new Error("HTTP "+response.status);
      return response.arrayBuffer();
    }).then(function(bytes){
      return AC.decodeAudioData(bytes);
    }).then(function(buffer){
      if(recordings[id]!==entry) return;
      if(meta.roots) entry.sample={buffer:buffer,meta:meta};
      else entry.loop=prepareRecording(AC,buffer,false);
    }).catch(function(){
      entry.failed=true;
    }).finally(function(){
      entry.loading=false;
      if(!disposed && recordings[id]===entry){
        updateSourceUI(id);
        applyGain(id);
      }
    });
  }

  function applyGain(id){
    if(!AC) return;
    var ch=chans[id], level=sessionTools.isFreeSound(id) ? levels[id] : 0;
    ch.gain.gain.setTargetAtTime(level>.02 ? Math.pow(level,1.35) : 0, AC.currentTime, .055);
    if(!playing) return;
    if(level>.02){
      loadBundledSound(id);
      if(!recordings[id] || !recordings[id].loading) startGen(id);
    } else {
      stopGen(id);
    }
  }

  function updateMasterGain(){
    if(!master) return;
    var power=SOUNDS.reduce(function(sum,s){ return sum+Math.pow(levels[s.id],2.7); },0);
    var headroom=1/Math.sqrt(Math.max(1,power));
    master.gain.setTargetAtTime(masterVol*masterVol*headroom,AC.currentTime,.09);
  }

  function applyParamsMap(map){
    if(!map) return;
    Object.keys(map).forEach(function(id){
      if(!params[id] || !map[id]) return;
      PARAM_DEFS.forEach(function(d){ if(typeof map[id][d.k]==="number") params[id][d.k]=clamp01(map[id][d.k]); });
      applyParams(id);
    });
  }
  function tweenTo(mix){
    cancelAnimationFrame(mixFrame);
    mix=sessionTools.freeMix(mix);
    var start={}, t0=null;
    SOUNDS.forEach(function(s){ start[s.id]=levels[s.id]; });
    var target={}; SOUNDS.forEach(function(s){ target[s.id]= mix[s.id]||0; });
    function frame(ts){
      if(!t0) t0=ts;
      var p=Math.min(1,(ts-t0)/650), e=1-Math.pow(1-p,3);
      SOUNDS.forEach(function(s){
        levels[s.id]=start[s.id]+(target[s.id]-start[s.id])*e;
        applyGain(s.id);
      });
      updateMasterGain();
      paintCurrentMix();
      if(p<1) mixFrame=requestAnimationFrame(frame);

    }
    mixFrame=requestAnimationFrame(frame);
  }


  function paintCurrentMix(){
    var box=$("currentMix");
    if(!box) return;
    var active=activeSounds();
    if(!active.length){ box.textContent=t(L(),'mine.saveEmpty'); return; }
    box.textContent=mixSummaryText(active, L());
    /* save name pre-filled from the dominant sounds (Noisli model:
       one tap to save, never a blank form) */
    var nm=$("recipeName"); if(nm && !nm.value.trim()){ var dn=defaultName(); if(dn) nm.value=dn; }
  }


  /* ============================== transport ============================== */
  var stopVoicesTimer;
  // Sleep timer state: a wall-clock deadline (null = no timer) and the
  // choice in minutes (0 = off). The timer is wall-clock, like the
  // journey timer: pausing does not extend it. (The mixer-bar select
  // that armed it is gone; the machinery stays for the session logic.)
  var sleepDeadline=null, sleepFadeSeconds=SLEEP_TIMER_FADE_SECONDS, sleepChoice=0;
  function armSleepGain(){
    if(!sleepGain || !AC) return;
    var now=AC.currentTime;
    var schedule=fadeSchedule({deadlineMs:sleepDeadline, nowMs:Date.now(), audioNow:now, fadeSeconds:sleepFadeSeconds});
    if(!schedule){ sleepGain.gain.cancelScheduledValues(now); sleepGain.gain.setValueAtTime(1,now); return; }
    applyFadeSchedule(sleepGain.gain, schedule, 1, now);
  }
  // Arm (or clear) the recipe sleep timer. Returns the deadline, or null.
  // 睡眠定时是订阅功能：免费用户设定时拒绝并弹升级提示（返回 null，
  // 调用方把 select 复位到 off）；清定时（ms 为 null）任何人都可以。
  function setSleepTimer(ms, fadeSeconds){
    if(!isSubscriber && Number.isFinite(ms) && ms>0){
      showPremium(t(L(),'overlays.premiumSleepTimer'));
      return null;
    }
    sleepFadeSeconds=Number.isFinite(fadeSeconds) && fadeSeconds>0 ? fadeSeconds : SLEEP_TIMER_FADE_SECONDS;
    sleepDeadline=Number.isFinite(ms) && ms>0 ? Date.now()+ms : null;
    armSessionGain();
    paintSession();
    return sleepDeadline;
  }
  function armSessionGain(){
    // The sleep fade is armed together with the session gain so the two
    // can never drift apart (both are re-armed on resume/visibility).
    armSleepGain();
    if(!sessionGain) return;
    var remaining=session.remaining()||0, now=AC.currentTime;
    // While a sleep timer is active it governs: the 10-minute free window
    // must not cut a 30/60/90-minute sleep timer short, so the session
    // gain follows the later of the two deadlines.
    var sleepMs=sleepRemainingMs(sleepDeadline, Date.now());
    // 订阅用户且没有睡眠定时：不限时，sessionGain 恒为 1（不安排淡出）。
    if(isSubscriber && sleepMs===null) remaining=Infinity;
    if(sleepMs!==null) remaining=Math.max(remaining, sleepMs);
    var gain=sessionGain.gain;
    gain.cancelScheduledValues(now);
    if(!Number.isFinite(remaining)){ gain.setValueAtTime(1,now); return; }
    gain.setValueAtTime(Math.min(1,remaining/5000),now);
    if(remaining>5000) gain.setValueAtTime(1,now+(remaining-5000)/1000);
    if(remaining>0) gain.linearRampToValueAtTime(0,now+remaining/1000);
  }
  function paintSession(){
    // The 10-minute countdown used to live in the mixer bar (#focusRead)
    // and the immersive overlay (#immFocus); both are gone with the mixer.
    // The countdown now flows to the now-playing bar via the
    // soundcocktail:engine-tick event dispatched in tickSession.
    // (Kept as a no-op: tickSession / setSleepTimer / pauseForScene call it.)
  }
  function tickSession(){
    paintSession();
    // Now-playing 条的倒计时：免费窗口剩余时间（订阅用户不限时，为 null）。
    if(playing || Object.keys(bedNodes).length){
      window.dispatchEvent(new CustomEvent('soundcocktail:engine-tick',{detail:{playing:playing, remainingMs:isSubscriber ? null : session.remaining()}}));
    }
    // 订阅用户且没有睡眠定时：不限时，10 分钟窗口不生效。
    if(isSubscriber && sleepDeadline===null) return;
    var sleepMs=sleepRemainingMs(sleepDeadline, Date.now());
    if(sleepDeadline!==null){
      if(sleepMs>0) return; // Sleep timer governs; the session window is subsumed.
      // The timer has run out: the fade is complete (sleepGain is 0).
      // Stop quietly — no paywall dialog for someone who fell asleep.
      sleepDeadline=null; sleepChoice=0;
      if(AC && sleepGain){ var now=AC.currentTime; sleepGain.gain.cancelScheduledValues(now); sleepGain.gain.setValueAtTime(1,now); }
      if(playing) setPlaying(false);
      Object.keys(bedNodes).forEach(stopBed);
      toast(t(L(),'engine.sleepDone'));
      paintSession();
      return;
    }
    if(session.remaining()!==0 || (!playing && !Object.keys(bedNodes).length)) return;
    replayMix=playing;
    replayBeds=Object.keys(bedNodes);
    armSessionGain();
    if(playing) setPlaying(false);
    replayBeds.forEach(stopBed);
    showSessionDone();
  }
  function openListeningWindow(){
    // 订阅用户不限时：不走 10 分钟窗口，只确保音频上下文可用。
    if(isSubscriber){
      try{ ensureCtx(); }
      catch(error){ toast(t(L(),'audio.cantPlay')); return false; }
      return true;
    }
    if(session.remaining()!==0){
      try{ ensureCtx(); }
      catch(error){ toast(t(L(),'audio.cantPlay')); return false; }
    }
    if(!session.begin()){
      tickSession();
      showSessionDone();
      return false;
    }
    armSessionGain();
    paintSession();
    return true;
  }
  function setPlaying(on, fillEmpty){
    if(on && !openListeningWindow()) return false;
    if(on===playing) return true;
    if(on) window.dispatchEvent(new Event('soundcocktail:legacy-play'));
    clearTimeout(stopVoicesTimer);
    playing=on;
    var now=AC.currentTime, envelope=transport.gain;
    updateMasterGain();
    if(envelope.cancelAndHoldAtTime) envelope.cancelAndHoldAtTime(now);
    else {
      var value=envelope.value;
      envelope.cancelScheduledValues(now);
      envelope.setValueAtTime(value,now);
    }
    envelope.linearRampToValueAtTime(on ? 1 : 0,now+(on ? 3 : 5));
    if(on){
      AC.resume().catch(function(){ toast(t(L(),'audio.cantPlay')); });
      if(fillEmpty!==false){
        if(!SOUNDS.some(function(s){ return levels[s.id]>.02; })) tweenTo({rain:.45,fire:.25,piano:.22});
        SOUNDS.forEach(function(s){ applyGain(s.id); });
      }
    }else{
      stopVoicesTimer=setTimeout(function(){
        SOUNDS.forEach(function(s){ stopGen(s.id); });
      },5100);
    }
    document.body.classList.toggle("is-playing",playing);
    // 调音台播放条已下线：播放状态由常驻的 now-playing 条显示
    // （事件带当前配方名；暂停时 label 为空，条隐藏）。
    window.dispatchEvent(new CustomEvent('soundcocktail:engine-state',{detail:{playing:playing, label:playing ? currentLabel : ''}}));
    return true;
  }
  function playMix(mix,scene){
    var starting=!playing;
    if(!setPlaying(true,false)) return false;
    if(starting) SOUNDS.forEach(function(sound){ levels[sound.id]=0; applyGain(sound.id); });
    activeScene=scene||null;
    tweenTo(mix);
    return true;
  }
  /* playMix 本体：播放配方（调音台已下线，播放由 now-playing 条控制）。 */

  /* ============================== recipes ============================== */
  function mixBarHTML(mix){
    var total=Object.keys(mix).reduce(function(a,k){ return a+mix[k]; },0);
    var bars="", legend="";
    Object.keys(mix).forEach(function(id){
      var s=soundById(id); if(!s) return;
      bars+='<i style="background:'+s.color+';width:'+(mix[id]/total*100)+'%"></i>';
      legend+='<span><i style="background:'+s.color+'"></i>'+soundDisplayName(s,L())+" "+Math.round(mix[id]*100)+"</span>";
    });
    return '<div class="mixbar">'+bars+'</div><div class="mix-legend">'+legend+'</div>';
  }
  /* 选一个配方并播放：只调配比，不跳页、不进全屏。
     （2026-11-13 实报 bug：点哪个配方都变成咖啡馆靠窗 + 沉浸模式；
     沉浸模式已随调音台下线，配方点击只播放。） */
  function chooseScene(scene){
    currentLabel=recipeDisplay(scene,L()).name;
    if(!playMix(scene.mix,scene)){
      pendingScene=scene;
      return;
    }
    pendingScene=null;
  }

  /**
   * 落地页预设：只把配方"摆"到当前配比（tweenTo 过渡），不播放。
   * tweenTo 本身会过滤进阶通道；applyGain 在音频未初始化（AC 为空）
   * 时直接返回，所以页面首次打开（无用户手势）调用也是安全的。
   * 不要用 chooseScene 做预设：它会调 playMix（手势前静默失败）。
   */
  function setMix(mix){
    activeScene=null;
    tweenTo(mix || {});
    return true;
  }

  /** 落地页"播放这个配方"：走已有的 playSavedMix（进阶通道过滤 + 提示 + 播放）。 */
  function playRecipe(recipe){
    return playSavedMix(recipe);
  }

  function playSavedMix(recipe){
    var mix=sessionTools.freeMix(recipe.mix);
    if(!Object.values(mix).some(function(level){ return level>.02; })){
      showPremium(recipe.name);
      return false;
    }
    currentLabel=recipe.name;
    if(!playMix(mix)) return false;
    if(recipe.params) applyParamsMap(recipe.params);
    var hasPremium=Object.keys(recipe.mix).some(function(id){
      return recipe.mix[id]>.02 && !sessionTools.isFreeSound(id);
    });
    // 播放由常驻的 now-playing 条控制（调音台已下线，不再跳页）。
    toast(hasPremium ? t(L(),'mine.appliedPlus') : t(L(),'mine.applied',{name:recipe.name}));
    return true;
  }

  /* ============================== my recipes ============================== */
  function encodeRecipe(name, mix, prm){
    var payload={ n:name, m:{} };
    Object.keys(mix).forEach(function(k){ payload.m[k]=Math.round(mix[k]*100); });
    if(prm){
      payload.p={};
      Object.keys(prm).forEach(function(id){
        var o={}; PARAM_DEFS.forEach(function(d){ o[d.k]=Math.round(prm[id][d.k]*100); });
        payload.p[id]=o;
      });
    }
    var json=JSON.stringify(payload);
    var b64=btoa(unescape(encodeURIComponent(json)));
    return "SYL-"+b64.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  function decodeRecipe(code){
    code=code.trim().replace(/^SYL-/,"").replace(/-/g,"+").replace(/_/g,"/");
    while(code.length%4) code+="=";
    var json=decodeURIComponent(escape(atob(code)));
    var payload=JSON.parse(json);
    var mix={};
    Object.keys(payload.m||{}).forEach(function(k){
      if(soundById(k) && Number.isFinite(payload.m[k])) mix[k]=clamp01(payload.m[k]/100);
    });
    var prm=null;
    if(payload.p){
      prm={};
      Object.keys(payload.p).forEach(function(id){
        if(!soundById(id)) return;
        var o={}; PARAM_DEFS.forEach(function(d){ if(typeof payload.p[id][d.k]==="number") o[d.k]=clamp01(payload.p[id][d.k]/100); });
        prm[id]=o;
      });
    }
    return { name:typeof payload.n==="string" ? (payload.n.trim().slice(0,32)||t(L(),'mine.friendRecipe')) : t(L(),'mine.friendRecipe'), mix:mix, params:prm };
  }
  function copyText(text, okMsg){
    function done(){ toast(okMsg); }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(done, function(){ fallback(); });
    } else fallback();
    function fallback(){
      var ta=document.createElement("textarea");
      ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select();
      try{ document.execCommand("copy"); done(); }catch(e){ toast(t(L(),'mine.copyFailed')); }
      document.body.removeChild(ta);
    }
  }
  function defaultName(){
    var active=topActive();
    if(!active.length) return "";
    return autoRecipeName(active.map(function(s){ return { sound: s, level: levels[s.id] }; }), L());
  }
  /* 音量最大的两个通道（自动配方名的来源）。 */
  function topActive(){
    return SOUNDS.filter(function(s){ return levels[s.id]>0.02; })
      .sort(function(a,b){ return levels[b.id]-levels[a.id]; }).slice(0,2);
  }
  /* 存下当前配方（保存按钮与 landing 页“存下配方”共用）：
     名字由调用方给；没有配比时只提示，不存空配方。
     保存配方是订阅功能：免费用户点保存时弹升级提示，不存。 */
  function saveCurrentMix(name){
    if(!isSubscriber){ showPremium(t(L(),'overlays.premiumSave')); return false; }
    var active=SOUNDS.filter(function(s){ return levels[s.id]>0.02; });
    if(!active.length){ toast(t(L(),'mine.saveFirst')); return false; }
    var mix={}; active.forEach(function(s){ mix[s.id]=levels[s.id]; });
    var prm={}; active.forEach(function(s){ var o={}; PARAM_DEFS.forEach(function(d){ o[d.k]=params[s.id][d.k]; }); prm[s.id]=o; });
    myRecipes.unshift({ name:name, mix:mix, params:prm, at:new Date() });
    var nm=$("recipeName"); if(nm) nm.value="";
    renderMine();
    toast(persistRecipes() ? t(L(),'mine.saved',{name:name}) : t(L(),'mine.savedNoStorage'));
    return true;
  }
  /* 保存/导入按钮的监听在 bindMine 里绑（/mine 挂载时），这里只留本体。 */
  function renderMine(){
    var list=$("mineList");
    if(!list) return;
    if(!myRecipes.length){
      list.innerHTML='<div class="empty-note-2">'+t(L(),'mine.empty')+'</div>';
      return;
    }
    list.innerHTML="";
    myRecipes.forEach(function(r, idx){
      var item=document.createElement("div"); item.className="mine-item";
      var timeStr=formatRecipeDate(r.at, L());
      item.innerHTML='<div class="top"><h4>'+escapeHtml(r.name)+'</h4><time>'+timeStr+'</time></div>'+
        mixBarHTML(r.mix)+
        '<div class="ops">'+
          '<button class="op-btn solid" data-op="apply">'+t(L(),'mine.apply')+'</button>'+
          '<button class="op-btn" data-op="card">'+t(L(),'mine.shareCard')+'</button>'+
          '<button class="op-btn" data-op="code">'+t(L(),'mine.copyCode')+'</button>'+
          '<button class="op-btn danger" data-op="del">'+t(L(),'mine.delete')+'</button>'+
        "</div>";
      item.querySelectorAll("[data-op]").forEach(function(b){
        b.addEventListener("click", function(){
          var op=b.getAttribute("data-op");
          if(op==="apply") playSavedMix(r);
          if(op==="code"){ copyText(encodeRecipe(r.name, r.mix, r.params), t(L(),'mine.codeCopied')); }
          if(op==="card"){ drawShareCard(r); }
          if(op==="del"){ myRecipes.splice(idx,1); persistRecipes(); renderMine(); toast(t(L(),'mine.deleted',{name:r.name})); }
        });
      });
      list.appendChild(item);
    });
  }
  function escapeHtml(s){ return s.replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  /* 导入按钮的监听在 bindMine 里绑（/mine 挂载时），这里只留解码本体
     供 bindMine 的处理函数调用。 */
  function importRecipeCode(code){
    var r=decodeRecipe(code);
    if(!Object.keys(r.mix).length) throw new Error("empty");
    myRecipes.unshift({ name:r.name, mix:r.mix, params:r.params, at:new Date() });
    persistRecipes();
    renderMine();
    var ic=$("importCode"); if(ic) ic.value="";
    playSavedMix(r);
  }

  /* share card */
  function drawShareCard(r){
    var c=document.createElement("canvas"); c.width=900; c.height=1160;
    var x=c.getContext("2d");
    var grd=x.createLinearGradient(0,0,0,1160);
    grd.addColorStop(0, "#f6f0e4"); grd.addColorStop(1, "#e7e0cd");
    x.fillStyle=grd; x.fillRect(0,0,900,1160);
    x.fillStyle= "#273b30";
    x.font="600 30px Manrope,sans-serif"; x.fillText("SOUND COCKTAIL", 70, 105);
    x.font="500 24px Manrope,sans-serif"; x.fillStyle= "#5f6b5d";
    x.fillText(t(L(),'mine.shareTagline'), 70, 148);
    x.font="600 72px Manrope,sans-serif"; x.fillStyle= "#273b30";
    wrapText(x, r.name, 70, 280, 760, 92, 2);
    // 配方配比条：按音量横向分段，画在名字与配料清单之间
    // （改版后分享卡不再画鸡尾酒杯）。
    var active=SOUNDS.filter(function(s){return r.mix[s.id]>0.02;}).sort(function(a,b){return r.mix[b.id]-r.mix[a.id];});
    var total=active.reduce(function(sum,s){return sum+r.mix[s.id];},0)||1;
    var barX=70, barY=430, barW=760, barH=46, barCursor=barX;
    active.slice(0,4).forEach(function(s){
      var w=barW*(r.mix[s.id]/total);
      x.fillStyle=s.color;
      x.fillRect(barCursor, barY, Math.max(8,w), barH);
      barCursor+=w;
    });
    x.fillStyle="rgba(39,59,48,.18)";
    x.fillRect(barX, barY+barH+10, barW, 2);
    /* ingredient list （字体按界面语言：英文用 Manrope，中文用思源字体） */
    var fontSans=L()==="en" ? "500 32px Manrope,sans-serif" : "500 32px 'Noto Sans SC',sans-serif";
    var fontSerif=L()==="en" ? "700 30px 'Cormorant Garamond',serif" : "700 30px 'Noto Serif SC',serif";
    x.font=fontSans;
    var ly=900;
    active.slice(0,4).forEach(function(s){
      var id=s.id;
      x.fillStyle=s.color; x.fillRect(70, ly-26, 26, 26);
      x.fillStyle= "#273b30";
      x.fillText(soundDisplayName(s,L())+"  "+Math.round(r.mix[id]*100), 116, ly);
      ly+=52;
    });
    x.font=fontSerif; x.fillStyle= "#ab6f50";
    x.fillText(t(L(),'mine.shareTagline'), 70, 1090);
    var a=document.createElement("a");
    a.download="Sound-Cocktail-"+r.name+".png";
    a.href=c.toDataURL("image/png");
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast(t(L(),'mine.cardDone'));
  }
  function roundRectStroke(x, px, py, w, h, rad){
    x.beginPath();
    x.moveTo(px+rad, py);
    x.lineTo(px+w-rad, py); x.quadraticCurveTo(px+w, py, px+w, py+rad);
    x.lineTo(px+w, py+h-rad); x.quadraticCurveTo(px+w, py+h, px+w-rad, py+h);
    x.lineTo(px+rad, py+h); x.quadraticCurveTo(px, py+h, px, py+h-rad);
    x.lineTo(px, py+rad); x.quadraticCurveTo(px, py, px+rad, py);
    x.stroke();
  }
  function wrapText(x, text, px, py, maxW, lh, maxLines){
    var line="", lines=[];
    for(var i=0;i<text.length;i++){
      var test=line+text[i];
      if(x.measureText(test).width>maxW && line){ lines.push(line); line=text[i]; if(lines.length>=maxLines) break; }
      else line=test;
    }
    if(line && lines.length<maxLines) lines.push(line);
    lines.forEach(function(l, i){ x.fillText(l, px, py+i*lh); });
  }

  /* ============================== v2 focus (25 min pomodoro) ============================== */
  /* CountUp-style rolling digits: only the digit that changed rolls */
  var replayBeds=[], replayMix=true;
  function showSessionDone(){
    var dialog=$("sessionDone");
    if(!dialog.open) dialog.showModal();
  }
  function showPremium(name){
    $("premiumMessage").textContent=t(L(),'overlays.premiumMsg',{name:name});
    var dialog=$("premiumDialog");
    if(!dialog.open) dialog.showModal();
  }
  $("sdClose").addEventListener("click",function(){ $("sessionDone").close(); });
  $("sdAgain").addEventListener("click",function(){
    if(!session.restart()) return;
    var scene=pendingScene;
    $("sessionDone").close();
    if(scene) chooseScene(scene);
    else {
      if(replayMix) setPlaying(true);
      replayBeds.forEach(startBed);
    }
    replayBeds=[];
    replayMix=true;
  });
  $("sessionDone").addEventListener("close",function(){ pendingScene=null; });
  $("sdSave").addEventListener("click",function(){
    $("sessionDone").close();
    /* 我的配方在当前页就滚过去聚焦名字框；不在就发事件让外壳跳过去。 */
    var mineEl=$("mine");
    if(mineEl){
      mineEl.scrollIntoView({behavior:"smooth"});
      var nm=$("recipeName"); if(nm) nm.focus({preventScroll:true});
    } else if(typeof window!=="undefined"){
      window.dispatchEvent(new CustomEvent("soundcocktail:show-mine"));
    }
  });
  document.querySelectorAll("[data-see-plus]").forEach(function(button){
    button.addEventListener("click",function(){
      button.closest("dialog").close();
      /* 进阶页在当前页就滚过去；不在就发事件让外壳跳过去。 */
      var plusEl=$("plus");
      if(plusEl) plusEl.scrollIntoView({behavior:"smooth"});
      else if(typeof window!=="undefined") window.dispatchEvent(new CustomEvent("soundcocktail:show-plus"));
    });
  });


  function updateSourceUI(id){
    var meta=SOUND_AUDIO[id], entry=recordings[id];
    var kind="synth";
    if(entry && entry.custom) kind="local";
    else if(entry && entry.loading) kind="loading";
    else if(meta && location.protocol!=="file:" && !(entry && entry.failed)) kind=meta.roots ? "instrument" : "live";
    var label=t(L(),'sources.badge.'+kind);
    document.querySelectorAll('[data-srcbadge="'+id+'"],[data-cardbadge="'+id+'"]').forEach(function(badge){
      badge.textContent=label;
      badge.classList.toggle("real",kind==="live" || kind==="instrument" || kind==="local");
    });
    var usesLoop=kind==="live" || kind==="local" || (kind==="loading" && meta && !meta.roots);
    ["density","rand"].forEach(function(key){
      var input=$("prm-"+id+"-"+key);
      if(input) input.parentElement.hidden=usesLoop;
    });
  }

  function buildSources(){
    var wrap=$("srcList");
    if(!wrap) return;
    wrap.textContent="";
    SOUNDS.forEach(function(s){
      var meta=SOUND_AUDIO[s.id];
      var item=document.createElement("div"); item.className="src-item";
      var details=meta ? '<a href="'+meta.source+'" target="_blank" rel="noopener">'+meta.title+'</a> · '+meta.author+
        (meta.editor ? ' · '+meta.editor+' '+t(L(),'sources.editedBy') : '')+
        ' · <a href="'+AUDIO_LICENSES[meta.license]+'" target="_blank" rel="noopener">'+meta.license+'</a>' :
        t(L(),'sources.synthBy');
      if(meta && meta.related){
        var original=meta.related;
        details+='<br>'+t(L(),'sources.original')+'<a href="'+original.source+'" target="_blank" rel="noopener">'+original.title+'</a> · '+original.author+
          ' · <a href="'+AUDIO_LICENSES[original.license]+'" target="_blank" rel="noopener">'+original.license+'</a>';
      }
      var free=sessionTools.isFreeSound(s.id);
      var action=free ? '<label class="replace-btn">'+t(L(),'sources.replace')+'<input type="file" accept="audio/*" data-replace="'+s.id+'" hidden></label>' :
        '<button class="replace-btn" type="button">'+t(L(),'sources.plusSound')+'</button>';
      item.innerHTML='<div><h4><i style="background:'+s.color+'"></i>'+soundDisplayName(s,L())+' <span class="badge" data-srcbadge="'+s.id+'"></span></h4>'+
        '<p>'+details+'</p></div>'+action;
      wrap.appendChild(item);
      updateSourceUI(s.id);
      if(!free){
        item.querySelector("button").addEventListener("click",function(){ showPremium(soundDisplayName(s,L())); });
        return;
      }
      var input=item.querySelector("input");
      var request=0;
      input.addEventListener("change",async function(){
        var file=input.files && input.files[0];
        if(!file) return;
        input.value="";
        var current=++request;
        try{
          ensureCtx();
          var buffer=await AC.decodeAudioData(await file.arrayBuffer());
          if(disposed || current!==request) return;
          recordings[s.id]={custom:true,loop:prepareRecording(AC,buffer,true)};
          if(playing){ stopGen(s.id); applyGain(s.id); }
          updateSourceUI(s.id);
          toast(t(L(),'sources.replaced',{name:soundDisplayName(s,L())}));
        }catch(error){
          if(!disposed && current===request) toast(t(L(),'sources.loadFailed'));
        }
      });
    });
  }

  var bedNodes={};
  function startBed(kind){
    if(bedNodes[kind] || !openListeningWindow()) return;
    window.dispatchEvent(new Event('soundcocktail:legacy-play'));
    if(AC.state!=="running") AC.resume().catch(function(){ toast(t(L(),'audio.cantPlay')); });
    var src=AC.createBufferSource(); src.buffer=noiseBuffer(kind); src.loop=true;
    var f=filt("lowpass",kind==="brown"?420:kind==="pink"?2400:3200);
    var g=AC.createGain(); g.gain.value=0;
    src.connect(f); f.connect(g); g.connect(sessionGain); src.start();
    g.gain.setTargetAtTime(.14,AC.currentTime,.25);
    src.onended=function(){ src.disconnect(); f.disconnect(); g.disconnect(); };
    bedNodes[kind]={src:src,g:g};
    var button=document.querySelector('[data-bed="'+kind+'"]');
    if(button){
      button.classList.add("on");
      button.setAttribute("aria-pressed","true");
    }
  }
  function stopBed(kind){
    var node=bedNodes[kind];
    if(!node) return;
    node.g.gain.setTargetAtTime(0,AC.currentTime,.13);
    node.src.stop(AC.currentTime+.7);
    delete bedNodes[kind];
    var button=document.querySelector('[data-bed="'+kind+'"]');
    if(button){
      button.classList.remove("on");
      button.setAttribute("aria-pressed","false");
    }
  }
  /* 底噪开关的监听在 bindSources 里绑（音源清单挂载时），这里只留本体。 */

  /* ============================== page binds ==============================
     拆页后我的配方/音源清单只在各自页面挂载：页面组件挂载时
     调对应的 bind*（建清单/列表、绑按钮），卸载时调 unbind*。
     同一块 DOM 重复调 bind 时跳过静态按钮监听（只重建重绘）；
     unbind 撤监听、清记录。音频与配比状态在模块里，不受影响。 */


  /* 我的配方块（/mine）：保存/导入按钮 + 渲染列表与当前配比。 */
  var mineBoundRoot=null, mineRemovers=[];
  function bindMine(){
    var list=$("mineList");
    if(!list) return;
    var first=mineBoundRoot!==list;
    mineBoundRoot=list;
    if(first){
      track(mineRemovers, $("saveBtn"), "click", function(){
        var nm=$("recipeName");
        saveCurrentMix((nm ? nm.value.trim() : "") || defaultName());
      });
      track(mineRemovers, $("importBtn"), "click", function(){
        var ic=$("importCode");
        var code=ic ? ic.value.trim() : "";
        if(!code){ toast(t(L(),'mine.pasteFirst')); return; }
        try{
          importRecipeCode(code);
        }catch(e){
          toast(t(L(),'mine.badCode'));
        }
      });
    }
    renderMine();
    paintCurrentMix();
  }
  function unbindMine(){
    untrack(mineRemovers);
    mineBoundRoot=null;
  }

  /* 音源清单块（/sources）：重建清单 + 底噪开关（状态与正在播的底噪同步）。 */
  var sourcesBoundRoot=null, sourcesRemovers=[];
  function bindSources(){
    var wrap=$("srcList");
    if(!wrap) return;
    var first=sourcesBoundRoot!==wrap;
    sourcesBoundRoot=wrap;
    if(first){
      document.querySelectorAll("[data-bed]").forEach(function(btn){
        var kind=btn.dataset.bed;
        var on=!!bedNodes[kind];
        btn.classList.toggle("on", on);
        btn.setAttribute("aria-pressed", String(on));
        track(sourcesRemovers, btn, "click", function(){
          if(bedNodes[kind]) stopBed(kind);
          else startBed(kind);
        });
      });
    }
    buildSources();
  }
  function unbindSources(){
    untrack(sourcesRemovers);
    sourcesBoundRoot=null;
  }

  /* ============================== init ============================== */
  buildSources();
  renderMine();
  // 语言切换（导航栏选择器）只改文案：引擎重绘自己负责的部分。
  // 事件先于导航到达：重绘期间用事件的 locale 覆盖 L()，重绘完清掉。
  listen(window,"soundcocktail:locale-changed",function(event){
    var loc = event && event.detail && event.detail.locale;
    repaintingLocale = (loc === 'en' || loc === 'zh') ? loc : null;
    try { repaintLocale(); } finally { repaintingLocale = null; }
  });
  // 默认配比：雨 80、篝火 52、钢琴 40（用户点播放时若为空则用它）。
  levels.rain=0.80; levels.fire=0.52; levels.piano=0.40;
  paintCurrentMix();
  paintSession();
  setInterval(tickSession,250);
  listen(document,"visibilitychange",function(){
    if(!document.hidden){ tickSession(); armSessionGain(); }
  });

  /**
   * 登录/登出或权益变化后调用：按已拥有的包重算可玩通道，
   * 重建音源清单（levels/params/音频节点不受影响）。
   * 未登录时传 []，进阶通道重新上锁。
   */
  function setOwnedPacks(packIds){
    ownedSounds=new Set();
    (packIds||[]).forEach(function(packId){
      var pack=null;
      PACKS.forEach(function(p){ if(p.id===packId) pack=p; });
      (pack && pack.sounds || []).forEach(function(id){ ownedSounds.add(id); });
    });
    buildSources();
    paintCurrentMix();
  }


  /**
   * 语言切换时重绘引擎负责的全部文案：当前配比、我的配方、音源清单。
   * React 负责的静态文案由 useLocale 自行重渲染。
   * 只改文案，不碰 levels/params/音频节点和支付状态。
   * 配方名输入框：只有值还是上一个语言的自动建议时才跟随重生成；
   * 用户自己输入过的内容原样保留，绝不翻译。
   */
  var lastLocale=L();
  function repaintLocale(){
    var nm=$("recipeName");
    var oldAuto="";
    if(nm && nm.value){
      var top=topActive();
      if(top.length) oldAuto=autoRecipeName(top.map(function(s){ return { sound: s, level: levels[s.id] }; }), lastLocale);
    }
    paintCurrentMix();
    renderMine();
    buildSources();
    if(nm && oldAuto && nm.value===oldAuto){ var dn=defaultName(); if(dn) nm.value=dn; }
    lastLocale=L();
  }

  const api = {
    // The place player has its own clock. Relinquish all legacy audio before
    // it starts, including optional noise beds outside the recipe transport.
    pauseForScene() {
      if(!AC) return;
      if(playing) setPlaying(false);
      clearTimeout(stopVoicesTimer);
      if(sessionGain){
        sessionGain.gain.cancelScheduledValues(AC.currentTime);
        sessionGain.gain.setValueAtTime(0,AC.currentTime);
      }
      // The recipe sleep timer belongs to the recipe session: clear it when
      // the journey player takes over (it has its own timer).
      sleepDeadline=null; sleepChoice=0;
      if(sleepGain){
        sleepGain.gain.cancelScheduledValues(AC.currentTime);
        sleepGain.gain.setValueAtTime(1,AC.currentTime);
      }
      paintSession();
      SOUNDS.forEach(function(sound){ stopGen(sound.id); });
      Object.keys(bedNodes).forEach(stopBed);
    },
    setMix,
    playRecipe,
    showPremium,
    setOwnedPacks,
    /**
     * 订阅状态（登录/权益变化后由外壳调用）：订阅用户解锁全部通道、
     * 不限时收听、能用睡眠定时与保存配方。未登录/未订阅时传 false。
     */
    setSubscriber(value) {
      isSubscriber = !!value;
      buildSources();
      paintCurrentMix();
      armSessionGain();
      paintSession();
    },
    // Mixer sleep timer: setSleepTimer(ms) arms it (null clears), the
    // fade is the last 2 minutes; getSleepTimerRemaining() is ms or null.
    setSleepTimer,
    getSleepTimerRemaining() {
      return sleepRemainingMs(sleepDeadline, Date.now());
    },
    // Now-playing 条的暂停/继续：切换配方播放（免费窗口到期时返回 false）。
    togglePlaying() {
      return setPlaying(!playing);
    },
    /* 页面挂载时接 DOM：我的配方、音源清单。 */
    bindMine,
    unbindMine,
    bindSources,
    unbindSources,
    /* 落地页“存下配方”：不依赖保存框 DOM，直接存当前配比。 */
    saveMixAs(name) {
      return saveCurrentMix(name);
    },
    dispose() {
      disposed=true;
      scope.dispose();
      document.body.classList.remove("is-playing");
      if(labController===api) labController=null;
      if(AC && AC.state!=="closed") AC.close().catch(function(){});
    },
  };
  labController = api;
  return api;
}
