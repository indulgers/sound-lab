/**
 * 我的配方页（/en/mine、/zh/mine）：存下这一杯 + 导入配方码 + 已存列表。
 *
 * 保存框、导入框、列表的 DOM 由音频引擎拥有（renderMine / 保存流程
 * 直接写这些节点）：挂载时调 bindMine 接到引擎，卸载时 unbind。
 * 配方码输错时的行内红字提示由本页自己管（原来在 visual-effects
 * 里、只在首页首屏挂载时才接得上；拆页后改由 React state 管）：
 * 点导入时先校验（capture 阶段跑在引擎处理之前），错了就标红，
 * 输入框一改就消掉；引擎那边仍按原样弹 toast。
 */
import { useEffect, useRef, useState } from 'react';
import { getLabController } from './sound-lab.mjs';
import { t, useLocale } from './locale.mjs';

export default function MinePage() {
  const [locale] = useLocale();
  const [importErr, setImportErr] = useState(false);
  const importRef = useRef(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const controller = getLabController();
    if (!controller) return;
    controller.bindMine();
    return () => controller.unbindMine();
  }, []);
  // 导入按钮点下时先校验（capture 先于引擎的处理函数跑）：
  // 空或不是 SYL- 开头就标红；对的就把红字消掉，等引擎导入。
  function validateImport() {
    const value = importRef.current ? importRef.current.value.trim() : '';
    setImportErr(!value || value.indexOf('SYL-') !== 0);
  }
  return (
    <section className="blk" id="mine">
      <div className="sec-head"><h2>{t(locale, 'mine.title')}</h2>{locale === 'en' ? <span className="en">{t(locale, 'mine.en')}</span> : null}</div>
      <p className="sec-sub">{t(locale, 'mine.sub')}</p>
      <div className="mine-grid">
        <div>
          <div className="save-box">
            <h3>{t(locale, 'mine.saveTitle')}</h3>
            <p>{t(locale, 'mine.saveDesc')}</p>
            {/* 当前配比行由音频引擎的 paintCurrentMix 拥有：这里不放文案，
                否则语言切换时 React 重渲染会把配比汇总冲回空态。 */}
            <div className="current-mix" id="currentMix"></div>
            <div className="field">
              <label htmlFor="recipeName">{t(locale, 'mine.nameLabel')}</label>
              <input type="text" id="recipeName" maxLength={16} placeholder={t(locale, 'mine.namePlaceholder')} />
            </div>
            <button className="btn btn-ember" id="saveBtn" style={{ width: '100%', justifyContent: 'center' }}>{t(locale, 'mine.saveBtn')}</button>
          </div>
          <div className="save-box" style={{ marginTop: '14px' }}>
            <h3>{t(locale, 'mine.importTitle')}</h3>
            <p>{t(locale, 'mine.importDesc')}</p>
            <div className={importErr ? 'field err' : 'field'}>
              <label htmlFor="importCode">{t(locale, 'mine.importLabel')}</label>
              <textarea
                id="importCode"
                ref={importRef}
                placeholder={t(locale, 'mine.importPlaceholder')}
                onInput={() => setImportErr(false)}
              ></textarea>
              {importErr ? <p className="err-msg">{t(locale, 'mine.importBadCode')}</p> : null}
            </div>
            <button className="btn btn-ghost" id="importBtn" style={{ width: '100%', justifyContent: 'center' }} onClickCapture={validateImport}>{t(locale, 'mine.importBtn')}</button>
          </div>
        </div>
        <div className="mine-list" id="mineList">
          <div className="empty-note-2">{t(locale, 'mine.empty')}</div>
        </div>
      </div>
    </section>
  );
}
