/**
 * 分享混音页（/mix/:code，SEO/GEO P1）。
 *
 * 路由 loader 已在服务端用 recipe-code.mjs 解码（decodeRecipeCode）：
 * recipe 为 null 表示码无效——页面展示中性提示并 noindex（head 由
 * 路由层定），不生成任何编造内容。有效时展示配方名、配料（声音名 +
 * 音量）与"在调音台打开这杯"按钮；按钮发 soundcocktail:play-mix
 * 事件，外壳转交引擎 playRecipe（播放并应用整杯）。
 * 只有真实分享的混音才有 URL，不自动生成薄页面（也不进 sitemap）。
 */
import { Link } from '@tanstack/react-router';
import { MIX_DEFAULT_NAME, soundByIdForMix } from './landing.mjs';
import { soundDisplayName } from './catalog.mjs';
import { t, useLocale, localizePath } from './locale.mjs';

export default function MixPage({ recipe, locale }) {
  const [uiLocale] = useLocale();
  const loc = locale || uiLocale;

  if (!recipe) {
    return (
      <article className="blk landing-copy" id="mix-page">
        <div className="sec-head">
          <h1>{t(loc, 'mix.invalidTitle')}</h1>
        </div>
        <p className="sec-sub">{t(loc, 'mix.invalidDesc')}</p>
        <p>
          <Link to={localizePath('/', loc)}>{t(loc, 'mix.backHome')}</Link>
        </p>
      </article>
    );
  }

  const ingredients = Object.entries(recipe.mix || {})
    .map(([id, level]) => {
      const sound = soundByIdForMix(id);
      return sound ? { sound, level } : null;
    })
    .filter(Boolean);
  const total = ingredients.reduce((sum, { level }) => sum + level, 0);
  const name = recipe.name || MIX_DEFAULT_NAME[loc];

  function openInMixer() {
    if (typeof window === 'undefined') return;
    // 引擎的 playSavedMix 在本页没有 #mixer 时会发
    // soundcocktail:show-mixer，外壳跳回首页——这里只发事件即可。
    window.dispatchEvent(
      new CustomEvent('soundcocktail:play-mix', { detail: { name, mix: recipe.mix, params: recipe.params } }),
    );
  }

  return (
    <article className="blk landing-copy" id="mix-page">
      <div className="sec-head">
        <h1>{name}</h1>
      </div>
      <p className="sec-sub">{t(loc, 'mix.sharedCup')}</p>
      <h2>{t(loc, 'mix.ingredients')}</h2>
      <div className="mixbar" aria-hidden="true">
        {ingredients.map(({ sound, level }) => (
          <i key={sound.id} style={{ background: sound.color, width: total > 0 ? `${(level / total) * 100}%` : '0%' }} />
        ))}
      </div>
      <div className="mix-legend">
        {ingredients.map(({ sound, level }) => (
          <span key={sound.id}>
            <i style={{ background: sound.color }} />
            {soundDisplayName(sound, loc)} {Math.round(level * 100)}
          </span>
        ))}
      </div>
      <div className="cta-row">
        <button className="btn btn-primary" type="button" onClick={openInMixer}>
          ▶ {t(loc, 'mix.openInMixer')}
        </button>
      </div>
      <p>
        <Link to={localizePath('/', loc)}>{t(loc, 'mix.backHome')}</Link>
      </p>
    </article>
  );
}
