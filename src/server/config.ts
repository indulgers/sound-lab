/**
 * 支付配置解析（Workers 版）。
 *
 * 与 Express 版的关键区别：
 * - Express 版从本地文件 `.alipay-sandbox.json` 读配置（Node.js 有 fs）。
 * - Workers 没有文件系统，配置只能来自环境变量：
 *   本地开发由 `.dev.vars` 提供（`npm run sync-dev-vars` 从本地
 *   `.alipay-sandbox.json` 生成，见 scripts/sync-dev-vars.mjs）；
 *   生产由 `wrangler secret put` 设置（见 README 部署一节）。
 * - 环境变量优先于一切；不回退示例值、占位密钥或生产网关。
 *
 * 字段命名与 Skill 沙箱流程一致：Node.js 用 appPrivatePkcsKey（PKCS#1），
 * 私钥值原样使用，禁止添加 PEM 头尾、前后缀、Base64 编解码或格式转换。
 */

export const SANDBOX_GATEWAY = 'https://openapi-sandbox.dl.alipaydev.com/gateway.do'

export interface PayEnv {
  ALIPAY_APP_ID?: string
  ALIPAY_APP_PRIVATE_KEY_PKCS1?: string
  ALIPAY_PUBLIC_KEY?: string
  ALIPAY_GATEWAY?: string
  ALIPAY_NOTIFY_URL?: string
  ALIPAY_SELLER_ID?: string
  ALIPAY_SELLER_EMAIL?: string
}

export interface PayConfig {
  configured: true
  appId: string
  privateKey: string
  alipayPublicKey: string
  gateway: string
  sellerId: string
  sellerEmail: string
  signType: 'RSA2'
}

export interface PayConfigMissing {
  configured: false
  error: 'PAYMENT_NOT_CONFIGURED' | 'PAYMENT_CONFIG_INVALID'
  message: string
}

export type ResolvedPayConfig = PayConfig | PayConfigMissing

export function resolvePayConfig(env: PayEnv): ResolvedPayConfig {
  const appId = (env.ALIPAY_APP_ID || '').trim()
  const privateKey = env.ALIPAY_APP_PRIVATE_KEY_PKCS1 || ''
  const alipayPublicKey = (env.ALIPAY_PUBLIC_KEY || '').trim()

  const missing: string[] = []
  if (!appId) missing.push('ALIPAY_APP_ID')
  if (!privateKey) missing.push('ALIPAY_APP_PRIVATE_KEY_PKCS1')
  if (!alipayPublicKey) missing.push('ALIPAY_PUBLIC_KEY')
  if (missing.length > 0) {
    return {
      configured: false,
      error: 'PAYMENT_NOT_CONFIGURED',
      message: `支付未配置：缺少环境变量 ${missing.join('、')}。本地开发请运行 npm run sync-dev-vars 从沙箱配置生成 .dev.vars；生产请用 wrangler secret put 设置。`,
    }
  }

  return {
    configured: true,
    appId,
    privateKey,
    alipayPublicKey,
    gateway: (env.ALIPAY_GATEWAY || '').trim() || SANDBOX_GATEWAY,
    sellerId: (env.ALIPAY_SELLER_ID || '').trim(),
    sellerEmail: (env.ALIPAY_SELLER_EMAIL || '').trim(),
    signType: 'RSA2',
  }
}

export function getNotifyUrl(env: PayEnv): string {
  return (env.ALIPAY_NOTIFY_URL || '').trim()
}
