/**
 * 应用外壳（拆页后）：顶栏 + 页脚 + 遮罩层 + 音频引擎挂载点。
 *
 * 外壳只渲染页面框架：顶栏（药丸导航 + 药丸外的语言/登录区）、
 * <main> 里的当前路由页面（<Outlet/>）、页脚、沉浸/会话/进阶
 * 遮罩与 toast。首页、配方、进阶、我的配方、音源、落地页、条款、
 * 关于、混音页都是独立路由，各自只渲染自己的内容——点条款不再
 * 落在调音台上（单页长滚动时代的 bug，2026-11-12 真机验证）。
 *
 * 音频引擎不在这个文件挂载（根路由 __root.tsx 的 useLayoutEffect
 * 里 mountSoundLab，常驻）；各页面组件用 getLabController() 接 DOM。
 */
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import AuthButton from './AuthButton.jsx';
import { isLocalizablePath, localizePath, setLocale, stripLocalePrefix, t, useLocale } from './locale.mjs';
import { LEGAL_OPERATOR } from './legal.mjs';

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 7h20c0 6-4.2 10.2-9 11.2V25h4v2.6H11V25h4v-6.8C10.2 17.2 6 13 6 7z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10.5 11h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
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
  );
}

const NAV_ITEMS = [
  ['mixer', '/'],
  ['recipes', '/recipes'],
  ['plus', '/plus'],
  ['mine', '/mine'],
  ['sources', '/sources'],
];

function Header({ user, onAuthChange }) {
  const [locale] = useLocale();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const search = useRouterState({ select: (state) => state.location.search });
  // 语言选择（select，显示当前语言）：选后跳到另一语言的 URL（同一页），
  // 手动选择仍存 localStorage 持久化；支付地区不受影响（见 region.mjs 解耦规则）。
  // 不可本地化的路径（支付回跳页等）只换文案、不导航。
  function changeLocale(event) {
    const next = event.target.value === 'zh' ? 'zh' : 'en';
    if (next === locale) return;
    setLocale(next);
    if (isLocalizablePath(pathname)) {
      void navigate({ to: localizePath(pathname, next), search });
    }
  }
  // 当前栏目（去语言前缀、去尾斜杠）：决定哪条导航高亮。
  const section = stripLocalePrefix(pathname).replace(/\/$/, '') || '/';
  return (
    <header className="topbar-wrap">
      <nav className="topbar">
        <span className="mark brand"><BrandMark /><span className="brand-word">Sound Cocktail</span></span>
        {NAV_ITEMS.map(([key, path]) => (
          <Link
            key={key}
            to={localizePath(path, locale)}
            data-nav={key}
            activeOptions={{ exact: true }}
            aria-current={section === path ? 'page' : undefined}
          >
            {t(locale, `nav.${key}`)}
          </Link>
        ))}
      </nav>
      {/* 语言与登录区：从药丸里抽出来，放在药丸外右侧的空白区
          （药丸只占页面中部约 58% 宽度，两边各有约 400px 空白）。
          窄屏时自动换到药丸下方右对齐，不再往药丸里挤。 */}
      <div className="topbar-utils">
        <select
          className="btn-ghost btn-sm lang-select"
          value={locale}
          onChange={changeLocale}
          aria-label={locale === 'en' ? 'Language' : '语言'}
        >
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
        <AuthButton user={user} onAuthChange={onAuthChange} />
      </div>
    </header>
  );
}

function Footer() {
  const [locale] = useLocale();
  return (
    <footer>
      <span className="brand brand-foot"><BrandMark /><span className="brand-word">Sound Cocktail</span></span>
      <span>{t(locale, 'footer.tagline')}</span>
      <Link to={localizePath('/sources', locale)}>{t(locale, 'nav.sources')}</Link>
      {/* 法律页链接（Waffo 商家审核清单要求：页脚放服务条款与隐私政策链接，无登录可打开）。 */}
      <Link to={localizePath('/terms', locale)}>{t(locale, 'footer.terms')}</Link>
      <Link to={localizePath('/privacy', locale)}>{t(locale, 'footer.privacy')}</Link>
      {/* 客服邮箱（Waffo 自检要求：页脚须公示有效联系方式，不只藏在条款正文里）。
          地址取自 legal.mjs 的 LEGAL_OPERATOR，与条款/隐私政策里的邮箱同一来源，不会漂移。 */}
      <span>{t(locale, 'footer.contact')}: <a href={`mailto:${LEGAL_OPERATOR.email}`}>{LEGAL_OPERATOR.email}</a></span>
    </footer>
  );
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
        <div className="focus-read" id="immFocus" role="timer" aria-label={t(locale, 'overlays.immRemainingAria')}></div>
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
  );
}

/**
 * @param {object} props
 * @param {{ userId: string, email: string } | null} [props.user]
 * @param {() => void} [props.onAuthChange]
 */
export default function SoundLabView({ user = null, onAuthChange }) {
  const [locale] = useLocale();
  return (
    <>
      <a className="skip-link" href="#main">{t(locale, 'skipLink')}</a>
      <Background />
      <Header user={user} onAuthChange={onAuthChange} />
      <main id="main">
        <Outlet />
        <Footer />
      </main>
      <Overlays />
    </>
  );
}
