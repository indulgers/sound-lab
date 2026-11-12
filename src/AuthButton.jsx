import { useEffect, useRef, useState } from 'react';
import { fetchProviders, login, logout, register } from './auth-api.js';
import { t, useLocale } from './locale.mjs';

/**
 * 导航栏的登录入口。
 *
 * - 未登录：显示「登录」按钮，点开一个小对话框（邮箱 + 密码，登录/注册可切换）。
 * - 已登录：显示邮箱 + 「退出」。
 * - 结账页遇到 401 时会发 window 事件 `soundcocktail:open-login` 让这里打开对话框；
 *   登录/注册成功后发 `soundcocktail:auth-changed`，结账页收到后自动重试下单。
 * - 登录成功后调用父组件传来的 onAuthChange，让外壳重新拉取 /api/auth/me
 *   和 /api/entitlements，调音台随之解锁已拥有的包。
 * - 文案跟随语言切换（useLocale），登录逻辑与语言无关。
 */
export default function AuthButton({ user, onAuthChange }) {
  const [locale] = useLocale();
  const dialogRef = useRef(null);
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);

  // 登录方式是否配置好（Google 未配时不显示 Google 按钮）。
  useEffect(() => {
    let cancelled = false;
    fetchProviders()
      .then((providers) => {
        if (!cancelled) setGoogleAvailable(Boolean(providers.google));
      })
      .catch(() => {
        if (!cancelled) setGoogleAvailable(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function openLogin() {
      setError('');
      if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
    }
    window.addEventListener('soundcocktail:open-login', openLogin);
    return () => window.removeEventListener('soundcocktail:open-login', openLogin);
  }, []);

  function openDialog(nextMode) {
    setMode(nextMode || 'login');
    setError('');
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }

  function closeDialog() {
    if (dialogRef.current?.open) dialogRef.current.close();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') await register(email, password);
      else await login(email, password);
      setPassword('');
      closeDialog();
      window.dispatchEvent(new CustomEvent('soundcocktail:auth-changed'));
      if (onAuthChange) await onAuthChange();
    } catch (err) {
      setError(err.message || t(locale, 'auth.failed'));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Cookie 失效也按已退出处理。
    }
    window.dispatchEvent(new CustomEvent('soundcocktail:auth-changed'));
    if (onAuthChange) await onAuthChange();
  }

  if (user) {
    return (
      <>
        <span className="auth-email" title={user.email}>{user.email}</span>
        <button type="button" className="btn btn-ghost btn-sm auth-btn" onClick={handleLogout}>{t(locale, 'auth.logout')}</button>
      </>
    );
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm auth-btn" onClick={() => openDialog('login')}>{t(locale, 'auth.login')}</button>
      <dialog ref={dialogRef} className="access-dialog auth-dialog" aria-labelledby="authTitle">
        <div className="sd-card">
          <h3 id="authTitle">{mode === 'register' ? t(locale, 'auth.registerTitle') : t(locale, 'auth.loginTitle')}</h3>
          <p className="sd-sub">
            {mode === 'register' ? t(locale, 'auth.registerSub') : t(locale, 'auth.loginSub')}
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="authEmail">{t(locale, 'auth.email')}</label>
              <input
                id="authEmail" type="email" autoComplete="email" required
                value={email} onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="authPassword">{t(locale, 'auth.password')}</label>
              <input
                id="authPassword" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required
                value={password} onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'register' ? t(locale, 'auth.passwordRegisterPlaceholder') : t(locale, 'auth.passwordLoginPlaceholder')}
              />
            </div>
            {error ? <p className="auth-err" role="alert">{error}</p> : null}
            <div className="sd-row">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? t(locale, 'auth.busy') : mode === 'register' ? t(locale, 'auth.submitRegister') : t(locale, 'auth.submitLogin')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeDialog}>{t(locale, 'auth.cancel')}</button>
            </div>
          </form>
          {googleAvailable ? (
            <>
              <p className="auth-divider"><span>{t(locale, 'auth.or')}</span></p>
              <a className="btn btn-ghost auth-google" href="/api/auth/google" style={{ textDecoration: 'none' }}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-8.8z" /><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.3 1.1-4.2 1.1-3.2 0-5.9-2.1-6.8-5.1L1.3 17C3.3 21 7.3 24 12 24z" /><path fill="#FBBC05" d="M5.2 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2L1.3 7C.5 8.6 0 10.2 0 12s.5 3.4 1.3 5l3.9-2.8z" /><path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.3 0 3.3 3 1.3 7l3.9 2.8c.9-3 3.6-5.1 6.8-5.1z" /></svg>
                {t(locale, 'auth.google')}
              </a>
            </>
          ) : null}
          <p className="auth-switch">
            {mode === 'register' ? (
              <>{t(locale, 'auth.hasAccount')}<button type="button" className="text-btn" onClick={() => { setMode('login'); setError(''); }}>{t(locale, 'auth.goLogin')}</button></>
            ) : (
              <>{t(locale, 'auth.noAccount')}<button type="button" className="text-btn" onClick={() => { setMode('register'); setError(''); }}>{t(locale, 'auth.goRegister')}</button></>
            )}
          </p>
        </div>
      </dialog>
    </>
  );
}
