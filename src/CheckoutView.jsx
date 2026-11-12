import { useEffect, useRef, useState } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { findPack } from './packs.mjs';
import { createPayment, fetchProducts } from './pay-api.js';

/**
 * 结账页（路由 /checkout?pack=<id>）。
 *
 * 流程：展示订单摘要 → 点击「去支付宝付款」POST /api/pay/create →
 * 成功时把后端返回的 HTML 支付表单渲染出来并提交，浏览器跳转到支付宝；
 * 失败（例如沙箱未配置的 503）如实展示，不伪装成功。
 * 支付成功只认后端异步通知或交易查询，本页不判定支付结果。
 */
export default function CheckoutView() {
  const { pack: packId } = useSearch({ from: '/checkout' });
  const pack = findPack(packId);
  const formHostRef = useRef(null);

  const [serverPrice, setServerPrice] = useState(null);
  const [priceNote, setPriceNote] = useState('');
  const [status, setStatus] = useState('idle'); // idle | creating | redirecting | error
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);

  // 先向后端校验服务端价格；校验失败时用页面标价，并如实注明。
  useEffect(() => {
    if (!pack) return;
    let cancelled = false;
    fetchProducts()
      .then((products) => {
        if (cancelled) return;
        const serverPack = products.find((item) => item.productId === pack.id);
        if (serverPack) setServerPrice(serverPack.totalAmount);
        else setPriceNote('服务端商品目录里没有这个包，以下为页面标价。');
      })
      .catch(() => {
        if (!cancelled) setPriceNote('未能从服务端校验价格，以下为页面标价；付款前请确认支付后端已启动。');
      });
    return () => { cancelled = true; };
  }, [pack]);

  // 订单创建成功后，把支付宝返回的 HTML 表单渲染出来并提交。
  // innerHTML 插入的 <script> 不会执行，所以这里手动提交表单。
  useEffect(() => {
    if (status !== 'redirecting' || !order?.paymentHtml || !formHostRef.current) return;
    formHostRef.current.innerHTML = order.paymentHtml;
    const form = formHostRef.current.querySelector('form');
    if (form) {
      form.submit();
    } else {
      setError({ code: 'PAYMENT_FORM_MISSING', message: '支付表单返回异常，未找到可提交的表单。' });
      setStatus('error');
    }
  }, [status, order]);

  async function handlePay() {
    if (!pack || status === 'creating' || status === 'redirecting') return;
    setStatus('creating');
    setError(null);
    try {
      const data = await createPayment(pack.id);
      setOrder(data);
      setStatus('redirecting');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }

  const price = serverPrice ?? pack?.price ?? '';
  const busy = status === 'creating' || status === 'redirecting';

  return (
    <div className="checkout">
      <div className="checkout-inner">
        <div className="sec-head"><h2>结账</h2><span className="en">checkout</span></div>

        {!pack ? (
          <div className="card">
            <h3>没有这个商品</h3>
            <p>链接里的商品不存在，可能是地址写错了。</p>
            <div className="row">
              <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>← 返回继续调音</Link>
            </div>
          </div>
        ) : (
          <div className="card">
            <h3>{pack.name} <span className="tag">一次性买断</span></h3>
            <p>{pack.desc}</p>

            <div className="sum">
              <div className="sum-row"><span className="k">商品</span><span>{pack.name}</span></div>
              <div className="sum-row"><span className="k">单价</span><span>¥{price}</span></div>
              <div className="sum-row"><span className="k">数量</span><span>1</span></div>
              <div className="sum-row total"><span className="k">合计</span><span>¥{price}</span></div>
            </div>

            <div className="sum-row"><span className="k">支付方式</span><span>支付宝</span></div>
            {priceNote ? <p className="fine">{priceNote}</p> : null}
            <p className="fine">虚拟商品，一次购买。付款后按订单开通；支付结果以支付宝回跳后的服务端确认为准。</p>

            {status === 'error' && error ? (
              <div className="err-box" role="alert">
                <h4>{error.code === 'PAYMENT_NOT_CONFIGURED' ? '支付尚未开通配置' : '下单失败'}</h4>
                <p>{error.message}</p>
                {error.code ? <p>错误码：{error.code}{error.status ? `（HTTP ${error.status}）` : ''}</p> : null}
              </div>
            ) : null}

            {order ? <p className="fine">订单号：{order.outTradeNo}</p> : null}

            <div className="row">
              <button type="button" className="btn btn-primary" onClick={handlePay} disabled={busy}>
                {status === 'creating' ? '正在创建订单…' : status === 'redirecting' ? '正在跳转到支付宝…' : '去支付宝付款'}
              </button>
              <Link to="/" className="btn btn-ghost" style={{ textDecoration: 'none' }}>← 返回继续调音</Link>
            </div>
            <div ref={formHostRef} aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
