/**
 * 支付后端调用。
 *
 * 地址：VITE_PAY_API_URL 指向已部署的支付后端；未设置时走同源 /api，
 * 由 TanStack Start 服务器路由（src/routes/api/*）在同一个 Worker 里提供。
 * 不直接默认 http://localhost:3000：支付后端不发 CORS 头，
 * 浏览器从本站跨源请求会被拦截，改走同源才能读到 503 等响应。
 */

export const PAY_API_BASE = (import.meta.env.VITE_PAY_API_URL ?? '').replace(/\/+$/, '');

export function payApiUrl(path) {
  return `${PAY_API_BASE}${path}`;
}

function payApiHint() {
  return PAY_API_BASE ? `支付后端 ${PAY_API_BASE}` : '支付后端（同源 /api，由本站服务器路由提供）';
}

/** 解析后端返回的 JSON 错误体；解析失败时退回 HTTP 状态。 */
async function readError(response, fallbackMessage) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const err = new Error((body && body.message) || fallbackMessage || `请求失败（HTTP ${response.status}）`);
  err.status = response.status;
  err.code = (body && body.code) || null;
  return err;
}

/** GET /api/products：服务端商品目录（价格的唯一可信来源）。locale=en 时返回美元价。 */
export async function fetchProducts(locale) {
  const query = locale === 'en' ? '?locale=en' : '';
  let response;
  try {
    response = await fetch(payApiUrl(`/api/products${query}`));
  } catch (err) {
    const error = new Error(`无法连接支付服务：${payApiHint()}。请确认支付后端已启动。`);
    error.cause = err;
    throw error;
  }
  if (!response.ok) throw await readError(response, '商品目录读取失败。');
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
    const error = new Error(`无法连接支付服务：${payApiHint()}。请确认支付后端已启动。`);
    error.cause = err;
    throw error;
  }
  if (!response.ok) throw await readError(response, '下单失败。');
  return response.json();
}

/**
 * POST /api/waffo/create：海外版下单（Waffo Pancake），只传 productId。
 * 成功返回 { outTradeNo, productId, totalAmount, currency: 'USD',
 * checkoutUrl, sessionId, expiresAt }；checkoutUrl 是 Waffo 托管的
 * 收银台地址。未配置时后端返回 503 WAFFO_NOT_CONFIGURED。
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
    const error = new Error(`无法连接支付服务：${payApiHint()}。请确认支付后端已启动。`);
    error.cause = err;
    throw error;
  }
  if (!response.ok) throw await readError(response, '下单失败。');
  return response.json();
}
