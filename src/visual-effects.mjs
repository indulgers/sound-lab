import { createRuntimeScope } from './runtime-scope.mjs'

export function mountVisualEffects() {
  const scope=createRuntimeScope();
  const {setTimeout,clearTimeout,requestAnimationFrame,cancelAnimationFrame,listen}=scope;
  let onMixChange;
  const observers=[];
  function observeIntersections(callback, options) {
    const observer=new IntersectionObserver(callback, options);
    observers.push(observer);
    return observer;
  }
    (function(){
      "use strict";
      var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      /* ---- BlurText / SplitText: split hero title once, chars blur-in staggered ---- */
      var hero=document.getElementById("heroTitle");
      if(hero && !reduced){
        var idx=0;
        (function split(node){
          Array.prototype.slice.call(node.childNodes).forEach(function(n){
            if(n.nodeType===3){
              var frag=document.createDocumentFragment();
              n.textContent.split("").forEach(function(ch){
                if(ch===" "){ frag.appendChild(document.createTextNode(" ")); return; }
                var s=document.createElement("span"); s.className="ch"; s.style.setProperty("--i", idx++); s.textContent=ch;
                frag.appendChild(s);
              });
              node.replaceChild(frag, n);
            } else if(n.nodeType===1 && n.tagName!=="BR"){ split(n); }
          });
        })(hero);
      } else if(hero){
        hero.querySelectorAll("*"); hero.style.opacity=1;
      }

      /* ---- Aurora: THE single background canvas. Colours follow the mix. ---- */
      var canvas=document.getElementById("auroraCanvas"), ctx=canvas.getContext("2d");
      var mobile = window.matchMedia("(max-width: 640px)").matches;
      function hexRgb(h){ h=h.replace("#",""); return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)]; }
      var targets=["#4d7ea8","#c9853f","#5f7355"].map(hexRgb);
      var current=targets.map(function(c){ return c.slice(); });
      var sparkColors=["#4d7ea8","#c9853f","#5f7355"];
      function sizeCanvas(){
        var dpr = mobile? 1 : Math.min(1.5, window.devicePixelRatio||1);
        canvas.width=Math.floor(innerWidth*dpr); canvas.height=Math.floor(innerHeight*dpr);
      }
      function drawAurora(t){
        var W=canvas.width, H=canvas.height;
        ctx.clearRect(0,0,W,H);
        ctx.fillStyle="#0B0E14"; ctx.fillRect(0,0,W,H);
        var pos=[
          [0.22+0.05*Math.sin(t/7000), 0.16+0.04*Math.cos(t/8000)],
          [0.80+0.05*Math.cos(t/7500), 0.24+0.05*Math.sin(t/6200)],
          [0.55+0.06*Math.sin(t/6800+2), 0.88+0.04*Math.cos(t/7900)]
        ];
        for(var i=0;i<3;i++){
          for(var k=0;k<3;k++) current[i][k]+=(targets[i][k]-current[i][k])*0.015;
          var x=pos[i][0]*W, y=pos[i][1]*H, r=Math.max(W,H)*(0.52-i*0.05);
          var g=ctx.createRadialGradient(x,y,0,x,y,r);
          var c=current[i];
          g.addColorStop(0,"rgba("+Math.round(c[0])+","+Math.round(c[1])+","+Math.round(c[2])+",0.34)");
          g.addColorStop(1,"rgba("+Math.round(c[0])+","+Math.round(c[1])+","+Math.round(c[2])+",0)");
          ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
        }
        /* soft vignette for wabi-sabi quiet */
        var v=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.85);
        v.addColorStop(0,"rgba(11,14,20,0)"); v.addColorStop(1,"rgba(11,14,20,0.55)");
        ctx.fillStyle=v; ctx.fillRect(0,0,W,H);
      }
      sizeCanvas();
      if(mobile || reduced){
        drawAurora(1200); /* mobile / reduced-motion: one static frame, CSS gradient shows through edges */
      } else {
        (function loop(t){
          if(!document.hidden) drawAurora(t||0);
          requestAnimationFrame(loop);
        })(0);
        var rzT; listen(window,"resize", function(){ clearTimeout(rzT); rzT=setTimeout(sizeCanvas,200); });
      }
      /* called from the mixer whenever levels change */
      onMixChange=function(colors, breathSec){
        if(colors && colors.length){
          for(var i=0;i<3;i++){ if(colors[i]) targets[i]=hexRgb(colors[i]); }
          sparkColors=colors.slice();
          document.documentElement.style.setProperty("--aurora-1", colors[0]);
          if(colors[1]) document.documentElement.style.setProperty("--aurora-2", colors[1]);
          if(colors[2]) document.documentElement.style.setProperty("--aurora-3", colors[2]);
          if(mobile||reduced) drawAurora(1200);
        }
        if(breathSec) document.documentElement.style.setProperty("--breath-dur", Math.max(4,Math.min(8,breathSec)).toFixed(2)+"s");
      };

      /* ---- SpotlightCard: single-active, per-card only (bug fix) ----
         The old handler looped over every .recipe-card on each pointermove
         and reset transforms globally, so moving fast between cards made
         many cards flash at once. Now exactly one card — the one under
         the pointer — is ever written to, rAF-throttled; leaving it fades
         only that card. Touch pointers and reduced motion get no effect. */
      if(!reduced && !mobile){
        var spotCard=null, spotRaf=0, spotEvt=null;
        function spotApply(){
          spotRaf=0;
          if(!spotCard || !spotEvt) return;
          var r=spotCard.getBoundingClientRect();
          if(!r.width) return;
          var px=(spotEvt.clientX-r.left)/r.width, py=(spotEvt.clientY-r.top)/r.height;
          spotCard.style.setProperty("--mx", (px*100).toFixed(1)+"%");
          spotCard.style.setProperty("--my", (py*100).toFixed(1)+"%");
          spotCard.style.transform="perspective(820px) rotateX("+(-(py-0.5)*5).toFixed(2)+"deg) rotateY("+((px-0.5)*5).toFixed(2)+"deg)";
          spotEvt=null;
        }
        listen(document,"pointerover", function(e){
          if(e.pointerType && e.pointerType!=="mouse" && e.pointerType!=="pen") return;
          var card=e.target && e.target.closest ? e.target.closest(".recipe-card") : null;
          if(card===spotCard) return;
          if(spotCard) spotCard.style.transform="";
          spotCard=card;
        }, {passive:true});
        listen(document,"pointermove", function(e){
          if(!spotCard) return;
          if(e.pointerType && e.pointerType!=="mouse" && e.pointerType!=="pen") return;
          if(!(e.target && e.target.closest && e.target.closest(".recipe-card")===spotCard)) return;
          spotEvt=e;
          if(!spotRaf) spotRaf=requestAnimationFrame(spotApply);
        }, {passive:true});
        listen(document,"pointerout", function(e){
          if(!spotCard) return;
          var card=e.target && e.target.closest ? e.target.closest(".recipe-card") : null;
          if(card===spotCard && !spotCard.contains(e.relatedTarget)){
            spotCard.style.transform=""; spotCard=null; spotEvt=null;
            if(spotRaf){ cancelAnimationFrame(spotRaf); spotRaf=0; }
          }
        }, {passive:true});
      }

      /* ---- ClickSpark: one small cluster of light per tap (feedback, <200ms) ---- */
      if(!reduced){
        listen(document,"pointerdown", function(e){
          if(e.target.closest(".fader")) return; /* fader drags stay clean */
          var col=sparkColors[Math.floor(Math.random()*sparkColors.length)]||"#F0B183";
          for(var i=0;i<7;i++){
            var s=document.createElement("span"); s.className="spark";
            var ang=(i/7)*Math.PI*2+Math.random()*0.5, dist=18+Math.random()*18;
            s.style.left=(e.clientX-2.5)+"px"; s.style.top=(e.clientY-2.5)+"px";
            s.style.setProperty("--dx", (Math.cos(ang)*dist)+"px");
            s.style.setProperty("--dy", (Math.sin(ang)*dist)+"px");
            s.style.setProperty("--sc", col);
            document.body.appendChild(s);
            (function(el){ setTimeout(function(){ el.remove(); },230); })(s);
          }
        });
      }
    })();
    (function(){
      "use strict";
      /* ===== v10 channel highlight: one channel only (bug fix) =====
         Root cause of the multi-channel flashing: the old code wrote
         --lgx/--lgy from a document-level pointermove. CSS variables
         inherit, so a value set on .mixer lit every nested .chan at
         once, and nested matches (mixer > chan > params > button)
         re-triggered writes on several surfaces per move.
         Fix: the highlight lives on .chan::after and is driven only by
         boundary events. pointerover/out fire once per channel entry
         or exit; pointermove writes go solely to the single active
         channel, rAF-throttled, and only while the pointer is still
         inside it. Leaving fades that one channel via the --hl-o
         opacity transition. No other channel is ever touched, nothing
         is written when the pointer is not over a channel, and the
         effect is fully off for touch pointers and reduced motion. */
      var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
      var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if(!fine || reduced) return;
      var activeChan=null, hlRaf=0, hlEvt=null;
      function hlApply(){
        hlRaf=0;
        if(!activeChan || !hlEvt) return;
        var r=activeChan.getBoundingClientRect();
        if(!r.width) return;
        activeChan.style.setProperty("--hlx", ((hlEvt.clientX-r.left)/r.width*100).toFixed(1)+"%");
        activeChan.style.setProperty("--hly", ((hlEvt.clientY-r.top)/r.height*100).toFixed(1)+"%");
        activeChan.style.setProperty("--hl-o", "1");
        hlEvt=null;
      }
      function hlFade(el){ if(el) el.style.setProperty("--hl-o", "0"); }
      listen(document,"pointerover", function(e){
        if(e.pointerType && e.pointerType!=="mouse" && e.pointerType!=="pen") return;
        var chan=e.target && e.target.closest ? e.target.closest(".chan") : null;
        if(chan===activeChan) return;
        hlFade(activeChan);
        activeChan=chan;
        if(activeChan){ hlEvt=e; if(!hlRaf) hlRaf=requestAnimationFrame(hlApply); }
      }, {passive:true});
      listen(document,"pointermove", function(e){
        if(!activeChan) return;
        if(e.pointerType && e.pointerType!=="mouse" && e.pointerType!=="pen") return;
        if(!(e.target && e.target.closest && e.target.closest(".chan")===activeChan)) return;
        hlEvt=e;
        if(!hlRaf) hlRaf=requestAnimationFrame(hlApply);
      }, {passive:true});
      listen(document,"pointerout", function(e){
        if(!activeChan) return;
        var chan=e.target && e.target.closest ? e.target.closest(".chan") : null;
        if(chan===activeChan && !activeChan.contains(e.relatedTarget)){
          hlFade(activeChan); activeChan=null; hlEvt=null;
          if(hlRaf){ cancelAnimationFrame(hlRaf); hlRaf=0; }
        }
      }, {passive:true});
    })();
    (function(){
      "use strict";
      /* ===== v6 · landing-page-design skill behaviours =====
         - Scroll reveals: each section rises 32px and fades in over
           700ms on the base curve, once, via IntersectionObserver.
           Reduced motion keeps the opacity change only (see v6 CSS).
         - Tagline reveal (B11): the statement is split into characters
           (Chinese has no word spaces, so one character is one unit).
           Each unit is observed on its own and activates in reading
           order as it crosses a trigger line 35% up from the viewport
           bottom, going from 30% opacity to full colour on the base
           curve. Reduced motion shows the full text right away. */
      var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      var secs=document.querySelectorAll("section.blk");
      if("IntersectionObserver" in window){
        secs.forEach(function(s){ s.classList.add("rv"); });
        var io=observeIntersections(function(entries){
          entries.forEach(function(en){
            if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
          });
        },{threshold:.1});
        secs.forEach(function(s){ io.observe(s); });
      }

      var tg=document.getElementById("taglineReveal");
      if(tg){
        var text=tg.textContent; tg.textContent="";
        var units=[];
        text.split("").forEach(function(ch){
          var s=document.createElement("span"); s.className="w"; s.textContent=ch;
          tg.appendChild(s); units.push(s);
        });
        if(reduced || !("IntersectionObserver" in window)){
          units.forEach(function(u){ u.classList.add("on"); });
        } else {
          var wio=observeIntersections(function(entries){
            entries.forEach(function(en){
              if(en.isIntersecting){ en.target.classList.add("on"); wio.unobserve(en.target); }
            });
          },{rootMargin:"0px 0px -35% 0px",threshold:0});
          units.forEach(function(u){ wio.observe(u); });
        }
      }

      // （拆页后删掉的两块，见下。）
      // 1. 配方码导入的行内红字：改由 MinePage 用 React state 管
      //    （这里只在外壳挂载时跑一次，/mine 页面挂载时 #importCode
      //    还不在 DOM 里，接不上；两边都管会渲染出两条红字）。
      // 2. 导航 scroll-spy（skill B9）：顶栏导航已是路由链接（/en/
      //    recipes 等），不再有 href^='#' 的锚点链接；当前栏目高亮
      //    由路由的 aria-current / activeOptions 提供。
    })();
  return {
    onMixChange,
    dispose() {
      observers.forEach(observer=>observer.disconnect());
      scope.dispose();
    },
  };
}
