/**
 * 音源清单页（/en/sources、/zh/sources）：录音与采样的作者与授权，
 * 底噪开关。
 *
 * 清单与底噪开关的 DOM 由音频引擎拥有（buildSources 直接写 #srcList，
 * 底噪开关直接绑 [data-bed]）：挂载时调 bindSources 接到引擎，
 * 卸载时 unbind。展开/收起由本页自己管。
 */
import { useEffect, useState } from 'react';
import { getLabController } from './sound-lab.mjs';
import { t, useLocale } from './locale.mjs';

export default function SourcesPage() {
  const [locale] = useLocale();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const controller = getLabController();
    if (!controller) return;
    controller.bindSources();
    return () => controller.unbindSources();
  }, []);
  return (
    <section className="blk" id="sources">
      <div className="sec-head"><h2>{t(locale, 'sources.title')}</h2>{locale === 'en' ? <span className="en">{t(locale, 'sources.en')}</span> : null}</div>
      <p className="sec-sub">{t(locale, 'sources.sub')}</p>
      <button type="button" className="btn btn-ghost btn-sm src-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? t(locale, 'sources.close') : t(locale, 'sources.open')}
      </button>
      <div hidden={!open}>
        <div className="src-list" id="srcList"><div className="skl skl-row" aria-hidden="true"></div><div className="skl skl-row" aria-hidden="true"></div><div className="skl skl-row" aria-hidden="true"></div></div>
        <p className="comfort-note" style={{ marginTop: '14px' }}>{t(locale, 'sources.bedNote')}</p>
        <div className="chips" style={{ marginTop: '8px' }}>
          <button className="chip" data-bed="white">{t(locale, 'sources.bedWhite')}</button>
          <button className="chip" data-bed="pink">{t(locale, 'sources.bedPink')}</button>
          <button className="chip" data-bed="brown">{t(locale, 'sources.bedBrown')}</button>
        </div>
      </div>
    </section>
  );
}
