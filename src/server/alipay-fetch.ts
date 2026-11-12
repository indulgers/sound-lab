/**
 * 支付宝服务端 API 调用（fetch 传输版）。
 *
 * 为什么需要它：
 * alipay-sdk 4.14.0 的 exec() 用 urllib 4（undici）发 HTTPS 请求，
 * undici 在 Cloudflare Workers 里会因 `The options.ALPNProtocols option
 * is not implemented` 而失败（2026-11-12 本地 workerd 实测：
 * POST /api/pay/create 的 pageExec 纯签名可用，但 exec 的查询/退款/
 * 关闭全部报此错）。SDK 的 pageExec（纯签名，无网络）和
 * checkNotifySignV2（纯验签，无网络）不受影响，继续用 SDK。
 *
 * 本模块只替换 exec() 的 HTTP 传输层，签名与验签算法与 SDK 逐行一致：
 * - 请求签名：alipay-sdk util.js 的 sign()——参数 snake_case 后排序，
 *   `k=v&...` 拼接，createSign('RSA-SHA256') + PKCS#1 私钥，base64；
 * - URL 拼接：alipay.js 的 formatUrl()——app_id/method/charset/sign 等
 *   放 query，biz_content 放 POST body（form-urlencoded）；
 * - 响应验签：alipay.js 的 checkResponseSign() + getSignStr()——
 *   从原始响应文本截取 xxx_response 段，createVerify('RSA-SHA256')
 *   + 支付宝公钥验签。带 sign 的响应必验签（比 SDK 默认更严）；
 *   无 sign 的 error_response 直接返回（与 SDK 默认行为一致）。
 * - 密钥归一化：alipay.js 的 formatKey()——沙箱配置里的密钥是
 *   不带 PEM 头尾的裸 base64，验签/签名之前要包上 BEGIN/END 行。
 *
 * 与 SDK 的一个有意区别：本模块返回支付宝原始响应对象（snake_case），
 * 不做 camelCase 转换。SDK 默认 camelcase: true，会把 trade_status
 * 转成 tradeStatus，导致按 Express 版写法读 result.trade_status
 * 永远是 undefined（Express 版因 VM 网络限制从未真正跑通过查询，
 * 这个问题一直没暴露）。路由代码按 Express 版的 snake_case 字段名
 * 读取，本模块返回原始字段名，两者正好对上；对外 API 的 JSON 形状不变。
 */
import { createSign, createVerify } from 'node:crypto'
import type { PayConfig } from './config'
import { formatAlipayTimestamp } from './amounts'

const ALGORITHM = 'RSA-SHA256'
const EXEC_TIMEOUT_MS = 20000
const EXEC_MAX_ATTEMPTS = 2

// SDK formatKey() 的翻版：去掉已有的 BEGIN/END 行，重新包上。
function formatKey(key: string, type: string): string {
  const item = key.split('\n').map((val) => val.trim())
  if (item[0].includes(type)) item.shift()
  if (item[item.length - 1].includes(type)) item.pop()
  return `-----BEGIN ${type}-----\n${item.join('')}\n-----END ${type}-----`
}

// SDK getSignStr() 的翻版：从原始响应文本截取待验签的 xxx_response 段。
function getSignStr(originStr: string, responseKey: string): string {
  let validateStr = originStr.trim()
  const startIndex = originStr.indexOf(`${responseKey}"`)
  const lastIndex = originStr.lastIndexOf('"sign"')
  validateStr = validateStr.substring(startIndex + responseKey.length + 1)
  validateStr = validateStr.substring(0, lastIndex)
  validateStr = validateStr.replace(/^[^{]*{/g, '{')
  validateStr = validateStr.replace(/\}([^}]*)$/g, '}')
  return validateStr
}

