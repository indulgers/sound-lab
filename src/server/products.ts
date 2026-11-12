/**
 * Sound Cocktail 商品目录（服务端定价，唯一可信来源）。
 *
 * 价格、商品名由服务端决定，前端只传 productId，不得信任前端传来的金额。
 * 与 Express 版（sound-cocktail-pay-server/src/products.js）完全一致：
 * 三档解锁包（演示价，与原型一致）。
 *
 * 双币种：CNY 走支付宝，USD 走 Waffo Pancake（海外版）。
 * USD 定价 2026-11-12 由用户确认：focus $1.99 / sleep $2.99 / rain-night $3.99
 * （保持 6:9:12 的档位比例；Waffo 每笔收 3.9% + $0.50，直接按汇率换算
 * 只有 $0.85/$1.27/$1.70，固定费会吃掉一半以上，所以不定低价）。
 */
export type Currency = 'CNY' | 'USD'

export interface Product {
  productId: string
  name: string
  subject: string
  /** CNY 金额（支付宝用）。 */
  totalAmount: string
  /** USD 金额（Waffo 用，显示金额字符串，不是分）。 */
  totalAmountUsd: string
}

const PRODUCTS: Record<string, Product> = {
  'sleep-pack': {
    productId: 'sleep-pack',
    name: '助眠包',
    subject: 'Sound Cocktail · 助眠包',
    totalAmount: '9.00',
    totalAmountUsd: '2.99',
  },
  'focus-pack': {
    productId: 'focus-pack',
    name: '专注包',
    subject: 'Sound Cocktail · 专注包',
    totalAmount: '6.00',
    totalAmountUsd: '1.99',
  },
  'rain-night-pack': {
    productId: 'rain-night-pack',
    name: '雨夜包',
    subject: 'Sound Cocktail · 雨夜包',
    totalAmount: '12.00',
    totalAmountUsd: '3.99',
  },
}

export function getProduct(productId: string): Product | null {
  return PRODUCTS[productId] || null
}

/** 取指定币种的金额（服务端决定；未知币种回落到 CNY）。 */
export function productAmount(product: Product, currency: Currency): string {
  return currency === 'USD' ? product.totalAmountUsd : product.totalAmount
}

export function normalizeCurrency(value: unknown): Currency {
  return String(value || '').trim().toUpperCase() === 'USD' ? 'USD' : 'CNY'
}

export function listProducts(
  currency: Currency = 'CNY',
): Array<{ productId: string; name: string; totalAmount: string; currency: Currency }> {
  return Object.values(PRODUCTS).map((p) => ({
    productId: p.productId,
    name: p.name,
    totalAmount: productAmount(p, currency),
    currency,
  }))
}
