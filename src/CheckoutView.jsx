import { useEffect, useRef, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { findPack, packDisplay } from './packs.mjs';
import { createPayment, createWaffoPayment, fetchProducts, fetchWaffoPending } from './pay-api.js';
import { checkoutConfig, useRegion } from './region.mjs';
import { localizePath, t, useLocale } from './locale.mjs';

/**
 * 结账页（路由 /en/checkout 与 /zh/checkout，?pack=<id>）。
 *
 * 文案语言与支付选择已解耦（2026-11-12 用户明确规则）：
 * - 文案只看 locale（浏览器语言自动判断，导航栏手动切换覆盖）；
 * - 支付渠道和金额只看支付地区 region（服务端 Cloudflare 国家，
 *   兜底时区 → 浏览器语言）：中国 → 支付宝 CNY，其他 → Waffo USD。
 *   手动切换语言绝不改支付方式和价格。
 * - 中文：支付宝。点击「去支付宝付款」POST /api/pay/create，成功时把后端
 *   返回的 HTML 支付表单渲染出来并提交，浏览器跳转到支付宝。
 * - 海外：Waffo Pancake。点击后 POST /api/waffo/create，成功时
 *   在新标签页打开 Waffo 托管收银台；付完按 successUrl 回到
 *   /waffo-return 确认，webhook 到账后发放权益。
 *   防重复付款：进页时先查进行中订单，有就展示“继续付款”续付
 *   原来的收银台；点击时再查一次；服务端下单时也会查一次兜底。
 *   注意：window.open 必须在点击处理里同步调用（先开空白页，拿到
 *   checkoutUrl 后再跳转），否则 Safari/移动端会拦截异步回调里的弹窗。
 * 失败（例如支付未配置的 503）如实展示，不伪装成功。
 * 支付成功只认后端异步通知或交易查询，本页不判定支付结果。
 * 下单需要登录：后端返回 401 时展示「请先登录」，点登录打开导航栏的
 * 登录框；登录成功后（soundcocktail:auth-changed 事件）自动重试下单。
 */
export default function CheckoutView() {
  // ?pack= 从路由状态读（两个语言路由共用本组件；useSearch 只能绑定
  // 一条 from 路径，/en/checkout 与 /zh/checkout 不能共用）。
  const { pack: packId } = useRouterState({ select: (state) => state.location.search });
  const pack = findPack(packId);
  const [locale] = useLocale();
  const { region } = useRegion();
  const cfg = checkoutConfig(region);
  const isWaffo = cfg.isWaffo;
  const display = packDisplay(pack, locale, cfg.currency);
  const formHostRef = useRef(null);

  const [serverPrice, setServerPrice] = useState(null);
  const [priceNote, setPriceNote] = useState('');
  const [status, setStatus] = useState('idle'); // idle | creating | redirecting | opened | error
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  // 进行中的 Waffo 订单（英文模式）：有未付款订单时展示“继续付款”，
  // 不再建新单（防重复付款）。服务端下单时也会再查一次，这里是前端的第一道防线。
  const [pendingOrder, setPendingOrder] = useState(null);

  // 先向后端校验服务端价格（按支付地区的币种）；校验失败时用页面标价，并如实注明。
  useEffect(() => {
    if (!pack) return;
    let cancelled = false;
    fetchProducts(locale, cfg.currency)
      .then((products) => {
        if (cancelled) return;
        const serverPack = products.find((item) => item.productId === pack.id);
        if (serverPack) setServerPrice(serverPack.totalAmount);
        else setPriceNote(t(locale, 'checkout.priceNoteMissing'));
      })
      .catch(() => {
        if (!cancelled) setPriceNote(t(locale, 'checkout.priceNoteUnverified'));
      });
    return () => { cancelled = true; };
  }, [pack, locale, cfg.currency]);

  // 海外地区：先查这个包有没有进行中的 Waffo 订单，有就展示“继续付款”。
  // 未登录时接口回 401，忽略即可（登录流程会处理）。
  useEffect(() => {
    if (!pack || !isWaffo) return;
    let cancelled = false;
    fetchWaffoPending()
      .then((orders) => {
        if (cancelled) return;
        const found = (orders || []).find((item) => item.productId === pack.id && item.checkoutUrl);
        if (found) setPendingOrder(found);
      })
      .catch(() => { /* 未登录或网络问题：下单时再处理 */ });
    return () => { cancelled = true; };
  }, [pack, isWaffo]);

  // 订单创建成功后，把支付宝返回的 HTML 表单渲染出来并提交。
  // innerHTML 插入的 <script> 不会执行，所以这里手动提交表单。
  useEffect(() => {
    if (status !== 'redirecting' || !order?.paymentHtml || !formHostRef.current) return;
    formHostRef.current.innerHTML = order.paymentHtml;
    const form = formHostRef.current.querySelector('form');
    if (form) {
      form.submit();
    } else {
      setError({ code: 'PAYMENT_FORM_MISSING', message: t(locale, 'checkout.formMissing') });
      setStatus('error');
    }
  }, [status, order]);

  async function handlePay() {
    if (!pack || status === 'creating' || status === 'redirecting' || status === 'opened') return;
    setStatus('creating');
    setError(null);
    setNeedsLogin(false);
    // 海外地区：先同步打开一个空白标签页（防弹窗拦截），拿到收银台地址后再跳转。
    const tab = isWaffo ? window.open('', '_blank') : null;
    try {
      if (isWaffo) {
        // 防重复付款：先用进行中的订单续付（页面加载时没登录、或订单是
        // 之后才建的，这里再查一次；服务端下单时还会再查一次兜底）。
        let pending = pendingOrder;
        if (pending && pending.expiresAt && Date.parse(pending.expiresAt) <= Date.now()) {
          pending = null;
          setPendingOrder(null);
        }
        if (!pending) {
          try {
            const orders = await fetchWaffoPending();
            pending = (orders || []).find((item) => item.productId === pack.id && item.checkoutUrl) || null;
            if (pending) setPendingOrder(pending);
          } catch (fetchErr) {
            // 401 = 未登录：继续走正常下单，后端会回 401 触发登录流程。
            if (!fetchErr || fetchErr.status !== 401) throw fetchErr;
          }
        }
        if (pending) {
          setOrder({ outTradeNo: pending.outTradeNo, checkoutUrl: pending.checkoutUrl });
          setStatus('opened');
          if (tab && !tab.closed) tab.location.href = pending.checkoutUrl;
          else window.location.href = pending.checkoutUrl;
          return;
        }
        const data = await createWaffoPayment(pack.id);
        setOrder(data);
        setStatus('opened');
        if (tab && !tab.closed) tab.location.href = data.checkoutUrl;
        else window.location.href = data.checkoutUrl;
      } else {
        const data = await createPayment(pack.id);
        setOrder(data);
        setStatus('redirecting');
      }
    } catch (err) {
      if (tab && !tab.closed) tab.close();
      // 401 = 未登录：打开登录框，等登录成功后自动重试（见下方的事件监听）。
      if (err.status === 401) {
        setError(err);
        setStatus('error');
        setNeedsLogin(true);
        return;
      }
      setError(err);
      setStatus('error');
    }
  }

  // 登录成功后自动重试下单（登录框在导航栏，由 AuthButton 发事件）。
  useEffect(() => {
    if (!needsLogin) return;
    function onAuthChanged() {
      setNeedsLogin(false);
      void handlePay();
    }
    window.addEventListener('soundcocktail:auth-changed', onAuthChanged);
    return () => window.removeEventListener('soundcocktail:auth-changed', onAuthChanged);
    // handlePay 每次渲染都会变，这里只在 needsLogin 变化时重绑，避免重复重试。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsLogin]);

  function openLogin() {
    window.dispatchEvent(new CustomEvent('soundcocktail:open-login'));
  }

  const price = serverPrice ?? display?.price ?? '';
  const symbol = cfg.symbol;
  const busy = status === 'creating' || status === 'redirecting';

  return (
    <div className="checkout">
      <div className="checkout-inner">
        <div className="sec-head"><h2>{t(locale, 'checkout.title')}</h2>{locale === 'en' ? <span className="en">{t(locale, 'checkout.en')}</span> : null}</div>

        {!pack ? (
          <div className="card">
            <h3>{t(locale, 'checkout.noProductTitle')}</h3>
            <p>{t(locale, 'checkout.noProductDesc')}</p>
            <div className="row">
              <Link to={localizePath('/', locale)} className="btn btn-primary" style={{ textDecoration: 'none' }}>{t(locale, 'checkout.back')}</Link>
            </div>
          </div>
        ) : (
          <div className="card">
            <h3>{display.name} <span className="tag">{t(locale, 'checkout.onceTag')}</span></h3>
            <p>{display.desc}</p>

            <div className="sum">
              <div className="sum-row"><span className="k">{t(locale, 'checkout.product')}</span><span>{display.name}</span></div>
              <div className="sum-row"><span className="k">{t(locale, 'checkout.price')}</span><span>{symbol}{price}</span></div>
              <div className="sum-row"><span className="k">{t(locale, 'checkout.quantity')}</span><span>1</span></div>
              <div className="sum-row total"><span className="k">{t(locale, 'checkout.total')}</span><span>{symbol}{price}</span></div>
            </div>

            <div className="sum-row"><span className="k">{t(locale, 'checkout.method')}</span><span>{isWaffo ? t(locale, 'checkout.waffo') : t(locale, 'checkout.alipay')}</span></div>
            {priceNote ? <p className="fine">{priceNote}</p> : null}
            <p className="fine">{isWaffo ? t(locale, 'checkout.noteWaffo') : t(locale, 'checkout.note')}</p>

            {status === 'error' && error ? (
              needsLogin ? (
                <div className="err-box" role="alert">
                  <h4>{t(locale, 'checkout.needLoginTitle')}</h4>
                  <p>{t(locale, 'checkout.needLoginDesc')}</p>
                  <div className="row" style={{ marginTop: '10px' }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={openLogin}>{t(locale, 'checkout.loginBtn')}</button>
                  </div>
                </div>
              ) : (
                <div className="err-box" role="alert">
                  <h4>{error.code === 'PAYMENT_NOT_CONFIGURED' || error.code === 'WAFFO_NOT_CONFIGURED' ? t(locale, 'checkout.notConfiguredTitle') : t(locale, 'checkout.failedTitle')}</h4>
                  <p>{error.message}</p>
                  {error.code ? <p>{t(locale, 'checkout.errorCode')}{error.code}{error.status ? t(locale, 'checkout.httpStatus', { status: error.status }) : ''}</p> : null}
                </div>
              )
            ) : null}

            {isWaffo && pendingOrder && status !== 'opened' ? (
              <div className="err-box" role="status" style={{ borderColor: '#7a9a52' }}>
                <h4>{t(locale, 'checkout.pendingTitle')}</h4>
                <p>{t(locale, 'checkout.pendingDesc')}</p>
                <p>{t(locale, 'checkout.orderNo')}{pendingOrder.outTradeNo}</p>
              </div>
            ) : null}

            {status === 'opened' && order ? (
              <div className="err-box" role="status" style={{ borderColor: '#7a9a52' }}>
                <p>{t(locale, 'checkout.openedNote')}</p>
                <p>{t(locale, 'checkout.orderNo')}{order.outTradeNo}</p>
              </div>
            ) : null}

            {order && status === 'redirecting' ? <p className="fine">{t(locale, 'checkout.orderNo')}{order.outTradeNo}</p> : null}

            <div className="row">
              <button type="button" className="btn btn-primary" onClick={handlePay} disabled={busy || status === 'opened'}>
                {status === 'creating' ? t(locale, 'checkout.creating') : status === 'redirecting' ? t(locale, 'checkout.redirecting') : status === 'opened' ? t(locale, 'checkout.openingCheckout') : pendingOrder ? t(locale, 'checkout.continuePay') : isWaffo ? t(locale, 'checkout.payWaffo') : t(locale, 'checkout.payAlipay')}
              </button>
              <Link to={localizePath('/', locale)} className="btn btn-ghost" style={{ textDecoration: 'none' }}>{t(locale, 'checkout.back')}</Link>
            </div>
            <div ref={formHostRef} aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
