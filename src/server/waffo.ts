/**
 * Waffo Pancake 配置与客户端（海外版支付，Workers 版）。
 *
 * 环境变量（只用这几个名字，不要另发明）：
 *   WAFFO_MERCHANT_ID            商户 ID（MER_...，公开标识外的配置值）
 *   WAFFO_PRIVATE_KEY            RSA 私钥：SDK 自动归一化原始 base64、
 *                                PEM 头尾、字面 \n、Windows 换行；
 *                                构造器在密钥无效时立即抛错。
 *   WAFFO_PRODUCT_FOCUS_PACK     Focus Pack 的 Product ID（PROD_...）
 *   WAFFO_PRODUCT_SLEEP_PACK     Sleep Pack 的 Product ID
 *   WAFFO_PRODUCT_RAIN_NIGHT_PACK Rain Night Pack 的 Product ID
 *   WAFFO_ENV                    'test'（默认）或 'prod'
 *
 * 本地开发由 .dev.vars 提供；生产由 wrangler secret put 设置。
 * 私钥只在服务端使用，绝不返回给前端、不写日志、不进代码。
 *
 * 参考：https://docs.waffo.ai/zh/integrate/skill
 * SDK：@waffo/pancake-ts（零依赖，fetch + node:crypto；workerd 下
 * nodejs_compat 默认开启，实测可用，见 tests/waffo.test.mjs）。
 */
import { WaffoPancake } from '@waffo/pancake-ts'
import { jsonError } from './pay-shared.ts'

export type WaffoEnv = 'test' | 'prod'

export interface WaffoConfig {
  configured: true
  merchantId: string
  privateKey: string
  env: WaffoEnv
  productIds: Record<string, string>
}

export interface WaffoConfigMissing {
  configured: false
  error: 'WAFFO_NOT_CONFIGURED'
  message: string
  missing: string[]
}

export type ResolvedWaffoConfig = WaffoConfig | WaffoConfigMissing

export interface WaffoEnvLike {
  WAFFO_MERCHANT_ID?: string
  WAFFO_PRIVATE_KEY?: string
  WAFFO_PRODUCT_FOCUS_PACK?: string
  WAFFO_PRODUCT_SLEEP_PACK?: string
  WAFFO_PRODUCT_RAIN_NIGHT_PACK?: string
  WAFFO_ENV?: string
}

/** WAFFO_ENV 只认 'prod'，其余一律按 'test' 处理。 */
export function normalizeWaffoEnv(value: unknown): WaffoEnv {
  return String(value || '').trim().toLowerCase() === 'prod' ? 'prod' : 'test'
}

export function resolveWaffoConfig(env: WaffoEnvLike): ResolvedWaffoConfig {
  const merchantId = (env.WAFFO_MERCHANT_ID || '').trim()
  const privateKey = (env.WAFFO_PRIVATE_KEY || '').trim()
  const focusPack = (env.WAFFO_PRODUCT_FOCUS_PACK || '').trim()
  const sleepPack = (env.WAFFO_PRODUCT_SLEEP_PACK || '').trim()
  const rainNightPack = (env.WAFFO_PRODUCT_RAIN_NIGHT_PACK || '').trim()

  const missing: string[] = []
  if (!merchantId) missing.push('WAFFO_MERCHANT_ID')
  if (!privateKey) missing.push('WAFFO_PRIVATE_KEY')
  if (!focusPack) missing.push('WAFFO_PRODUCT_FOCUS_PACK')
  if (!sleepPack) missing.push('WAFFO_PRODUCT_SLEEP_PACK')
  if (!rainNightPack) missing.push('WAFFO_PRODUCT_RAIN_NIGHT_PACK')
  if (missing.length > 0) {
    return {
      configured: false,
      error: 'WAFFO_NOT_CONFIGURED',
      message: `Waffo payment is not configured: missing ${missing.join(', ')}. Set them with wrangler secret put (see README).`,
      missing,
    }
  }

  return {
    configured: true,
    merchantId,
    privateKey,
    env: normalizeWaffoEnv(env.WAFFO_ENV),
    productIds: {
      'focus-pack': focusPack,
      'sleep-pack': sleepPack,
      'rain-night-pack': rainNightPack,
    },
  }
}

/** 取某个包对应的 Waffo Product ID；未配置返回 null。 */
export function getWaffoProductId(cfg: WaffoConfig, packId: string): string | null {
  return cfg.productIds[packId] || null
}

/**
 * 构造 SDK 客户端。SDK 构造器会立即校验私钥格式，
 * 无效密钥抛错（调用方应转为 503 WAFFO_CONFIG_INVALID）。
 */
export function createWaffoClient(cfg: WaffoConfig): WaffoPancake {
  return new WaffoPancake({
    merchantId: cfg.merchantId,
    privateKey: cfg.privateKey,
    environment: cfg.env,
  })
}

export function waffoNotConfiguredResponse(missing: string[]): Response {
  return jsonError(
    503,
    'WAFFO_NOT_CONFIGURED',
    `Waffo payment is not configured: missing ${missing.join(', ')}. Set them with wrangler secret put (see README).`,
    { missing },
  )
}

/** 私钥格式错（SDK 构造器抛错）时的 503。 */
export function waffoConfigInvalidResponse(): Response {
  return jsonError(
    503,
    'WAFFO_CONFIG_INVALID',
    'Waffo payment is misconfigured: the private key could not be parsed. Check WAFFO_PRIVATE_KEY.',
  )
}
