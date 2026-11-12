import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import AuthButton from './AuthButton.jsx';
import { isFreeSound } from './listening-session.mjs';
import { PACKS, isMixUnlocked, packDisplay, soundsForPacks } from './packs.mjs';
import { setLocale, t, useLocale } from './locale.mjs';

/** 按语言取配方展示字段（英文缺失时回落中文）。 */
function recipeDisplay(recipe, locale) {
  if (locale !== 'en') return { name: recipe.name, tag: recipe.tag, intent: recipe.intent, desc: recipe.desc };
  return {
    name: recipe.nameEn || recipe.name,
    tag: recipe.tagEn || recipe.tag,
    intent: recipe.intentEn || recipe.intent,
    desc: recipe.descEn || recipe.desc,
  };
}

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 7h20c0 6-4.2 10.2-9 11.2V25h4v2.6H11V25h4v-6.8C10.2 17.2 6 13 6 7z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10.5 11h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function Background() {
  return (
    <>
      <div className="grain" aria-hidden="true"></div>

      <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }} aria-hidden="true" focusable="false">
        <defs>
          <filter id="lg-refract" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="lgBlur" />
            <feTurbulence type="fractalNoise" baseFrequency="0.011 0.017" numOctaves="2" seed="8" stitchTiles="stitch" result="lgNoise" />
            <feDisplacementMap in="lgBlur" in2="lgNoise" scale="16" xChannelSelector="R" yChannelSelector="G" result="lgDisp" />
            <feColorMatrix in="lgDisp" type="saturate" values="1.45" />
          </filter>
          <filter id="lg-soft" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="lgBlur2" />
            <feTurbulence type="fractalNoise" baseFrequency="0.016 0.024" numOctaves="2" seed="5" stitchTiles="stitch" result="lgNoise2" />
            <feDisplacementMap in="lgBlur2" in2="lgNoise2" scale="7" xChannelSelector="R" yChannelSelector="G" result="lgDisp2" />
            <feColorMatrix in="lgDisp2" type="saturate" values="1.35" />
          </filter>
        </defs>
      </svg>
      <div className="aurora-fallback" aria-hidden="true"></div>
      <canvas id="auroraCanvas" aria-hidden="true"></canvas>
    </>
  )
}

function Navigation({ user, onAuthChange }) {
  const [locale] = useLocale();
  return (
    <nav className="topbar">
      <span className="mark brand"><BrandMark /><span className="brand-word">Sound Cocktail</span></span>
      <a href="#mixer">{t(locale, 'nav.mixer')}</a>
      <a href="#recipes">{t(locale, 'nav.recipes')}</a>
      <a href="#plus">{t(locale, 'nav.plus')}</a>
      <a href="#mine">{t(locale, 'nav.mine')}</a>
      <a href="#sources">{t(locale, 'nav.sources')}</a>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
        aria-label={locale === 'en' ? 'Switch to Chinese' : '切换到英文'}
      >
        {locale === 'en' ? '中文' : 'EN'}
      </button>
      <AuthButton user={user} onAuthChange={onAuthChange} />
    </nav>
  )
}

function SoundCup() {
  return (
    <div className="glass-wrap">
      <div className="ck-scene" id="ckScene" aria-hidden="true">
        <div className="ck-glow"></div>
        <div className="cup-stage" id="cupStage">
          <svg id="wcSvg" viewBox="0 0 320 340" role="img" aria-label="随配比变化的手绘涂鸦鸡尾酒杯">
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
        <div className="ck-empty" id="glassEmpty" hidden>拉一格推子，开始调配</div>
        <p className="cup-hint">轻拖杯子，晃一晃</p>
      </div>
      <div className="glass-cap" id="glassCap">这杯还空着</div>
    </div>
  )
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
          <a href="#recipes" className="btn btn-ghost" style={{ textDecoration: 'none' }}>{t(locale, 'hero.ctaAll')}</a>
        </div>
      </div>
      <SoundCup />
    </div>
  )
}