function buildSignedParams(
  method: string,
  bizContent: Record<string, unknown>,
  cfg: PayConfig,
): { url: string; execParams: Record<string, string> } {
  // 与 SDK sign() 的 decamelize 结果一致：key 直接写 snake_case。
  const signParams: Record<string, string> = {
    method,
    app_id: cfg.appId,
    charset: 'utf-8',
    version: '1.0',
    sign_type: 'RSA2',
    timestamp: formatAlipayTimestamp(new Date()),
    biz_content: JSON.stringify(bizContent),
  }
  const signString = Object.keys(signParams)
    .sort()
    .map((key) => `${key}=${signParams[key]}`)
    .join('&')
  const privateKeyPem = formatKey(cfg.privateKey, 'RSA PRIVATE KEY')
  signParams.sign = createSign(ALGORITHM).update(signString, 'utf8').sign(privateKeyPem, 'base64')

  // 与 SDK formatUrl() 一致：这些参数放 URL，其余放 body。
  const urlArgs = new Set([
    'app_id',
    'method',
    'format',
    'charset',
    'sign_type',
    'sign',
    'timestamp',
    'version',
    'notify_url',
    'return_url',
    'auth_token',
    'app_auth_token',
    'app_cert_sn',
    'alipay_root_cert_sn',
    'ws_service_url',
  ])
  const requestUrl = new URL(cfg.gateway)
  const execParams: Record<string, string> = {}
  for (const key of Object.keys(signParams)) {
    if (urlArgs.has(key)) requestUrl.searchParams.set(key, signParams[key])
    else execParams[key] = signParams[key]
  }
  return { url: requestUrl.toString(), execParams }
}

/**
 * 调用一个支付宝服务端 API（alipay.trade.query / refund / close 等）。
 * 成功返回支付宝原始响应对象（snake_case 字段，如 code/trade_status）；
 * 失败抛错（HTTP 非 200、响应格式错误、验签失败）。
 */
export async function alipayApiCall(
  cfg: PayConfig,
  method: string,
  bizContent: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { url, execParams } = buildSignedParams(method, bizContent, cfg)

  // 沙箱网关单次调用常要 2–5 秒，5 秒超时约一半请求会断；放宽到 20 秒，
  // 网络/超时失败再重试一次（query/refund/close 都是幂等调用）。
  let httpResponse: Response | undefined
  let lastErr: unknown
  for (let attempt = 1; attempt <= EXEC_MAX_ATTEMPTS; attempt++) {
    try {
      httpResponse = await fetch(url, {
        method: 'POST',
        body: new URLSearchParams(execParams),
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(EXEC_TIMEOUT_MS),
      })
      break
    } catch (err) {
      lastErr = err
      if (attempt === EXEC_MAX_ATTEMPTS) {
        throw new Error(`HttpClient Request error: ${err instanceof Error ? err.message : String(err)}`)
      }
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  if (!httpResponse) {
    throw new Error(`HttpClient Request error: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`)
  }

  const rawText = await httpResponse.text()
  const traceId = httpResponse.headers.get('trace_id') || undefined
  if (httpResponse.status !== 200) {
    throw new Error(`HTTP 请求错误, status: ${httpResponse.status}`)
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(rawText) as Record<string, unknown>
  } catch (err) {
    throw new Error(`Response 格式错误：${err instanceof Error ? err.message : String(err)}`)
  }

  const responseKey = `${method.replaceAll('.', '_')}_response`
  const data = (parsed[responseKey] ?? parsed.error_response) as Record<string, unknown> | undefined
  if (!data) {
    throw new Error(`Response 格式错误，返回值 ${responseKey} 找不到`)
  }

  // 带 sign 的响应必验签；无 sign 的 error_response 直接返回。
  const serverSign = parsed.sign
  if (typeof serverSign === 'string' && serverSign) {
    const publicKeyPem = formatKey(cfg.alipayPublicKey, 'PUBLIC KEY')
    const validateStr = getSignStr(rawText, responseKey)
    const verifier = createVerify(ALGORITHM)
    verifier.update(validateStr, 'utf8')
    const ok = verifier.verify(publicKeyPem, serverSign, 'base64')
    if (!ok) {
      throw new Error(`验签失败，服务端返回的 sign 无效，validateStr: '${validateStr}'`)
    }
  }

  if (traceId) data.traceId = traceId
  return data
}
