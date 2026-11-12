/**
 * Sound Cocktail 商品目录（服务端定价，唯一可信来源）。
 *
 * 价格、商品名由服务端决定，前端只传 productId，不得信任前端传来的金额。
 * 与 Express 版（sound-cocktail-pay-server/src/products.js）完全一致：
 * 三档解锁包（演示价，与原型一致）。
 */
export interface Product {
  productId: string
  name: string
  subject: string
  totalAmount: string
}

const PRODUCTS: Record<string, Product> = {
  'sleep-pack': {
    productId: 'sleep-pack',
    name: '助眠包',
    subject: 'Sound Cocktail · 助眠包',
    totalAmount: '9.00',
  },
  'focus-pack': {
    productId: 'focus-pack',
    name: '专注包',
    subject: 'Sound Cocktail · 专注包',
    totalAmount: '6.00',
  },
  'rain-night-pack': {
    productId: 'rain-night-pack',
    name: '雨夜包',
    subject: 'Sound Cocktail · 雨夜包',
    totalAmount: '12.00',
  },
}

export function getProduct(productId: string): Product | null {
  return PRODUCTS[productId] || null
}

export function listProducts(): Array<{ productId: string; name: string; totalAmount: string }> {
  return Object.values(PRODUCTS).map((p) => ({
    productId: p.productId,
    name: p.name,
    totalAmount: p.totalAmount,
  }))
}
