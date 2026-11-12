import { AUDIO_LICENSES, SOUND_AUDIO } from './audio/catalog.mjs'
import { prepareRecording, playInstrumentNote } from './audio/playback.mjs'
import { SOUNDS } from './catalog.mjs'
import { createSession, freeMix, isFreeSound } from './listening-session.mjs'
import { PACKS } from './packs.mjs'
import { createRuntimeScope } from './runtime-scope.mjs'

export function mountSoundLab({onFocusChange, onMixChange}) {
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

  var GROUPS = [
    { id:"nature", name:"自然", en:"NATURE" },
    { id:"city",   name:"场所", en:"PLACES" },
    { id:"inst",   name:"乐器", en:"INSTRUMENTS" }
  ];
  /* cat: nature 自然 / city 城市·乡村 / inst 乐器。p 为出厂参数（密度 density / 明亮度 bright / 远近 dist / 随机度 rand / 节奏 tempo） */
  /* Ingredients choose a clear drink tint together. Source colors stay on the faders. */
  var CUP_TINTS={
    amber:{colors:["#FFF1BD","#F4BE67","#CD7B36","#FFE09A"], garnish:"Lemon"},
    tide:{colors:["#E0F5EB","#A5D9CA","#69A69F","#C7EEE2"], garnish:"Mint"},
    green:{colors:["#F4F2C5","#C9D28E","#92AC65","#E8EBAF"], garnish:"Mint"},
    lilac:{colors:["#F6E5F0","#DAB9D9","#AC83AC","#F4D4E8"], garnish:"Cherry"},
    rose:{colors:["#FFE9CB","#F3B7A4","#D98B83","#FFDAC1"], garnish:"Lemon"}
  };
  var CUP_INGREDIENTS={
    rain:"tide", wind:"tide", waves:"tide", stream:"tide", rainstreet:"tide", chimes:"tide",
    birds:"green", insects:"green", rural:"green", forest:"green", boat:"tide",
    thunder:"lilac", train:"lilac",
    market:"rose", harp:"rose"
  };
  function cupMix(mix){
    var active=SOUNDS.filter(function(s){return mix[s.id]>0.02;}).sort(function(a,b){return mix[b.id]-mix[a.id];});
    var weight={amber:0,tide:0,green:0,lilac:0,rose:0};
    var total=0, density=0, brightness=0, tempo=0;
    active.forEach(function(s){
      var n=mix[s.id], p=params[s.id];
      weight[CUP_INGREDIENTS[s.id]||"amber"]+=n;
      total+=n;
      if(p){ density+=n*p.density; brightness+=n*p.bright; tempo+=n*p.tempo; }
    });
    var tint=Object.keys(weight).reduce(function(a,b){return weight[b]>weight[a]?b:a;});
    return {
      active:active, total:total, fill:Math.min(1,total/2.6), tint:tint,
      density:total?density/total:0, brightness:total?brightness/total:0.5, tempo:total?tempo/total:0.5
    };
  }
  function cupRGB(hex){return hex.match(/[0-9A-F]{2}/gi).map(function(part){return parseInt(part,16);});}
  function cupCSS(rgb){return "rgb("+rgb.map(Math.round).join(",")+")";}
  var MASTER_CAP = 0.85;

  /* ============================== state ============================== */
  var levels = {}; SOUNDS.forEach(function(s){ levels[s.id]=0; });
  /* per-sound synth params: density 密度 / bright 明亮度 / dist 远近 / rand 随机度 / tempo 节奏 */
  var PARAM_DEFS = [
    { k:"density", name:"密度" }, { k:"bright", name:"明亮度" }, { k:"dist", name:"远近" },
    { k:"rand", name:"随机度" }, { k:"tempo", name:"节奏" }
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
  // “能不能用” = 免费通道 或 已拥有包里的通道；引擎里所有
  // sessionTools.isFreeSound / freeMix 的调用点都走这两个包装，
  // 所以解锁后推子、配方、随机、音源替换全部自动放行。
  var ownedSounds = new Set();
  function isPlayable(id){ return isFreeSound(id) || ownedSounds.has(id); }
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
  function toast(msg){
    var t=$("toast"); t.textContent=msg; t.classList.add("show");
    clearTimeout(t._h); t._h=setTimeout(function(){ t.classList.remove("show"); },2600);
  }

  /* ============================== audio engine ============================== */
  var AC=null, master=null, transport=null, sessionGain=null, masterAnalyser=null;
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
    sessionGain=AC.createGain(); sessionGain.gain.value=0; sessionGain.connect(master);
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

  /* ============================== faders UI ============================== */
  var faderEls={};
  var soundFilter="all";
  function updateSoundFilter(){
    var visible=0;
    SOUNDS.forEach(function(s){
      var ui=faderEls[s.id];
      if(!ui) return;
      var show=soundFilter==="all" || s.cat===soundFilter || (soundFilter==="active" && levels[s.id]>.02);
      ui.root.hidden=!show;
      if(show) visible++;
    });
    $("faders").querySelectorAll(".chan-group").forEach(function(group){
      group.hidden=!group.querySelector(".chan:not([hidden])");
    });
    $("emptyFilter").hidden=visible!==0;
  }
  $("soundFilters").addEventListener("click",function(event){
    var button=event.target.closest("[data-filter]");
    if(!button) return;
    soundFilter=button.dataset.filter;
    this.querySelectorAll("button").forEach(function(item){
      item.classList.toggle("on",item===button);
      item.setAttribute("aria-pressed",String(item===button));
    });
    updateSoundFilter();
  });
  function buildFaders(){
    // 可重复调用：解锁/登出时重建推子，旧节点先清掉（levels/params 在模块状态里，不受影响）。
    var wrap=$("faders");
    wrap.textContent="";
    faderEls={};
    GROUPS.forEach(function(g){
      var groupSounds=SOUNDS.filter(function(s){ return s.cat===g.id; });
      var sec=document.createElement("div"); sec.className="chan-group";
      sec.innerHTML='<div class="chan-group-head"><h3>'+g.name+'</h3><span class="en">'+g.en+'</span><span class="cnt">'+groupSounds.length+' 种 · 点「调音参数」细调每种音色</span></div>';
      var grid=document.createElement("div"); grid.className="faders";
      sec.appendChild(grid); wrap.appendChild(sec);
      groupSounds.forEach(function(s){
        var premium=!sessionTools.isFreeSound(s.id);
        var el=document.createElement("div");
        el.className=premium ? "chan chan-premium" : "chan";
        el.style.setProperty("--cc", s.color);
        var paramsHTML="";
        PARAM_DEFS.forEach(function(pd){
          paramsHTML+='<div class="param-row"><label for="prm-'+s.id+'-'+pd.k+'">'+pd.name+'</label>'+
            '<input type="range" id="prm-'+s.id+'-'+pd.k+'" min="0" max="100" value="'+Math.round(params[s.id][pd.k]*100)+'" data-param="'+pd.k+'" aria-label="'+s.name+pd.name+'">'+
            '<span class="pv" data-pv="'+pd.k+'">'+Math.round(params[s.id][pd.k]*100)+'</span></div>';
        });
        el.innerHTML =
          '<div class="c-icon">'+ICONS[s.id]+'</div>'+
          '<div><div class="c-name">'+s.name+'</div><div class="c-en">'+s.en+'</div></div>'+
          '<span class="src-badge" data-cardbadge="'+s.id+'"></span>'+
          '<div class="fader-zone"><div class="fader" role="slider" tabindex="0" aria-label="'+s.name+'音量" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">'+
            '<div class="ticks"><i></i><i></i><i></i><i></i><i></i><i class="r" style="top:0"></i><i class="r" style="top:25%"></i><i class="r" style="top:50%"></i><i class="r" style="top:75%"></i><i class="r" style="bottom:0;top:auto"></i></div>'+
            '<div class="slot"><div class="fill"></div></div>'+
            '<div class="handle"></div>'+
          '</div><div class="meter"><i></i></div></div>'+
          '<div class="c-pct">静音</div>'+
          '<button class="tune-toggle" data-tune="'+s.id+'" aria-expanded="false">调音参数 ▾</button>'+
          '<div class="params" data-params="'+s.id+'">'+paramsHTML+'</div>';
        grid.appendChild(el);
        var fader=el.querySelector(".fader");
        faderEls[s.id]={ root:el, fader:fader, fill:el.querySelector(".fill"), handle:el.querySelector(".handle"), pct:el.querySelector(".c-pct"), meter:el.querySelector(".meter i") };
        var toggle=el.querySelector("[data-tune]");
        var panel=el.querySelector("[data-params]");
        if(premium){
          fader.tabIndex=-1;
          fader.setAttribute("aria-disabled","true");
          panel.remove();
          toggle.textContent="了解进阶音效";
          toggle.removeAttribute("aria-expanded");
          toggle.addEventListener("click",function(){ showPremium(s.name); });
          return;
        }
        bindFader(s.id, fader);
        toggle.addEventListener("click", function(){
          var open=panel.classList.toggle("open");
          toggle.setAttribute("aria-expanded",String(open));
          toggle.textContent=open ? "调音参数 ▴" : "调音参数 ▾";
        });
        panel.querySelectorAll("[data-param]").forEach(function(inp){
          inp.addEventListener("input",function(){
            var k=this.getAttribute("data-param");
            params[s.id][k]=this.value/100;
            panel.querySelector('[data-pv="'+k+'"]').textContent=this.value;
            applyParams(s.id);
          });
        });
        updateSourceUI(s.id);
      });
    });
  }
  /* repaint one sound's param sliders (after a recipe is applied / imported) */
  function paintParams(id){
    var panel=document.querySelector('[data-params="'+id+'"]');
    if(!panel) return;
    panel.querySelectorAll("[data-param]").forEach(function(inp){
      var k=inp.getAttribute("data-param");
      inp.value=Math.round(params[id][k]*100);
      panel.querySelector('[data-pv="'+k+'"]').textContent=inp.value;
    });
  }
  function applyParamsMap(map){
    if(!map) return;
    Object.keys(map).forEach(function(id){
      if(!params[id] || !map[id]) return;
      PARAM_DEFS.forEach(function(d){ if(typeof map[id][d.k]==="number") params[id][d.k]=clamp01(map[id][d.k]); });
      paintParams(id); applyParams(id);
    });
  }
  function bindFader(id, fader){
    /* v2 damped fader: display chases target with inertia; release springs back a touch */
    var target=levels[id], raf=null, vel=0;
    function chase(){
      var cur=levels[id];
      var diff=target-cur;
      vel=vel*0.62+diff*0.34;
      var next=clamp01(cur+vel);
      if(Math.abs(diff)<0.002 && Math.abs(vel)<0.002){ setLevel(id, target); raf=null; return; }
      setLevel(id, next);
      raf=requestAnimationFrame(chase);
    }
    function kick(){ if(!raf) raf=requestAnimationFrame(chase); }
    function fromEvent(e){
      var r=fader.getBoundingClientRect();
      target=clamp01(1-(e.clientY-r.top)/r.height);
      kick();
    }
    fader.addEventListener("pointerdown", function(e){
      e.preventDefault(); fader.setPointerCapture(e.pointerId); fromEvent(e);
      function mv(ev){ fromEvent(ev); }
      function up(){
        fader.removeEventListener("pointermove",mv); fader.removeEventListener("pointerup",up); fader.removeEventListener("pointercancel",up);
        /* micro rebound: overshoot 1.5% then settle */
        var settled=target; target=clamp01(settled+(settled-levels[id])*0.12); kick();
        setTimeout(function(){ target=settled; kick(); },90);
      }
      fader.addEventListener("pointermove",mv);
      fader.addEventListener("pointerup",up);
      fader.addEventListener("pointercancel",up);
    });
    fader.addEventListener("keydown", function(e){
      var v=levels[id], used=true;
      if(e.key==="ArrowUp"||e.key==="ArrowRight") v+=0.05;
      else if(e.key==="ArrowDown"||e.key==="ArrowLeft") v-=0.05;
      else if(e.key==="Home") v=1;
      else if(e.key==="End") v=0;
      else used=false;
      if(used){ e.preventDefault(); setLevel(id, clamp01(v)); }
    });
    fader.addEventListener("wheel", function(e){
      e.preventDefault();
      setLevel(id, clamp01(levels[id] + (e.deltaY<0?0.05:-0.05)));
    }, {passive:false});
  }
  var mixFrame=0;
  function setLevel(id, v){
    if(!sessionTools.isFreeSound(id)) return;
    cancelAnimationFrame(mixFrame);
    activeScene=null;
    levels[id]=clamp01(v);
    paintFader(id);
    applyGain(id);
    updateMasterGain();
    scheduleGlass();
    paintCurrentMix();
  }
  function paintFader(id){
    var ui=faderEls[id]; if(!ui) return;
    var v=levels[id], pct=Math.round(v*100);
    ui.root.classList.toggle("off", v<=0.001);
    ui.fill.style.height=(v*100)+"%";
    ui.handle.style.bottom=(v*100)+"%";
    ui.fader.setAttribute("aria-valuenow", pct);
    ui.pct.innerHTML = !sessionTools.isFreeSound(id) ? "进阶" : v<=0.001 ? "静音" : ("音量 <b>"+pct+"</b>");
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
        paintFader(s.id);
        applyGain(s.id);
      });
      updateMasterGain();
      scheduleGlass();
      paintCurrentMix();
      if(p<1) mixFrame=requestAnimationFrame(frame);

    }
    mixFrame=requestAnimationFrame(frame);
  }

  /* Watercolor cup: continuous fill, quiet meniscus and one coordinated tint. */
  var CUP_BOWL_BOTTOM=204, CUP_BOWL_TOP=82;
  var WC_REDUCED=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cupState={total:0, fill:0, tint:"amber", density:0, brightness:.5, tempo:.5};
  var cupLevel=CUP_BOWL_BOTTOM, cupLevelSpeed=0, cupTilt=0, cupTiltSpeed=0, cupPhase=0;
  var cupMotion=0, cupIce=0, cupCondensation=0, cupDirty=true, cupLastFrame=0;
  var currentCupColors=CUP_TINTS.amber.colors.map(cupRGB);
  var cupTargets=currentCupColors;
  var cupGarnishes=["Lemon","Mint","Cherry"].map(function(name){
    return {name:name, el:$("wcGar"+name), opacity:0};
  });
  var cupNodes={
    pour:$("wcPour"), liquid:$("wcLiquid"), wash:$("wcLiquidWash"), surface:$("wcSurface"),
    edge:$("wcSurfaceEdge"), swing:$("wcSway"), condensation:$("wcCondG"),
    stops:[$("wcLiquidTop"),$("wcLiquidMiddle"),$("wcLiquidBottom")],
    ice:$("wcIceG"), bubbles:$("wcBubbleG").children
  };
  var glassQueued=false;
  function scheduleGlass(){
    if(glassQueued) return;
    glassQueued=true;
    requestAnimationFrame(function(){glassQueued=false; renderGlass();});
  }
  function renderGlass(){
    var previousTotal=cupState.total;
    cupState=cupMix(levels);
    if(!WC_REDUCED) cupTiltSpeed+=Math.max(-16,Math.min(16,(cupState.total-previousTotal)*14));
    var tint=CUP_TINTS[cupState.tint];
    cupTargets=tint.colors.map(cupRGB);
    var white=.14*cupState.brightness;
    cupTargets=cupTargets.map(function(rgb){
      return rgb.map(function(channel){return channel+(255-channel)*white;});
    });
    $("glassEmpty").hidden=Boolean(cupState.active.length);
    var names=cupState.active.slice(0,3).map(function(sound){ return sound.name; });
    var caption=names.length ? names.join(" · ")+(cupState.active.length>3?" 等 "+cupState.active.length+" 种":"") : "这杯还空着";
    $("glassCap").textContent=caption;
    $("mixerCupName").textContent=caption;
    $("ckScene").style.setProperty("--ck-glow",tint.colors[1]);
    if(soundFilter==="active") updateSoundFilter();
    if(onMixChange){
      onMixChange(cupState.active.slice(0,3).map(function(sound){ return sound.color; }),8-cupState.tempo*4);
    }
    if($("immersive").classList.contains("open")) renderImmersive();
    cupDirty=true;
  }

  /* Find the liquid's width against the cubic left wall of the glass. */
  function cupHalfWidth(y){
    var lo=0, hi=1;
    for(var i=0;i<12;i++){
      var t=(lo+hi)*.5, u=1-t;
      var wallY=78*u*u*u+384*u*u*t+603*u*t*t+204*t*t*t;
      if(wallY<y) lo=t; else hi=t;
    }
    var p=(lo+hi)*.5, q=1-p;
    return 160-(49*q*q*q+159*q*q*p+285*q*p*p+160*p*p*p);
  }
  function paintCupLiquid(y, ripple){
    var width=cupHalfWidth(y);
    var depth=Math.min(width*.135,(CUP_BOWL_BOTTOM-y)*.46);
    var left=160-width-1, right=160+width+1;
    var yLeft=y+ripple, yRight=y-ripple;
    var front="M"+left+" "+yLeft+" C"+left+" "+(yLeft+depth)+" "+right+" "+(yRight+depth)+" "+right+" "+yRight;
    var back=" C"+right+" "+(yRight-depth)+" "+left+" "+(yLeft-depth)+" "+left+" "+yLeft+" Z";
    var body=front+" V205 H"+left+" Z";
    cupNodes.liquid.setAttribute("d",body);
    cupNodes.wash.setAttribute("d",body);
    cupNodes.surface.setAttribute("d",front+back);
    cupNodes.edge.setAttribute("d",front);
    return width;
  }
  function easeCupFrame(now){
    requestAnimationFrame(easeCupFrame);
    var dt=Math.min(.05,cupLastFrame?(now-cupLastFrame)/1000:.016);
    cupLastFrame=now;
    var animating=playing&&!WC_REDUCED&&cupState.fill>0;
    if(!cupDirty&&!animating) return;
    var target=CUP_BOWL_BOTTOM-cupState.fill*(CUP_BOWL_BOTTOM-CUP_BOWL_TOP);
    var f=WC_REDUCED?1:1-Math.exp(-dt/.22);
    if(WC_REDUCED){
      cupLevel=target;
    }else{
      cupLevelSpeed+=((target-cupLevel)*33-10*cupLevelSpeed)*dt;
      cupLevel+=cupLevelSpeed*dt;
      cupTiltSpeed+=(-24*cupTilt-6*cupTiltSpeed)*dt;
      cupTilt=Math.max(-3.2,Math.min(3.2,cupTilt+cupTiltSpeed*dt));
    }
    var motionTarget=animating?1:0;
    cupMotion+=(motionTarget-cupMotion)*f;
    cupPhase+=dt*(.75+cupState.tempo*.75)*cupMotion;
    var garnish=CUP_TINTS[cupState.tint].garnish;
    var iceTarget=cupState.fill>.22?.85:0;
    var condTarget=cupState.fill>.22&&cupState.tint==="tide"?.67:0;
    cupIce+=(iceTarget-cupIce)*f;
    cupCondensation+=(condTarget-cupCondensation)*f;
    cupDirty=Math.abs(cupLevel-target)>.025||Math.abs(cupLevelSpeed)>.045||
      Math.abs(cupTilt)>.025||Math.abs(cupTiltSpeed)>.045||Math.abs(cupMotion-motionTarget)>.01||
      Math.abs(cupIce-iceTarget)>.01||Math.abs(cupCondensation-condTarget)>.01;
    cupGarnishes.forEach(function(g){
      var alpha=cupState.fill>0&&g.name===garnish?1:0;
      g.opacity+=(alpha-g.opacity)*f;
      g.el.setAttribute("opacity",g.opacity.toFixed(3));
      if(Math.abs(g.opacity-alpha)>.008) cupDirty=true;
    });
    currentCupColors=currentCupColors.map(function(rgb,i){
      var next=rgb.map(function(channel,j){
        var goal=cupTargets[i][j];
        if(Math.abs(goal-channel)>.28) cupDirty=true;
        return channel+(goal-channel)*f;
      });
      var value=cupCSS(next);
      if(i<3) cupNodes.stops[i].setAttribute("stop-color",value);
      else cupNodes.surface.setAttribute("fill",value);
      return next;
    });
    cupNodes.swing.setAttribute("transform","rotate("+cupTilt.toFixed(3)+" 160 319)");
    cupNodes.condensation.setAttribute("opacity",cupCondensation.toFixed(3));

    var y=Math.max(CUP_BOWL_TOP,Math.min(CUP_BOWL_BOTTOM,cupLevel));
    var height=CUP_BOWL_BOTTOM-y;
    cupNodes.pour.setAttribute("visibility",height>.2?"visible":"hidden");
    if(height<=.2) return;
    var ripple=cupTilt*.75+Math.sin(cupPhase)*1.25*cupMotion;
    var width=paintCupLiquid(y,ripple);
    cupNodes.ice.setAttribute("opacity",cupIce.toFixed(3));
    Array.prototype.forEach.call(cupNodes.ice.children,function(ice,i){
      var x=160+width*(i? .25:-.38);
      var bob=Math.sin(cupPhase+i*1.7)*1.15*cupMotion;
      ice.setAttribute("transform","translate("+x+" "+(y+4+i*3+bob)+") rotate("+(i?12:-12)+")");
    });
    Array.prototype.forEach.call(cupNodes.bubbles,function(bubble,i){
      var progress=(cupPhase*.23+(i+1)*.37)%1;
      var bx=160+width*(i-2)*.22*(.4+progress*.6);
      var by=y+height*(.83-progress*.7);
      var opacity=Math.min(1,progress*5,(1-progress)*5)*(.24+cupState.density*.28);
      bubble.setAttribute("cx",bx.toFixed(2));
      bubble.setAttribute("cy",by.toFixed(2));
      bubble.setAttribute("opacity",(height<14?0:opacity).toFixed(3));
    });
  }
  requestAnimationFrame(easeCupFrame);

  (function bindCupSway(){
    var stage=$("cupStage");
    if(WC_REDUCED) return;
    var pointer=null, x=0;
    stage.addEventListener("pointerdown",function(event){
      if(event.button!==0||pointer!==null) return;
      pointer=event.pointerId;
      x=event.clientX;
      stage.setPointerCapture(pointer);
    });
    stage.addEventListener("pointermove",function(event){
      if(event.pointerId!==pointer) return;
      cupTiltSpeed+=Math.max(-10,Math.min(10,(event.clientX-x)*.34));
      x=event.clientX;
      cupDirty=true;
    });
    stage.addEventListener("lostpointercapture",function(){pointer=null;});
  })();

  function paintCurrentMix(){
    var active=SOUNDS.filter(function(s){ return levels[s.id]>0.02; });
    var box=$("currentMix");
    if(!active.length){ box.textContent="当前配比：还没有拉动任何推子。"; return; }
    box.innerHTML="当前配比："+active.map(function(s){ return s.name+" "+Math.round(levels[s.id]*100); }).join(" · ");
    /* save name pre-filled from the dominant sounds (Noisli model:
       one tap to save, never a blank form) */
    var nm=$("recipeName"); if(nm && !nm.value.trim()){ var dn=defaultName(); if(dn) nm.value=dn; }
  }

  /* ============================== meters ============================== */
  var meterData=new Uint8Array(128);
  function meterLoop(){
    requestAnimationFrame(meterLoop);
    if(!AC || !playing) {
      SOUNDS.forEach(function(s){ if(faderEls[s.id]) faderEls[s.id].meter.style.transform="scaleY(0)"; });
      return;
    }
    SOUNDS.forEach(function(s){
      var ch=chans[s.id]; if(!ch) return;
      ch.analyser.getByteTimeDomainData(meterData);
      var sum=0; for(var i=0;i<meterData.length;i++){ var d=(meterData[i]-128)/128; sum+=d*d; }
      var rms=Math.sqrt(sum/meterData.length);
      var m=Math.min(1, rms*4.2)*(levels[s.id]>0.02?1:0);
      faderEls[s.id].meter.style.transform="scaleY("+m.toFixed(3)+")";
    });
  }

  /* ============================== transport ============================== */
  var ICON_PLAY='<path d="M8 5.5v13l11-6.5z"/>';
  var ICON_PAUSE='<path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/>';
  var stopVoicesTimer;
  function fmtTime(seconds){
    var minutes=Math.floor(seconds/60), rest=seconds%60;
    return String(minutes).padStart(2,"0")+":"+String(rest).padStart(2,"0");
  }
  function armSessionGain(){
    if(!sessionGain) return;
    var remaining=session.remaining()||0, now=AC.currentTime;
    var gain=sessionGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(Math.min(1,remaining/5000),now);
    if(remaining>5000) gain.setValueAtTime(1,now+(remaining-5000)/1000);
    if(remaining>0) gain.linearRampToValueAtTime(0,now+remaining/1000);
  }
  function paintSession(){
    var remaining=session.remaining();
    var display=fmtTime(remaining===null ? 600 : Math.ceil(remaining/1000));
    ["focusRead","immFocus"].forEach(function(id){
      var el=$(id);
      if(el.textContent!==display) el.textContent=display;
    });
  }
  function tickSession(){
    paintSession();
    if(session.remaining()!==0 || (!playing && !Object.keys(bedNodes).length)) return;
    replayMix=playing;
    replayBeds=Object.keys(bedNodes);
    armSessionGain();
    if(playing) setPlaying(false);
    replayBeds.forEach(stopBed);
    showSessionDone();
  }
  function openListeningWindow(){
    if(session.remaining()!==0){
      try{ ensureCtx(); }
      catch(error){ toast("浏览器暂时无法播放声音"); return false; }
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
    clearTimeout(stopVoicesTimer);
    playing=on;
    var t=AC.currentTime, envelope=transport.gain;
    updateMasterGain();
    if(envelope.cancelAndHoldAtTime) envelope.cancelAndHoldAtTime(t);
    else {
      var value=envelope.value;
      envelope.cancelScheduledValues(t);
      envelope.setValueAtTime(value,t);
    }
    envelope.linearRampToValueAtTime(on ? 1 : 0,t+(on ? 3 : 5));
    if(on){
      AC.resume().catch(function(){ toast("浏览器暂时无法播放声音"); });
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
    $("playIcon").innerHTML=playing ? ICON_PAUSE : ICON_PLAY;
    $("playBtn").setAttribute("aria-label",playing ? "暂停" : "播放");
    $("ctaPlay").textContent=playing ? "⏸ 暂停这一杯" : "▶ 自己调一杯";
    $("immPlay").textContent=playing ? "暂停" : "继续播放";
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
  $("playBtn").addEventListener("click",function(){ setPlaying(!playing); });
  $("ctaPlay").addEventListener("click",function(){
    if(setPlaying(!playing)) $("mixer").scrollIntoView({behavior:"smooth"});
  });
  $("masterVol").addEventListener("input",function(){
    masterVol=Math.min(MASTER_CAP,this.value/100);
    updateMasterGain();
  });
  $("clearBtn").addEventListener("click",function(){
    activeScene=null;
    tweenTo({});
    toast("全部归零，安静了");
  });
  $("randomBtn").addEventListener("click",function(){
    var pool=SOUNDS.filter(function(sound){ return sessionTools.isFreeSound(sound.id); });
    var picks=[], n=2+Math.floor(Math.random()*3);
    for(var i=0;i<n;i++){ picks.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); }
    var mix={};
    picks.forEach(function(sound){ mix[sound.id]=.3+Math.random()*.6; });
    if(playMix(mix)) toast("随机一杯："+picks.map(function(sound){ return sound.name; }).join(" + "));
  });

  /* ============================== recipes ============================== */
  function mixBarHTML(mix){
    var total=Object.keys(mix).reduce(function(a,k){ return a+mix[k]; },0);
    var bars="", legend="";
    Object.keys(mix).forEach(function(id){
      var s=soundById(id); if(!s) return;
      bars+='<i style="background:'+s.color+';width:'+(mix[id]/total*100)+'%"></i>';
      legend+='<span><i style="background:'+s.color+'"></i>'+s.name+" "+Math.round(mix[id]*100)+"</span>";
    });
    return '<div class="mixbar">'+bars+'</div><div class="mix-legend">'+legend+'</div>';
  }
  function chooseScene(scene){
    if(!playMix(scene.mix,scene)){
      pendingScene=scene;
      return;
    }
    pendingScene=null;
    enterImmersive();
  }

  function playSavedMix(recipe){
    var mix=sessionTools.freeMix(recipe.mix);
    if(!Object.values(mix).some(function(level){ return level>.02; })){
      showPremium(recipe.name);
      return false;
    }
    if(!playMix(mix)) return false;
    if(recipe.params) applyParamsMap(recipe.params);
    var hasPremium=Object.keys(recipe.mix).some(function(id){
      return recipe.mix[id]>.02 && !sessionTools.isFreeSound(id);
    });
    $("mixer").scrollIntoView({behavior:"smooth"});
    toast(hasPremium ? "已调出基础音效，配方中的进阶音效已保留" : "已调出「"+recipe.name+"」");
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
    return { name:typeof payload.n==="string" ? (payload.n.trim().slice(0,32)||"朋友的配方") : "朋友的配方", mix:mix, params:prm };
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
      try{ document.execCommand("copy"); done(); }catch(e){ toast("复制失败，请长按手动复制"); }
      document.body.removeChild(ta);
    }
  }
  function defaultName(){
    var active=SOUNDS.filter(function(s){ return levels[s.id]>0.02; })
      .sort(function(a,b){ return levels[b.id]-levels[a.id]; }).slice(0,2);
    if(!active.length) return "";
    return active.map(function(s){ return s.name; }).join(" + ")+" 之夜";
  }
  $("saveBtn").addEventListener("click", function(){
    var active=SOUNDS.filter(function(s){ return levels[s.id]>0.02; });
    if(!active.length){ toast("先拉几格推子，再保存这一杯"); return; }
    var name=$("recipeName").value.trim() || defaultName();
    var mix={}; active.forEach(function(s){ mix[s.id]=levels[s.id]; });
    var prm={}; active.forEach(function(s){ var o={}; PARAM_DEFS.forEach(function(d){ o[d.k]=params[s.id][d.k]; }); prm[s.id]=o; });
    myRecipes.unshift({ name:name, mix:mix, params:prm, at:new Date() });
    $("recipeName").value="";
    renderMine();
    toast(persistRecipes() ? "已保存「"+name+"」" : "已保存到当前页面，浏览器存储不可用");
  });
  function renderMine(){
    var list=$("mineList");
    if(!myRecipes.length){
      list.innerHTML='<div class="empty-note-2">还没有存过配方。<br />去调音台拉几格推子，调到「就是这个感觉」，再回来存下它。</div>';
      return;
    }
    list.innerHTML="";
    myRecipes.forEach(function(r, idx){
      var item=document.createElement("div"); item.className="mine-item";
      var timeStr=r.at.toLocaleDateString("zh-CN",{month:"short",day:"numeric"})+" "+
        r.at.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false});
      item.innerHTML='<div class="top"><h4>'+escapeHtml(r.name)+'</h4><time>'+timeStr+'</time></div>'+
        mixBarHTML(r.mix)+
        '<div class="ops">'+
          '<button class="op-btn solid" data-op="apply">调出这杯</button>'+
          '<button class="op-btn" data-op="card">分享卡</button>'+
          '<button class="op-btn" data-op="code">复制配方码</button>'+
          '<button class="op-btn danger" data-op="del">删除</button>'+
        "</div>";
      item.querySelectorAll("[data-op]").forEach(function(b){
        b.addEventListener("click", function(){
          var op=b.getAttribute("data-op");
          if(op==="apply") playSavedMix(r);
          if(op==="code"){ copyText(encodeRecipe(r.name, r.mix, r.params), "配方码已复制，发给朋友就能调出同款（连每味原料的参数一起）"); }
          if(op==="card"){ drawShareCard(r); }
          if(op==="del"){ myRecipes.splice(idx,1); persistRecipes(); renderMine(); toast("已删除「"+r.name+"」"); }
        });
      });
      list.appendChild(item);
    });
  }
  function escapeHtml(s){ return s.replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  $("importBtn").addEventListener("click", function(){
    var code=$("importCode").value.trim();
    if(!code){ toast("先粘贴配方码"); return; }
    try{
      var r=decodeRecipe(code);
      if(!Object.keys(r.mix).length) throw new Error("empty");
      myRecipes.unshift({ name:r.name, mix:r.mix, params:r.params, at:new Date() });
      persistRecipes();
      renderMine();
      $("importCode").value="";
      playSavedMix(r);
    }catch(e){
      toast("这个配方码读不出来，检查一下有没有复制完整");
    }
  });

  /* share card */
  function drawShareCard(r){
    var c=document.createElement("canvas"); c.width=900; c.height=1160;
    var x=c.getContext("2d");
    var grd=x.createLinearGradient(0,0,0,1160);
    grd.addColorStop(0, "#fff6e7"); grd.addColorStop(1, "#f3e5e1");
    x.fillStyle=grd; x.fillRect(0,0,900,1160);
    x.fillStyle= "#352a28";
    x.font="600 30px Manrope,sans-serif"; x.fillText("声 音 实 验 室", 70, 105);
    x.font="500 24px Manrope,sans-serif"; x.fillStyle= "#705e56";
    x.fillText("mix your own cup of sound", 70, 148);
    x.font="600 72px Manrope,sans-serif"; x.fillStyle= "#352a28";
    wrapText(x, r.name, 70, 280, 760, 92, 2);
    var gx=270, gy=420, gw=360, bowlBot=gy+218;
    var look=cupMix(r.mix), colors=CUP_TINTS[look.tint].colors;
    var liqH=196*look.fill, y=bowlBot-5-liqH;
    var half=gw*.5*cupHalfWidth(CUP_BOWL_BOTTOM-look.fill*(CUP_BOWL_BOTTOM-CUP_BOWL_TOP))/111;
    function bowlPath(){
      x.beginPath();
      x.moveTo(gx, gy);
      x.bezierCurveTo(gx+6, gy+150, gx+92, gy+212, gx+gw/2, bowlBot);
      x.bezierCurveTo(gx+gw-92, gy+212, gx+gw-6, gy+150, gx+gw, gy);
      x.closePath();
    }
    x.save(); bowlPath(); x.clip();
    if(liqH>0){
      var grd2=x.createLinearGradient(0,y,0,bowlBot);
      grd2.addColorStop(0,colors[0]); grd2.addColorStop(.53,colors[1]); grd2.addColorStop(1,colors[2]);
      x.globalAlpha=.86; x.fillStyle=grd2; x.fillRect(gx,y,gw,bowlBot-y);
      x.globalAlpha=.86; x.fillStyle=colors[3]; x.strokeStyle="rgba(255,250,222,.85)"; x.lineWidth=2.1;
      x.beginPath(); x.ellipse(gx+gw*.5,y,half,half*.1,0,0,Math.PI*2); x.fill(); x.stroke();
      x.globalAlpha=1;
    }
    var sh=x.createLinearGradient(gx,gy,gx+gw,bowlBot);
    sh.addColorStop(0,"rgba(255,255,255,.26)"); sh.addColorStop(.4,"rgba(255,255,255,0)");
    x.fillStyle=sh; x.fillRect(gx,gy,gw,bowlBot-gy);
    x.restore();
    x.strokeStyle="#66878b"; x.lineWidth=4;
    bowlPath(); x.stroke();
    x.beginPath(); x.ellipse(gx+gw/2,gy,gw/2,16,0,0,Math.PI*2); x.stroke();
    x.lineWidth=10;
    x.beginPath(); x.moveTo(gx+gw/2-4, bowlBot+4); x.lineTo(gx+gw/2-3, bowlBot+96); x.stroke();
    x.beginPath(); x.moveTo(gx+gw/2-70, bowlBot+108); x.lineTo(gx+gw/2+70, bowlBot+108); x.stroke();
    /* ingredient list */
    x.font="500 32px 'Noto Sans SC',sans-serif";
    var ly=900;
    look.active.slice(0,4).forEach(function(s){
      var id=s.id;
      x.fillStyle=s.color; x.fillRect(70, ly-26, 26, 26);
      x.fillStyle= "#352a28";
      x.fillText(s.name+"  "+Math.round(r.mix[id]*100), 116, ly);
      ly+=52;
    });
    x.font="700 30px 'Noto Serif SC',serif"; x.fillStyle= "#9d5225";
    x.fillText("自己调一杯声音", 70, 1090);
    var a=document.createElement("a");
    a.download="Sound-Cocktail-"+r.name+".png";
    a.href=c.toDataURL("image/png");
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast("分享卡已生成，正在下载");
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
    $("premiumMessage").textContent="「"+name+"」属于进阶内容。进阶版正在筹备中。";
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
    exitImmersive();
    $("mine").scrollIntoView({behavior:"smooth"});
    $("recipeName").focus({preventScroll:true});
  });
  document.querySelectorAll("[data-see-plus]").forEach(function(button){
    button.addEventListener("click",function(){
      button.closest("dialog").close();
      exitImmersive();
      $("plus").scrollIntoView({behavior:"smooth"});
    });
  });

  var stageHome=null, immersiveTrigger=null;
  function setBackgroundInert(inert){
    document.querySelectorAll("main,.topbar").forEach(function(section){
      section.inert=inert;
      if(inert) section.setAttribute("aria-hidden","true");
      else section.removeAttribute("aria-hidden");
    });
  }
  function renderImmersive(){
    var holder=$("immScene"), stage=$("cupStage");
    if(!stageHome) stageHome={parent:stage.parentNode,next:stage.nextSibling};
    if(stage.parentNode!==holder) holder.appendChild(stage);
    var active=SOUNDS.filter(function(s){ return levels[s.id]>.02; })
      .sort(function(a,b){ return levels[b.id]-levels[a.id]; });
    for(var i=0;i<3;i++){
      var color="--c"+(i+1);
      if(active[i]) $("immFlow").style.setProperty(color,active[i].color);
      else $("immFlow").style.removeProperty(color);
    }
    $("immTitle").textContent=activeScene ? activeScene.name :
      active.length ? active.slice(0,3).map(function(s){ return s.name; }).join(" + ") : "今晚这一杯";
    $("immSub").textContent=activeScene ? activeScene.desc : "留一点时间给手上的事。";
  }
  function enterImmersive(){
    if(!setPlaying(true)) return;
    showImmersive();
    onFocusChange(true);
  }
  function showImmersive(){
    var el=$("immersive");
    if(el.classList.contains("open")) return;
    immersiveTrigger=document.activeElement;
    renderImmersive();
    el.classList.add("open");
    el.setAttribute("aria-hidden","false");
    document.body.classList.add("is-immersive");
    $("immPlay").textContent=playing ? "暂停" : "继续播放";
    $("immPlay").focus({preventScroll:true});
    setBackgroundInert(true);
  }
  function exitImmersive(notify=true){
    var el=$("immersive");
    if(!el.classList.contains("open")) return;
    var stage=$("cupStage");
    if(stageHome && stage.parentNode!==stageHome.parent) stageHome.parent.insertBefore(stage,stageHome.next);
    el.classList.remove("open");
    el.setAttribute("aria-hidden","true");
    document.body.classList.remove("is-immersive");
    setBackgroundInert(false);
    if(immersiveTrigger) immersiveTrigger.focus({preventScroll:true});
    if(notify) onFocusChange(false);
  }
  $("immersiveBtn").addEventListener("click",enterImmersive);
  $("ctaImmersive").addEventListener("click",enterImmersive);
  $("immExit").addEventListener("click",function(){
    exitImmersive();
    $("mixer").scrollIntoView({behavior:"smooth"});
    $("playBtn").focus({preventScroll:true});
  });
  $("immPlay").addEventListener("click",function(){ setPlaying(!playing); });
  setInterval(function(){ if($("immersive").classList.contains("open")) renderImmersive(); },1000);

  function updateSourceUI(id){
    var meta=SOUND_AUDIO[id], entry=recordings[id];
    var label="实时合成";
    if(entry && entry.custom) label="本地录音";
    else if(entry && entry.loading) label="载入音源中";
    else if(meta && location.protocol!=="file:" && !(entry && entry.failed)) label=meta.roots ? "乐器采样" : "现场录音";
    document.querySelectorAll('[data-srcbadge="'+id+'"],[data-cardbadge="'+id+'"]').forEach(function(badge){
      badge.textContent=label;
      badge.classList.toggle("real",label==="现场录音" || label==="乐器采样" || label==="本地录音");
    });
    var usesLoop=label==="现场录音" || label==="本地录音" || (label==="载入音源中" && meta && !meta.roots);
    ["density","rand"].forEach(function(key){
      var input=$("prm-"+id+"-"+key);
      if(input) input.parentElement.hidden=usesLoop;
    });
  }

  function buildSources(){
    var wrap=$("srcList");
    wrap.textContent="";
    SOUNDS.forEach(function(s){
      var meta=SOUND_AUDIO[s.id];
      var item=document.createElement("div"); item.className="src-item";
      var details=meta ? '<a href="'+meta.source+'" target="_blank" rel="noopener">'+meta.title+'</a> · '+meta.author+
        (meta.editor ? ' · '+meta.editor+' 编辑或提供' : '')+
        ' · <a href="'+AUDIO_LICENSES[meta.license]+'" target="_blank" rel="noopener">'+meta.license+'</a>' :
        '由 Sound Cocktail 实时合成';
      if(meta && meta.related){
        var original=meta.related;
        details+='<br>原始录音：<a href="'+original.source+'" target="_blank" rel="noopener">'+original.title+'</a> · '+original.author+
          ' · <a href="'+AUDIO_LICENSES[original.license]+'" target="_blank" rel="noopener">'+original.license+'</a>';
      }
      var free=sessionTools.isFreeSound(s.id);
      var action=free ? '<label class="replace-btn">替换录音<input type="file" accept="audio/*" data-replace="'+s.id+'" hidden></label>' :
        '<button class="replace-btn" type="button">进阶音效</button>';
      item.innerHTML='<div><h4><i style="background:'+s.color+'"></i>'+s.name+' <span class="badge" data-srcbadge="'+s.id+'"></span></h4>'+
        '<p>'+details+'</p></div>'+action;
      wrap.appendChild(item);
      updateSourceUI(s.id);
      if(!free){
        item.querySelector("button").addEventListener("click",function(){ showPremium(s.name); });
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
          toast("已替换「"+s.name+"」");
        }catch(error){
          if(!disposed && current===request) toast("无法载入这段录音，请选择可播放的音频文件");
        }
      });
    });
  }

  var bedNodes={};
  function startBed(kind){
    if(bedNodes[kind] || !openListeningWindow()) return;
    if(AC.state!=="running") AC.resume().catch(function(){ toast("浏览器暂时无法播放声音"); });
    var src=AC.createBufferSource(); src.buffer=noiseBuffer(kind); src.loop=true;
    var f=filt("lowpass",kind==="brown"?420:kind==="pink"?2400:3200);
    var g=AC.createGain(); g.gain.value=0;
    src.connect(f); f.connect(g); g.connect(sessionGain); src.start();
    g.gain.setTargetAtTime(.14,AC.currentTime,.25);
    src.onended=function(){ src.disconnect(); f.disconnect(); g.disconnect(); };
    bedNodes[kind]={src:src,g:g};
    var button=document.querySelector('[data-bed="'+kind+'"]');
    button.classList.add("on");
    button.setAttribute("aria-pressed","true");
  }
  function stopBed(kind){
    var node=bedNodes[kind];
    if(!node) return;
    node.g.gain.setTargetAtTime(0,AC.currentTime,.13);
    node.src.stop(AC.currentTime+.7);
    delete bedNodes[kind];
    var button=document.querySelector('[data-bed="'+kind+'"]');
    button.classList.remove("on");
    button.setAttribute("aria-pressed","false");
  }
  document.querySelectorAll("[data-bed]").forEach(function(btn){
    btn.setAttribute("aria-pressed","false");
    btn.addEventListener("click",function(){
      var kind=btn.dataset.bed;
      if(bedNodes[kind]) stopBed(kind);
      else startBed(kind);
    });
  });

  /* ============================== init ============================== */
  buildFaders();
  buildSources();
  renderMine();
  // The first cup is ready to play when the user chooses Start.
  levels.rain=0.80; levels.fire=0.52; levels.piano=0.40;
  SOUNDS.forEach(function(s){ paintFader(s.id); });
  renderGlass();
  paintCurrentMix();
  paintSession();
  setInterval(tickSession,250);
  listen(document,"visibilitychange",function(){
    if(!document.hidden){ tickSession(); armSessionGain(); }
  });
  meterLoop();
  listen(document,"keydown",function(event){
    if(event.key==="Escape" && !$("sessionDone").open && !$("premiumDialog").open) exitImmersive();
  });

  /**
   * 登录/登出或权益变化后调用：按已拥有的包重算可玩通道，
   * 重建推子与音源清单（levels/params/音频节点不受影响）。
   * 未登录时传 []，进阶通道重新上锁。
   */
  function setOwnedPacks(packIds){
    ownedSounds=new Set();
    (packIds||[]).forEach(function(packId){
      var pack=null;
      PACKS.forEach(function(p){ if(p.id===packId) pack=p; });
      (pack && pack.sounds || []).forEach(function(id){ ownedSounds.add(id); });
    });
    buildFaders();
    SOUNDS.forEach(function(s){ paintFader(s.id); });
    buildSources();
    paintCurrentMix();
  }

  return {
    chooseScene,
    showPremium,
    setOwnedPacks,
    setFocus(open) {
      if(open) showImmersive();
      else exitImmersive(false);
    },
    dispose() {
      disposed=true;
      exitImmersive(false);
      scope.dispose();
      document.body.classList.remove("is-playing");
      if(AC && AC.state!=="closed") AC.close().catch(function(){});
    },
  };
}