function Mixer() {
  const [locale] = useLocale();
  return (
    <section className="blk" id="mixer">
      <div className="sec-head"><h2>{t(locale, 'mixer.title')}</h2><span className="en">{t(locale, 'mixer.en')}</span></div>
      <p className="sec-sub">{t(locale, 'mixer.sub')}</p>
      <div className="mixer">
        <div className="mixer-bar">
          <button className="play-btn" id="playBtn" aria-label="播放或暂停">
            <svg id="playIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
          </button>
          <div className="mb-group">
            <span className="mb-label">{t(locale, 'mixer.master')}</span>
            <input type="range" className="master-vol" id="masterVol" min="0" max="85" defaultValue={55} aria-label="总音量（舒适上限 85）" />
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
          <div className="sound-filters" id="soundFilters" aria-label="筛选音源">
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
  )
}

function RecipeMix({ mix, soundsById, locale }) {
  const ingredients = Object.entries(mix).flatMap(([id, level]) => {
    const sound = soundsById.get(id)
    return sound ? [{ sound, level }] : []
  })
  const total = ingredients.reduce((sum, { level }) => sum + level, 0)
  return (
    <>
      <div className="mixbar" aria-hidden="true">
        {ingredients.map(({ sound, level }) => (
          <i key={sound.id} style={{ background: sound.color, width: total > 0 ? `${level / total * 100}%` : '0%' }} />
        ))}
      </div>
      <div className="mix-legend">
        {ingredients.map(({ sound, level }) => (
          <span key={sound.id}><i style={{ background: sound.color }} />{locale === 'en' ? (sound.en || sound.name) : sound.name} {Math.round(level * 100)}</span>
        ))}
      </div>
    </>
  )
}

