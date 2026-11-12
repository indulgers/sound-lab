/**
 * 账号后端调用（同源 /api）。
 *
 * 登录态靠 HttpOnly Cookie（SameSite=Lax），所以这里的请求都带
 * credentials: 'same-origin'；登录/注册的响应体里也带 token，
 * 供小程序等 Bearer 客户端使用，网页端不需要保存它。
 */

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

async function authJson(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    const error = new Error('无法连接服务器，请检查网络后重试。');
    error.cause = err;
    throw error;
  }
  if (!response.ok) throw await readError(response, '请求失败。');
  return response.json();
}

/** GET /api/auth/me：当前登录用户；未登录时抛 401。 */
export function fetchMe() {
  return authJson('/api/auth/me');
}

/** GET /api/auth/providers：哪些登录方式已配置 { email, google }。 */
export function fetchProviders() {
  return authJson('/api/auth/providers');
}

/** GET /api/entitlements：当前用户已拥有的包 { packs: [...] }。 */
export function fetchEntitlements() {
  return authJson('/api/entitlements');
}

/** POST /api/auth/register：注册并登录。成功返回 { userId, email, token }。 */
export function register(email, password) {
  return authJson('/api/auth/register', { method: 'POST', body: { email, password } });
}

/** POST /api/auth/login：登录。成功返回 { userId, email, token }。 */
export function login(email, password) {
  return authJson('/api/auth/login', { method: 'POST', body: { email, password } });
}

/** POST /api/auth/logout：退出并清除 Cookie。 */
export function logout() {
  return authJson('/api/auth/logout', { method: 'POST', body: {} });
}
