/**
 * 落地页 hero（改版）：旅程海报 + 播放/保存。
 *
 * 旧版 hero 是调音台（MixerSection，已删除）；新版 hero 用本页对应
 * 的旅程海报作背景（LANDING_JOURNEY 映射），展示旅程名与本页配方名，
 * 播放/保存按钮走与原来相同的事件（soundcocktail:play-mix /
 * soundcocktail:save-mix）。配方本身仍由 LandingCopy 挂载时经
 * apply-preset 事件"摆"到引擎（无界面，setMix 只改配比）。
 */
import { LANDING_JOURNEY } from './landing.mjs';
import { sceneById, sceneText } from './scenes/catalog.mjs';
import { t } from './locale.mjs';

export default function LandingJourneyHero({ page, locale, preset, onPlay, onSave }) {
  const scene = sceneById(LANDING_JOURNEY[page]);
  const presetName = locale === 'en' ? preset.nameEn : preset.name;
  return (
    <section className="landing-hero" style={{ backgroundImage: `url(${scene.poster})` }}>
      <div className="landing-hero-shade" aria-hidden="true" />
      <div className="landing-hero-inner">
        <span className="landing-hero-kicker">{sceneText(scene.tag, locale)}</span>
        <p className="landing-hero-title">{sceneText(scene.title, locale)}</p>
        <p className="landing-hero-sub">
          {sceneText(scene.name, locale)} · {presetName}
        </p>
        <div className="cta-row">
          <button className="btn btn-primary" type="button" onClick={onPlay}>
            ▶ {t(locale, 'landing.playMix')}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onSave}>
            {t(locale, 'landing.saveMix')}
          </button>
        </div>
      </div>
    </section>
  );
}
