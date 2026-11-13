/**
 * 场景落地页正文（SEO/GEO P1）。
 *
 * 渲染在调音台外壳（SoundLabView）之下：页面上方是可直接播放的
 * 混音器，下方是本页的 SEO 正文（h1、导语、3 节、FAQ、内链）。
 * 正文全部是 SSR HTML（由路由按语言传 locale，不依赖水合后的
 * useLocale，避免服务端英文、客户端中文的水合不一致）。
 *
 * 挂载时把本页预设配方"摆"到推子上：发 soundcocktail:apply-preset
 * 事件，外壳在 mount useLayoutEffect 里注册的监听器接住后调引擎
 * setMix（只摆推子，不播放、不进沉浸模式）。"播放这杯"与"存下这杯"
 * 同样走事件（soundcocktail:play-mix / soundcocktail:save-mix），
 * 由外壳转交给音频引擎的 playRecipe / 保存流程。
 */
import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { LANDING_KEYS, LANDING_PAGES, LANDING_PRESETS, faqsForPage } from './landing.mjs';
import { t, useLocale, localizePath } from './locale.mjs';

export default function LandingCopy({ page, locale }) {
  const [uiLocale] = useLocale();
  const loc = locale || uiLocale;
  const data = LANDING_PAGES[page];
  const preset = LANDING_PRESETS[page];
  const content = data.content[loc];
  const presetName = loc === 'en' ? preset.nameEn : preset.name;
  const faqs = faqsForPage(page);
  const others = LANDING_KEYS.filter((k) => k !== page);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('soundcocktail:apply-preset', { detail: { mix: preset.mix, name: presetName } }),
    );
  }, [page, preset, presetName]);

  function playMix() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('soundcocktail:play-mix', { detail: { name: presetName, mix: preset.mix } }),
    );
  }

  function saveMix() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('soundcocktail:save-mix', { detail: { name: presetName, mix: preset.mix } }),
    );
  }

  return (
    <article className="blk landing-copy" id="landing">
      <div className="sec-head">
        <h1>{content.h1}</h1>
      </div>
      <p className="sec-sub landing-standfirst">{content.standfirst}</p>
      <p className="landing-preset">
        <strong>{t(loc, 'landing.presetLabel')}：</strong>
        {content.presetNote}
      </p>
      <div className="cta-row">
        <button className="btn btn-primary" type="button" onClick={playMix}>
          ▶ {t(loc, 'landing.playMix')}
        </button>
        <button className="btn btn-ghost" type="button" onClick={saveMix}>
          {t(loc, 'landing.saveMix')}
        </button>
      </div>
      {content.sections.map((section) => (
        <section key={section.h2}>
          <h2>{section.h2}</h2>
          <p>{section.body}</p>
        </section>
      ))}
      <section id="faq">
        <h2>{t(loc, 'landing.faqTitle')}</h2>
        {faqs.map((faq) => (
          <div className="faq-item" key={faq.id}>
            <h3>{faq.q[loc]}</h3>
            <p>{faq.a[loc]}</p>
          </div>
        ))}
      </section>
      <nav aria-label={t(loc, 'landing.moreTitle')}>
        <h2>{t(loc, 'landing.moreTitle')}</h2>
        <ul className="landing-links">
          {others.map((key) => (
            <li key={key}>
              <Link to={localizePath(`/${key}`, loc)}>{LANDING_PAGES[key].content[loc].h1}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <p>
        <Link to={localizePath('/', loc)}>{t(loc, 'landing.backHome')}</Link>
      </p>
    </article>
  );
}
