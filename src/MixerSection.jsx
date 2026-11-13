/**
 * 调音台区块（首页与各落地页共用）。
 *
 * Hero（手绘水彩杯 + 精选场景 + CTA）+ Mixer（播放条 + 推子），
 * 接在外壳常驻的音频引擎上：挂载时调 bindHero/bindMixer 把这块
 * DOM 接到引擎（建推子、绑按钮、绘杯子），卸载时 unbind（撤监听、
 * 把杯子从沉浸遮罩搬回原位）。音频与配比状态在引擎模块里，路由
 * 切换不重启、不重建。
 *
 * 挂载顺序保证：外壳在 useLayoutEffect 里 mountSoundLab（全部
 * layout effect 先跑），这里的 useEffect（passive）后跑，所以
 * getLabController() 一定已就绪；SSR 时 effect 不执行。
 */
import { useEffect, useLayoutEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { getLabController } from './sound-lab.mjs';
import { useLab } from './lab-context.jsx';
import { recipeDisplay } from './catalog.mjs';
import { localizePath, t, useLocale } from './locale.mjs';

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 7h20c0 6-4.2 10.2-9 11.2V25h4v2.6H11V25h4v-6.8C10.2 17.2 6 13 6 7z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10.5 11h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SoundCup() {
  const [locale] = useLocale();
  return (
    <div className="glass-wrap">
      <div className="ck-scene" id="ckScene" aria-hidden="true">
        <div className="ck-glow"></div>
        <div className="cup-stage" id="cupStage">
          <svg id="wcSvg" viewBox="0 0 320 340" role="img" aria-label={t(locale, 'cup.svgAria')}>
            <defs>
              <radialGradient id="wcHalo">
                <stop stopColor="#FFE9B3" stopOpacity=".72" />
                <stop offset="1" stopColor="#FFE9B3" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="wcShadow">
                <stop stopColor="#A46A36" stopOpacity=".33" />
                <stop offset="1" stopColor="#A46A36" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="wcGlass">
                <stop stopColor="#B6CDD0" stopOpacity=".52" />
                <stop offset=".18" stopColor="#FFFEF4" stopOpacity=".83" />
                <stop offset=".46" stopColor="#FFFEF4" stopOpacity=".17" />
                <stop offset=".74" stopColor="#E2ECE2" stopOpacity=".24" />
                <stop offset="1" stopColor="#91AEAD" stopOpacity=".54" />
              </linearGradient>
              <linearGradient id="wcFoot" x2="0" y2="1">
                <stop stopColor="#FFFDF0" stopOpacity=".9" />
                <stop offset="1" stopColor="#8CA4A5" stopOpacity=".48" />
              </linearGradient>
              <linearGradient id="wcLiquidGradient" x2="0" y2="1">
                <stop id="wcLiquidTop" />
                <stop id="wcLiquidMiddle" offset=".52" />
                <stop id="wcLiquidBottom" offset="1" />
              </linearGradient>
              <linearGradient id="wcLiquidLight">
                <stop stopColor="#FFF9D9" stopOpacity="0" />
                <stop offset=".27" stopColor="#FFF9D9" stopOpacity=".57" />
                <stop offset=".49" stopColor="#FFF9D9" stopOpacity=".08" />
                <stop offset=".75" stopColor="#FFF9D9" stopOpacity=".18" />
                <stop offset="1" stopColor="#FFF9D9" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="wcIce" x2="1" y2="1">
                <stop stopColor="#FFFDF0" stopOpacity=".91" />
                <stop offset=".56" stopColor="#FFFBEC" stopOpacity=".34" />
                <stop offset="1" stopColor="#A9C6C7" stopOpacity=".43" />
              </linearGradient>
              <linearGradient id="wcCitrus" x2=".7" y2="1">
                <stop stopColor="#FFECB7" />
                <stop offset="1" stopColor="#F1AB56" />
              </linearGradient>
              <linearGradient id="wcLeaf" x2=".65" y2="1">
                <stop stopColor="#B2C181" />
                <stop offset="1" stopColor="#628554" />
              </linearGradient>
              <path id="wcBowl" d="M49 78 C53 128 95 201 160 204 C225 201 267 128 271 78 Z" />
              <clipPath id="wcClip"><use href="#wcBowl" /></clipPath>
            </defs>
            <g id="wcBackdrop">
              <ellipse cx="158" cy="164" rx="151" ry="144" fill="url(#wcHalo)" />
              <g fill="none" stroke="#AC8060" strokeWidth="1.15" strokeLinecap="round">
                <path d="M41 122q2 7 8 9-6 2-8 9-2-7-8-9 6-2 8-9Z" opacity=".62" />
                <path d="M277 173q2 5 6 6-4 1-6 6-1-5-5-6 4-1 5-6Z" opacity=".54" />
                <path d="M48 225q9-3 14 1m195 18q8 2 16-3" opacity=".24" />
              </g>
              <circle cx="53" cy="182" r="1.5" fill="#BB9271" opacity=".43" />
              <circle cx="269" cy="144" r="1.8" fill="#BB9271" opacity=".43" />
            </g>
            <ellipse cx="160" cy="319" rx="102" ry="16" fill="url(#wcShadow)" />
            <g id="wcSway" strokeLinecap="round" strokeLinejoin="round">

              <path d="M151 199 Q161 202 169 199 C165 222 164 257 166 281
                       C167 291 186 294 210 299 Q230 303 230 308
                       Q229 318 159 319 Q90 318 90 310 Q88 304 109 300
                       C132 295 152 292 153 281 C156 256 154 225 151 199Z"
                    fill="url(#wcGlass)" stroke="#6E8E91" strokeWidth="1.75" />
              <path d="M155 211 Q161 249 156 283 Q154 297 130 300 M164 243q-1 37 4 45"
                    fill="none" stroke="#FFFBEE" strokeWidth="2.6" opacity=".84" />
              <path d="M91 309 Q150 320 229 307 Q225 317 160 319 Q103 319 91 309Z"
                    fill="url(#wcFoot)" stroke="#7C9897" strokeWidth="1.2" />
              <path d="M102 307q31-9 52-5m24 0q21-2 42 2" fill="none" stroke="#FFFEF3" strokeWidth="2.1" opacity=".75" />

              <use href="#wcBowl" fill="url(#wcGlass)" />
              <ellipse cx="160" cy="78" rx="111" ry="18" fill="#FFFDF2" fillOpacity=".29" stroke="#7F9A9B" strokeWidth="1.75" />
              <path d="M52 75 C79 61 222 56 265 74" fill="none" stroke="#FFFDF2" strokeWidth="2.9" opacity=".85" />

              <g id="wcPour" clipPath="url(#wcClip)" visibility="hidden">
                <path id="wcLiquid" fill="url(#wcLiquidGradient)" opacity=".88" />
                <path id="wcLiquidWash" fill="url(#wcLiquidLight)" />
                <path id="wcSurface" fillOpacity=".67" />
                <g id="wcIceG" fill="url(#wcIce)" stroke="#FFFBE8" strokeWidth="1" opacity="0">
                  <g>
                    <path d="M-14-5-9-13 7-15 15-6 12 7 4 11-11 8Z" />
                    <path d="M-14-5 4-3 15-6M4-3 4 11M-10-5-7-10 5-12" fill="none" opacity=".7" />
                  </g>
                  <g>
                    <path d="M-12-5-7-11 7-11 13-3 10 8-5 9-12 4Z" />
                    <path d="M-12-5 3-3 13-3M3-3-1 9M-6-8 5-9" fill="none" opacity=".7" />
                  </g>
                </g>
                <g id="wcBubbleG" fill="#FFFDF2" fillOpacity=".35" stroke="#FFFDF2" strokeWidth=".8">
                  <circle r="1.1" /><circle r="1.5" /><circle r="1" /><circle r="1.25" /><circle r="1.35" />
                </g>
                <path id="wcSurfaceEdge" fill="none" stroke="#FFFADE" strokeWidth="1.1" opacity=".83" />
              </g>

              <path d="M49 78 C53 128 95 201 160 204 C225 201 267 128 271 78"
                    fill="none" stroke="#66878B" strokeWidth="2.05" />
              <path d="M51 80 C80 100 228 103 269 81 M55 84 C87 101 230 104 265 87"
                    fill="none" stroke="#6F9295" strokeWidth="1.4" opacity=".8" />
              <path d="M56 86 C61 124 88 169 118 185 M126 190l11 5 M260 105 C251 143 230 171 209 187"
                    fill="none" stroke="#FFFEF1" strokeWidth="3.3" opacity=".86" />
              <g fill="none" stroke="#4e6e6e" strokeWidth=".85" opacity=".48">
                <path d="M48 91q8 30 23 53m-4-2q8 19 23 32m91 24q22-6 39-20m17-27q14-22 20-44" />
                <path d="M70 138l8-5m-6 11 9-5m-5 11 9-5m-5 11 8-4m121 20 5 5m2-11 5 5m1-13 4 5" />
                <path d="M98 312q19 7 44 8m37-1q19-2 32-4m-47-29q5 6 12 8" />
              </g>
              <path d="M60 113q15 47 48 68m136-48q-13 27-33 42" fill="none" stroke="#799897" strokeWidth=".88" opacity=".46" />
              <g id="wcCondG" fill="#FDFDF0" stroke="#A0BABA" strokeWidth=".75" opacity="0">
                <path d="M72 122q-3 5 .7 6 3.8-.9-.7-6ZM237 137q-2.8 4.7.5 5.7 3.7-.8-.5-5.7Z" />
                <circle cx="82" cy="136" r="1.7" /><circle cx="228" cy="149" r="1.25" />
              </g>

              <g id="wcGarLemon" transform="translate(256 74) rotate(-26)" opacity="0">
                <path d="M-23 0A23 23 0 0 1 23 0L21 3-22 3Z" fill="url(#wcCitrus)" stroke="#BA7844" strokeWidth="1.35" />
                <path d="M-19 0a19 19 0 0 1 38 0M0 0-13-13M0 0-6-18M0 0 3-18M0 0 12-14M0 0 17-8"
                      fill="none" stroke="#FFF4D4" strokeWidth="1.4" />
                <path d="M-17 2q19-1 34 0" fill="none" stroke="#E2934E" strokeWidth=".8" />
              </g>
              <g id="wcGarMint" transform="translate(254 79) rotate(-9)" opacity="0">
                <path d="M-1 2Q6-13 22-27" fill="none" stroke="#57774C" strokeWidth="1.5" />
                <path d="M7-9C-4-11-11-22-8-32 3-29 10-21 7-9Z M13-14C13-25 22-31 30-29 26-19 22-15 13-14Z M6-6C14-11 25-10 30-4 23 3 12 1 6-6Z"
                      fill="url(#wcLeaf)" stroke="#5F7955" strokeWidth="1.05" />
                <path d="M-5-26 6-11m10-6 10-8M9-6l15 1" fill="none" stroke="#DDE2A7" strokeWidth=".9" opacity=".76" />
              </g>
              <g id="wcGarCherry" transform="translate(254 76)" opacity="0">
                <path d="M-2-3Q1-22 17-29" fill="none" stroke="#728250" strokeWidth="1.55" />
                <path d="M8-23q9-13 20-8-4 11-20 8Z" fill="url(#wcLeaf)" stroke="#6A8153" strokeWidth=".85" />
                <path d="M-2-4C-18-9-18 13-6 16 8 21 15 2 4-4Q1-5-2-4Z" fill="#CB777E" stroke="#9E5D69" strokeWidth="1.25" />
                <path d="M-10 2q2-4 7-3" fill="none" stroke="#FFE5CC" strokeWidth="1.7" opacity=".85" />
              </g>
            </g>
          </svg>
        </div>
        <div className="ck-empty" id="glassEmpty" hidden>{t(locale, 'cup.empty')}</div>
        <p className="cup-hint">{t(locale, 'cup.hint')}</p>
      </div>
      {/* 杯身标题由音频引擎的 renderGlass 拥有：这里不放文案，
          否则语言切换时 React 重渲染会把正在调的配比标题冲回空态。 */}
      <div className="glass-cap" id="glassCap"></div>
    </div>
  );
}

function Hero({ recipes, onChooseScene }) {
  const [locale] = useLocale();
  return (
    <div className="hero">
      <div>
        <span className="kicker">SOUND COCKTAIL</span>
        <h1 id="heroTitle">{t(locale, 'hero.title')}</h1>
        <p className="lead">{t(locale, 'hero.lead')}</p>
        <div className="featured-scenes" id="featuredScenes" role="group" aria-label={t(locale, 'hero.featuredLabel')}>
          {recipes.filter(recipe => recipe.featured).map(recipe => {
            const display = recipeDisplay(recipe, locale);
            return (
              <button className="scene-option" type="button" key={recipe.name} onClick={() => onChooseScene(recipe)}>
                <span className="scene-intent">{display.intent}</span>
                <span className="scene-name">{display.name}</span>
              </button>
            );
          })}
        </div>
        <p className="hint scene-limit">{t(locale, 'hero.freeNote')}</p>
        <div className="cta-row">
          <button className="btn btn-primary" id="ctaPlay">{t(locale, 'hero.ctaPlay')}</button>
          <button className="btn btn-ember" id="ctaImmersive">{t(locale, 'hero.ctaImmersive')}</button>
          <Link to={localizePath('/recipes', locale)} className="btn btn-ghost" style={{ textDecoration: 'none' }}>{t(locale, 'hero.ctaAll')}</Link>
        </div>
      </div>
      <SoundCup />
    </div>
  );
}

function Mixer() {
  const [locale] = useLocale();
  return (
    <section className="blk" id="mixer">
      <div className="sec-head"><h2>{t(locale, 'mixer.title')}</h2>{locale === 'en' ? <span className="en">{t(locale, 'mixer.en')}</span> : null}</div>
      <p className="sec-sub">{t(locale, 'mixer.sub')}</p>
      <div className="mixer">
        <div className="mixer-bar">
          <button className="play-btn" id="playBtn" aria-label={t(locale, 'mixer.playPauseAria')}>
            <svg id="playIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
          </button>
          <div className="mb-group">
            <span className="mb-label">{t(locale, 'mixer.master')}</span>
            <input type="range" className="master-vol" id="masterVol" min="0" max="85" defaultValue={55} aria-label={t(locale, 'mixer.masterAria')} />
          </div>
          <div className="mb-group">
            <span className="mb-label">{t(locale, 'mixer.remaining')}</span>
            <span className="timer-read" id="focusRead" role="timer">10:00</span>
          </div>
          <div className="spacer"></div>
          <button className="text-btn" id="immersiveBtn">{t(locale, 'mixer.immersive')}</button>
          <button className="text-btn" id="randomBtn">{t(locale, 'mixer.random')}</button>
          <button className="text-btn" id="clearBtn">{t(locale, 'mixer.clear')}</button>
        </div>
        <p className="comfort-note" style={{ margin: '0 0 18px' }}>{t(locale, 'mixer.comfort')}</p>
        <div className="mixer-controls">
          <div className="mixer-cup" aria-hidden="true">
            <svg viewBox="42 38 241 286"><use href="#wcSway" /></svg>
            <span id="mixerCupName"></span>
          </div>
          <div className="sound-filters" id="soundFilters" aria-label={t(locale, 'mixer.filtersAria')}>
            <button className="chip on" data-filter="all" aria-pressed="true">{t(locale, 'mixer.filterAll')}</button>
            <button className="chip" data-filter="active" aria-pressed="false">{t(locale, 'mixer.filterActive')}</button>
            <button className="chip" data-filter="nature" aria-pressed="false">{t(locale, 'mixer.filterNature')}</button>
            <button className="chip" data-filter="city" aria-pressed="false">{t(locale, 'mixer.filterCity')}</button>
            <button className="chip" data-filter="inst" aria-pressed="false">{t(locale, 'mixer.filterInst')}</button>
          </div>
        </div>
        <p className="empty-filter" id="emptyFilter" hidden>{t(locale, 'mixer.emptyFilter')}</p>
        <div id="faders"></div>
      </div>
    </section>
  );
}

export default function MixerSection() {
  const { recipes, chooseScene } = useLab();
  // 接到常驻引擎：挂载时绑 Hero + 调音台，卸载时撤掉。useEffect
  // 在外壳的 useLayoutEffect（mountSoundLab）之后跑，控制器已就绪。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const controller = getLabController();
    if (!controller) return;
    controller.bindHero();
    controller.bindMixer();
    return () => {
      controller.unbindMixer();
      controller.unbindHero();
    };
  }, []);
  // 卸载时把杯子搬回 Hero（沉浸模式可能把它搬进了 #immScene）：
  // layout 清理在 React 删节点之前跑，杯子先回家、再删节点。
  useLayoutEffect(() => () => {
    if (typeof window === 'undefined') return;
    getLabController()?.restoreCupStage();
  }, []);
  return (
    <>
      <Hero recipes={recipes} onChooseScene={chooseScene} />
      <Mixer />
    </>
  );
}
