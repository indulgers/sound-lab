/**
 * 从本地沙箱配置生成 .dev.vars（本地开发专用）。
 *
 * 用法：npm run sync-dev-vars
 *
 * 读取项目根目录的 .alipay-sandbox.json（由 Alipay Skill 沙箱流程写入，
 * 凭据在 appIds[0]；顶层字段优先，缺失时回退到 appIds[0]——与
 * sound-cocktail-pay-server/src/config.js 的回退逻辑一致），
 * 生成 .dev.vars 供 vite dev / vite preview（workerd）读取。
 *
 * 注意：
 * - Workers 没有文件系统，服务器代码只能读环境变量，不能直接读
 *   .alipay-sandbox.json；这个脚本是两者之间的桥梁，只在开发机上运行。
 * - .dev.vars 和 .alipay-sandbox.json 都已加入 .gitignore，绝不提交。
 * - 本脚本只打印变量名，绝不打印任何凭据值。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SANDBOX_PATH = resolve(PROJECT_ROOT, '.alipay-sandbox.json')
const PAY_SERVER_PATH = resolve(PROJECT_ROOT, '..', 'sound-cocktail-pay-server', '.alipay-sandbox.json')
const DEV_VARS_PATH = resolve(PROJECT_ROOT, '.dev.vars')

function loadSandboxConfig() {
  const path = existsSync(SANDBOX_PATH) ? SANDBOX_PATH : PAY_SERVER_PATH
  if (!existsSync(path)) {
    throw new Error(`未找到沙箱配置：${SANDBOX_PATH}（或 ${PAY_SERVER_PATH}）。请先按 Skill 沙箱流程完成沙箱配置。`)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

function dotenvValue(value) {
  // 双引号内 \n 会被 dotenv 解析为换行；私钥是多行 PEM，必须这样处理。
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')}"`
}

const raw = loadSandboxConfig()
const primary = raw.appIds && Array.isArray(raw.appIds) && raw.appIds[0] ? raw.appIds[0] : {}
const appId = raw.appId || primary.appId
const privateKey = raw.appPrivatePkcsKey || primary.appPrivatePkcsKey
const alipayPublicKey = raw.alipayPublicKey || primary.alipayPublicKey
const gateway = raw.gateway || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do'
const sellerId = raw.sellerId || primary.pid || ''
const sellerEmail = raw.sellerEmail || ''

const missing = []
if (!appId) missing.push('appId')
if (!privateKey) missing.push('appPrivatePkcsKey')
if (!alipayPublicKey) missing.push('alipayPublicKey')
if (missing.length > 0) {
  throw new Error(`沙箱配置文件缺少必填字段：${missing.join('、')}。`)
}

const lines = [
  '# 本地开发用支付宝沙箱配置，由 npm run sync-dev-vars 从 .alipay-sandbox.json 生成。',
  '# 含私钥，绝不提交；生产用 wrangler secret put 设置。',
  `ALIPAY_APP_ID=${appId}`,
  `ALIPAY_APP_PRIVATE_KEY_PKCS1=${dotenvValue(privateKey)}`,
  `ALIPAY_PUBLIC_KEY=${dotenvValue(alipayPublicKey)}`,
  `ALIPAY_GATEWAY=${gateway}`,
]
if (sellerId) lines.push(`ALIPAY_SELLER_ID=${sellerId}`)
if (sellerEmail) lines.push(`ALIPAY_SELLER_EMAIL=${sellerEmail}`)

writeFileSync(DEV_VARS_PATH, `${lines.join('\n')}\n`, { mode: 0o600 })
console.log(`已写入 .dev.vars（变量：${lines.filter((l) => l.startsWith('ALIPAY_')).map((l) => l.split('=')[0]).join('、')}；凭据值未打印）。`)