function Recipes({ recipes, sounds, onChooseScene, onShowPremium, unlockedSounds }) {
  const [locale] = useLocale();
  const soundsById = new Map(sounds.map(sound => [sound.id, sound]))
  return (
    <section className="blk" id="recipes">
      <div className="sec-head"><h2>{t(locale, 'recipes.title')}</h2><span className="en">{t(locale, 'recipes.en')}</span></div>
      <p className="sec-sub">{t(locale, 'recipes.sub')}</p>
      <div className="cards" id="recipeCards">
        {recipes.map(recipe => {
          // 进阶配方：用到每个进阶通道都已解锁时才能直接听，否则还是进介绍页。
          const unlocked = !recipe.premium || isMixUnlocked(recipe.mix, unlockedSounds);
          const display = recipeDisplay(recipe, locale);
          return (
            <div className="card recipe-card" key={recipe.name}>
              <h3>{display.name}<span className={recipe.premium ? 'tag premium' : 'tag'}>{recipe.premium ? t(locale, 'recipes.premiumTag') : ''}{display.tag}</span></h3>
              <p>{display.desc}</p>
              <RecipeMix mix={recipe.mix} soundsById={soundsById} locale={locale} />
              <div className="row">
                <button
                  type="button"
                  className={unlocked ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                  onClick={() => unlocked ? onChooseScene(recipe) : onShowPremium(recipe.name)}
                >
                  {unlocked ? t(locale, 'recipes.enter') : t(locale, 'recipes.learnMore')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  )
}

function Plus({ ownedPacks, pendingWaffoOrders }) {
  const [locale] = useLocale();
  const owned = new Set(ownedPacks || []);
  // 进行中的 Waffo 订单（按包 ID）：有未付款订单的包不展示购买按钮，
  // 改展示“继续付款”，打开原来的收银台（防重复付款）。
  const pendingByPack = {};
  (pendingWaffoOrders || []).forEach((order) => {
    if (order && order.productId && order.checkoutUrl && !pendingByPack[order.productId]) {
      pendingByPack[order.productId] = order;
    }
  });
  return (
    <section className="blk" id="plus">
      <div className="sec-head"><h2>{t(locale, 'plus.title')}</h2><span className="en">{t(locale, 'plus.en')}</span></div>
      <p className="sec-sub">{t(locale, 'plus.sub')}</p>
      <div className="cards access-cards">
        <article className="card"><h3>{t(locale, 'plus.freeTitle')}</h3><p>{t(locale, 'plus.freeDesc')}</p></article>
        {PACKS.map(pack => {
          const isOwned = owned.has(pack.id);
          const pending = pendingByPack[pack.id];
          const display = packDisplay(pack, locale);
          return (
            <article className="card" key={pack.id}>
              <h3>{display.name} <span className="tag">{isOwned ? t(locale, 'plus.owned') : pending ? t(locale, 'plus.inProgress') : display.priceLabel}</span></h3>
              <p>{display.desc}</p>
              <div className="row">
                <span className="price">{display.priceLabel}<small>{t(locale, 'plus.once')}</small></span>
                <span style={{ flex: 1 }}></span>
                {isOwned ? (
                  <a href="#mixer" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>{t(locale, 'plus.goMixer')}</a>
                ) : pending ? (
                  <a href={pending.checkoutUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>{t(locale, 'plus.continuePay')}</a>
                ) : (
                  <Link to="/checkout" search={{ pack: pack.id }} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>{t(locale, 'plus.buy')}</Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  )
}

function SavedRecipes() {
  const [locale] = useLocale();
  return (
    <section className="blk" id="mine">
      <div className="sec-head"><h2>{t(locale, 'mine.title')}</h2><span className="en">{t(locale, 'mine.en')}</span></div>
      <p className="sec-sub">{t(locale, 'mine.sub')}</p>
      <div className="mine-grid">
        <div>
          <div className="save-box">
            <h3>{t(locale, 'mine.saveTitle')}</h3>
            <p>{t(locale, 'mine.saveDesc')}</p>
            <div className="current-mix" id="currentMix">{t(locale, 'mine.saveEmpty')}</div>
            <div className="field">
              <label htmlFor="recipeName">{t(locale, 'mine.nameLabel')}</label>
              <input type="text" id="recipeName" maxLength={16} placeholder={t(locale, 'mine.namePlaceholder')} />
            </div>
            <button className="btn btn-ember" id="saveBtn" style={{ width: '100%', justifyContent: 'center' }}>{t(locale, 'mine.saveBtn')}</button>
          </div>
          <div className="save-box" style={{ marginTop: '14px' }}>
            <h3>{t(locale, 'mine.importTitle')}</h3>
            <p>{t(locale, 'mine.importDesc')}</p>
            <div className="field">
              <label htmlFor="importCode">{t(locale, 'mine.importLabel')}</label>
              <textarea id="importCode" placeholder={t(locale, 'mine.importPlaceholder')}></textarea>
            </div>
            <button className="btn btn-ghost" id="importBtn" style={{ width: '100%', justifyContent: 'center' }}>{t(locale, 'mine.importBtn')}</button>
          </div>
        </div>
        <div className="mine-list" id="mineList">
          <div className="empty-note-2">{t(locale, 'mine.empty')}</div>
        </div>
      </div>
    </section>
  )
}

function Sources() {
  const [locale] = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <section className="blk" id="sources">
      <div className="sec-head"><h2>{t(locale, 'sources.title')}</h2><span className="en">{t(locale, 'sources.en')}</span></div>
      <p className="sec-sub">{t(locale, 'sources.sub')}</p>
      <button type="button" className="btn btn-ghost btn-sm src-toggle" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        {open ? t(locale, 'sources.close') : t(locale, 'sources.open')}
      </button>
      <div hidden={!open}>
        <div className="src-list" id="srcList"><div className="skl skl-row" aria-hidden="true"></div><div className="skl skl-row" aria-hidden="true"></div><div className="skl skl-row" aria-hidden="true"></div></div>
        <p className="comfort-note" style={{ marginTop: '14px' }}>{t(locale, 'sources.bedNote')}</p>
        <div className="chips" style={{ marginTop: '8px' }}>
          <button className="chip" data-bed="white">白噪音 床声</button>
          <button className="chip" data-bed="pink">粉红噪音 床声</button>
          <button className="chip" data-bed="brown">褐色噪音 床声</button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const [locale] = useLocale();
  return (
    <footer>
      <span className="brand brand-foot"><BrandMark /><span className="brand-word">Sound Cocktail</span></span>
      <span>{t(locale, 'footer.tagline')}</span>
      <a href="#sources">{t(locale, 'nav.sources')}</a>
    </footer>
  )
}

function Overlays() {
  const [locale] = useLocale();
  return (
    <>
      <div className="immersive" id="immersive" role="dialog" aria-modal="true" aria-labelledby="immTitle" aria-hidden="true">
        <div className="flow" id="immFlow"></div>
        <div className="ck-scene ck-imm" id="immScene" aria-hidden="true"></div>
        <h2 id="immTitle">{t(locale, 'overlays.immTitle')}</h2>
        <p className="sub2" id="immSub">{t(locale, 'overlays.immSub')}</p>
        <div className="focus-read" id="immFocus" role="timer" aria-label="本次体验剩余时间"></div>
        <div className="row2">
          <button className="ibtn" id="immPlay">{t(locale, 'overlays.immPause')}</button>
          <button className="ibtn" id="immExit">{t(locale, 'overlays.immExit')}</button>
        </div>
      </div>

      <dialog className="access-dialog" id="sessionDone" aria-labelledby="sdTitle">
        <div className="sd-card">
          <h3 id="sdTitle">{t(locale, 'overlays.sessionDoneTitle')}</h3>
          <p className="sd-sub">{t(locale, 'overlays.sessionDoneSub')}</p>
          <div className="sd-row">
            <button className="btn btn-primary" id="sdAgain">{t(locale, 'overlays.again')}</button>
            <button className="btn btn-ghost" id="sdSave">{t(locale, 'overlays.save')}</button>
            <button className="btn btn-ghost" data-see-plus="">{t(locale, 'overlays.learnPlus')}</button>
            <button className="btn btn-ghost" id="sdClose">{t(locale, 'overlays.close')}</button>
          </div>
        </div>
      </dialog>

      <dialog className="access-dialog" id="premiumDialog" aria-labelledby="premiumTitle">
        <div className="sd-card">
          <h3 id="premiumTitle">{t(locale, 'overlays.premiumTitle')}</h3>
          <p className="sd-sub" id="premiumMessage"></p>
          <div className="sd-row">
            <button className="btn btn-primary" data-see-plus="">{t(locale, 'overlays.learnPlus')}</button>
            <form method="dialog"><button className="btn btn-ghost">{t(locale, 'overlays.backToMixer')}</button></form>
          </div>
        </div>
      </dialog>

      <div className="toast" id="toast" role="status"></div>
    </>
  )
}

export default function SoundLabView({ recipes = [], sounds = [], onChooseScene, onShowPremium, user = null, ownedPacks = [], pendingWaffoOrders = [], onAuthChange }) {
  const [locale] = useLocale();
  // 能用的通道 = 免费通道 + 已拥有包的通道；进阶配方按这个集合判定是否可听。
  const unlockedSounds = new Set(sounds.filter((sound) => isFreeSound(sound.id)).map((sound) => sound.id));
  soundsForPacks(ownedPacks).forEach((id) => unlockedSounds.add(id));
  // 语言切换时同步 <html lang>（无障碍与浏览器翻译提示用）。
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
    }
  }, [locale]);
  return (
    <>
      <a className="skip-link" href="#mixer">{t(locale, 'skipLink')}</a>
      <Background />
      <Navigation user={user} onAuthChange={onAuthChange} />
      <main>
        <Hero recipes={recipes} onChooseScene={onChooseScene} />
        <Mixer />
        <Recipes recipes={recipes} sounds={sounds} onChooseScene={onChooseScene} onShowPremium={onShowPremium} unlockedSounds={unlockedSounds} />
        <Plus ownedPacks={ownedPacks} pendingWaffoOrders={pendingWaffoOrders} />
        <SavedRecipes />
        <Sources />
        <Footer />
      </main>
      <Overlays />
    </>
  )
}
