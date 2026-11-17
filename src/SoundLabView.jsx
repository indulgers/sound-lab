/**
 * 应用外壳（拆页后）：顶栏 + 页脚 + 遮罩层 + 音频引擎挂载点。
 *
 * 外壳只渲染页面框架：顶栏（药丸导航 + 药丸外的语言/登录区）、
 * <main> 里的当前路由页面（<Outlet/>）、页脚、会话/进阶
 * 遮罩与 toast。首页、配方、进阶、我的配方、音源、落地页、条款、
 * 关于、混音页都是独立路由，各自只渲染自己的内容——点条款不再
 * 落在调音台上（单页长滚动时代的 bug，2026-11-12 真机验证）。
 *
 * 音频引擎不在这个文件挂载（根路由 __root.tsx 的 useLayoutEffect
 * 里 mountSoundLab，常驻）；各页面组件用 getLabController() 接 DOM。
 * 配方播放由常驻的 NowPlayingBar 控制（调音台已下线，播放条是
 * 唯一能暂停/继续配方播放的地方）。
 */
import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import AuthButton from './AuthButton.jsx';
import { isLocalizablePath, localizePath, setLocale, stripLocalePrefix, t, useLocale } from './locale.mjs';
import { LEGAL_OPERATOR } from './legal.mjs';

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 16h3.5l2.5-6 3.5 11 2.5-8 1.5 3H27" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_ITEMS = [
  ['recipes', '/recipes'],
  ['plus', '/plus'],
  ['mine', '/mine'],
  ['sources', '/sources'],
];

function fmtCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/* 配方播放条：配方在播时常驻在页面底部，显示配方名与免费窗口
   剩余时间；暂停/继续走 soundcocktail:toggle-play（外壳转交引擎）。
   旅程播放不经过这里（旅程有自己的播放器）。 */
function NowPlayingBar() {
  const [locale] = useLocale();
  const [state, setState] = useState({ playing: false, label: '', remainingMs: null });
  useEffect(() => {
    function onState(event) {
      const detail = event.detail || {};
      setState(prev => ({ ...prev, playing: !!detail.playing, label: detail.playing ? (detail.label || prev.label) : '' }));
    }
    function onTick(event) {
      const detail = event.detail || {};
      setState(prev => (prev.playing ? { ...prev, remainingMs: typeof detail.remainingMs === 'number' ? detail.remainingMs : null } : prev));
    }
    window.addEventListener('soundcocktail:engine-state', onState);
    window.addEventListener('soundcocktail:engine-tick', onTick);
    return () => {
      window.removeEventListener('soundcocktail:engine-state', onState);
      window.removeEventListener('soundcocktail:engine-tick', onTick);
    };
  }, []);
  if (!state.playing) return null;
  const remaining = typeof state.remainingMs === 'number' ? fmtCountdown(state.remainingMs) : null;
  return (
    <div className="now-playing" role="status">
      <span className="np-label">{state.label || t(locale, 'nowPlaying.playing')}</span>
      {remaining ? <span className="np-remaining">{t(locale, 'nowPlaying.remaining', { time: remaining })}</span> : null}
      <button className="np-toggle" type="button" onClick={() => window.dispatchEvent(new Event('soundcocktail:toggle-play'))}>
        {t(locale, 'nowPlaying.pause')}
      </button>
    </div>
  );
}

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
        <Link className="mark brand" to={localizePath('/', locale)} aria-label={locale === 'zh' ? 'Sound Cocktail · 回到场景' : 'Sound Cocktail · Places'}><BrandMark /><span className="brand-word">Sound Cocktail</span></Link>
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
      <Link className="brand brand-foot" to={localizePath('/', locale)}><BrandMark /><span className="brand-word">Sound Cocktail</span></Link>
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
            <form method="dialog"><button className="btn btn-ghost">{t(locale, 'overlays.back')}</button></form>
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
  const pathname = useRouterState({ select: state => state.location.pathname });
  const sceneHome = (stripLocalePrefix(pathname).replace(/\/$/, '') || '/') === '/';
  return (
    <div className={sceneHome ? 'scene-home' : 'studio-shell'}>
      <a className="skip-link" href="#main">{t(locale, 'skipLink')}</a>
      <Header user={user} onAuthChange={onAuthChange} />
      <main id="main">
        <Outlet />
        <Footer />
      </main>
      <NowPlayingBar />
      <Overlays />
    </div>
  );
}
