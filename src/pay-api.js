/**
 * 支付后端调用。
 *
 * 地址：VITE_PAY_API_URL 指向已部署的支付后端；未设置时走同源 /api，
 * 由 TanStack Start 服务器路由（src/routes/api/*）在同一个 Worker 里提供。
 * 不直接默认 http://localhost:3000：支付后端不发 CORS 头，
 * 浏览器从本站跨源请求会被拦截，改走同源才能读到 503 等响应。
 */

import { apiErrorMessage, getLocale, t } from './locale.mjs'

export const PAY_API_BASE = (import.meta.env.VITE_PAY_API_URL ?? '').replace(/\/+$/, '');

export function payApiUrl(path) {
  return `${PAY_API_BASE}${path}`;
}

function payApiHint() {
  return PAY_API_BASE
    ? t(getLocale(), 'api.payHintRemote', { base: PAY_API_BASE })
    : t(getLocale(), 'api.payHintLocal');
}

/** 解析后端返回的 JSON 错误体；解析失败时退回 HTTP 状态。
 * 有已知错误码时按码取本地文案（服务端 message 只有中文），
 * 否则用服务端原消息或本地兜底文案。 */
async function readError(response, fallbackMessage) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const message =
    apiErrorMessage(body && body.code, getLocale()) ||
    (body && body.message) ||
    fallbackMessage ||
    t(getLocale(), 'api.requestFailedHttp', { status: response.status });
  const err = new Error(message);
  err.status = response.status;
  err.code = (body && body.code) || null;
  return err;
}

/** 无法连接支付服务时的错误（网络层，服务端没机会回错误码）。 */
function payConnectError(cause) {
  const error = new Error(t(getLocale(), 'api.payConnectFailed', { hint: payApiHint() }));
  error.cause = cause;
  return error;
}

/** GET /api/products：服务端商品目录（价格的唯一可信来源）。
 * fetchProducts(locale, currency)：locale 只决定返回的 name 语言，
 * currency（按检测到的支付地区传）决定金额；currency 省略时服务端
 * 按旧规则从 locale 推导（en → USD，其他 → CNY）。 */
export async function fetchProducts(locale, currency) {
  const params = new URLSearchParams();
  if (locale) params.set('locale', locale);
  if (currency) params.set('currency', currency);
  const query = params.toString() ? `?${params.toString()}` : '';
  let response;
  try {
    response = await fetch(payApiUrl(`/api/products${query}`));
  } catch (err) {
    throw payConnectError(err);
  }
  if (!response.ok) throw await readError(response, t(getLocale(), 'api.productsFailed'));
  const data = await response.json();
  return Array.isArray(data.products) ? data.products : [];
}

/**
 * POST /api/pay/create：下单，只传 productId。
 * 成功返回 { outTradeNo, productId, totalAmount, paymentHtml }，
 * paymentHtml 是支付宝 pageExec 返回的 HTML 支付表单，需渲染并提交。
 * 沙箱未配置时后端明确返回 503 PAYMENT_NOT_CONFIGURED，不伪装成功。
 */
export async function createPayment(productId) {
  let response;
  try {
    response = await fetch(payApiUrl('/api/pay/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
  } catch (err) {
    throw payConnectError(err);
  }
  if (!response.ok) throw await readError(response, t(getLocale(), 'api.createFailed'));
  return response.json();
}

/**
 * POST /api/waffo/create：海外版下单（Waffo Pancake），只传 productId。
 * 成功返回 { outTradeNo, productId, totalAmount, currency: 'USD',
 * checkoutUrl, sessionId, expiresAt }；checkoutUrl 是 Waffo 托管的
 * 收银台地址。未配置时后端返回 503 WAFFO_NOT_CONFIGURED。
 * 已有未过期的进行中订单时返回 { resumed: true, checkoutUrl }，
 * 前端应续付原来的收银台，不要再建新单。
 */
export async function createWaffoPayment(productId) {
  let response;
  try {
    response = await fetch(payApiUrl('/api/waffo/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
  } catch (err) {
    throw payConnectError(err);
  }
  if (!response.ok) throw await readError(response, t(getLocale(), 'api.createFailed'));
  return response.json();
}

/**
 * GET /api/waffo/pending：当前登录用户进行中的 Waffo 订单。
 * 返回 { orders: [{ outTradeNo, productId, totalAmount, currency,
 * checkoutUrl, sessionId, expiresAt }] }；未登录时抛 401。
 */
export async function fetchWaffoPending() {
  let response;
  try {
    response = await fetch(payApiUrl('/api/waffo/pending'), { credentials: 'same-origin' });
  } catch (err) {
    throw payConnectError(err);
  }
  if (!response.ok) throw await readError(response, t(getLocale(), 'api.pendingFailed'));
  const data = await response.json();
  return Array.isArray(data.orders) ? data.orders : [];
}

/**
 * GET /api/waffo/order-status?order=<outTradeNo>：单个 Waffo 订单快查。
 * 返回 { status: 'PAID' | 'PENDING', outTradeNo, productId, granted? }。
 * Waffo 侧查不到成功付款时返回 PENDING；Waffo 接口出错时抛 502。
 */
export async function fetchWaffoOrderStatus(outTradeNo) {
  let response;
  try {
    response = await fetch(payApiUrl(`/api/waffo/order-status?order=${encodeURIComponent(outTradeNo)}`), { credentials: 'same-origin' });
  } catch (err) {
    throw payConnectError(err);
  }
  if (!response.ok) throw await readError(response, t(getLocale(), 'api.orderStatusFailed'));
  return response.json();
}
