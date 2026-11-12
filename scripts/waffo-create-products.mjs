/**
 * Waffo Pancake 测试商品创建脚本（一次性设置用）。
 *
 * 用法：node scripts/waffo-create-products.mjs
 * 读本地 .dev.vars 里的 WAFFO_MERCHANT_ID / WAFFO_STORE_ID /
 * WAFFO_PRIVATE_KEY（测试环境），在指定店铺下创建三个一次性商品
 * （Focus Pack $1.99 / Sleep Pack $2.99 / Rain Night Pack $3.99），
 * 把返回的 Product ID 写回 .dev.vars。
 *
 * 安全：
 * - 只读本地 .dev.vars，不打印、不记录任何密钥或 Merchant ID；
 *   输出只有商品名和 Product ID（公开标识符）。
 * - 商品默认建在测试环境；不要在这里调用 .publish()（生产发布
 *   是单向操作，等用户决定后再说）。
 * - 已存在 Product ID 时跳过创建，避免重复建商品。
 */
import { readFileSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { WaffoPancake } from '@waffo/pancake-ts'

const PROJECT_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const DEV_VARS = path.join(PROJECT_ROOT, '.dev.vars')

function readDevVars() {
  const vars = {}
  for (const line of readFileSync(DEV_VARS, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return vars
}

const PRODUCTS = [
  { envKey: 'WAFFO_PRODUCT_FOCUS_PACK', name: 'Focus Pack', amount: '1.99', pack: 'focus-pack' },
  { envKey: 'WAFFO_PRODUCT_SLEEP_PACK', name: 'Sleep Pack', amount: '2.99', pack: 'sleep-pack' },
  { envKey: 'WAFFO_PRODUCT_RAIN_NIGHT_PACK', name: 'Rain Night Pack', amount: '3.99', pack: 'rain-night-pack' },
]

const vars = readDevVars()
const merchantId = vars.WAFFO_MERCHANT_ID
const storeId = vars.WAFFO_STORE_ID
const privateKey = vars.WAFFO_PRIVATE_KEY
if (!merchantId || !storeId || !privateKey) {
  console.error('缺少 WAFFO_MERCHANT_ID / WAFFO_STORE_ID / WAFFO_PRIVATE_KEY（见 .dev.vars）。')
  process.exit(1)
}

const client = new WaffoPancake({ merchantId, privateKey, environment: 'test' })

const created = []
for (const def of PRODUCTS) {
  if (vars[def.envKey]) {
    console.log(`${def.name}: 已有 ${def.envKey}，跳过创建。`)
    created.push({ ...def, id: vars[def.envKey] })
    continue
  }
  const { product } = await client.onetimeProducts.create({
    storeId,
    name: def.name,
    prices: { USD: { amount: def.amount, taxCategory: 'digital_goods' } },
    successUrl: 'https://soundcocktail.app/waffo-return',
    metadata: { pack: def.pack },
  })
  console.log(`${def.name}: ${product.id}`)
  created.push({ ...def, id: product.id })
  appendFileSync(DEV_VARS, `\n${def.envKey}=${product.id}\n`)
}

console.log('完成：3 个测试商品已就绪（未发布到生产）。')
