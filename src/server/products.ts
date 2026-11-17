/**
 * Sound Cocktail 商品目录（服务端定价，唯一可信来源）。
 *
 * 价格、商品名由服务端决定，前端只传 productId，不得信任前端传来的金额。
 *
 * 2026-11-16 订阅模型（用户确认）：三个一次性声音包已下架（无人购买），
 * 改为订阅——月付 $7.99 / ¥18（30 天），年付 $79.90 / ¥180（365 天，
 * 年付 = 月费 ×10）。海外走 Waffo Pancake 订阅（自动续费），
 * 国内走支付宝 Vibe Pay 月卡/年卡（一次性购买，手动续费）。
 * CNY 价 ¥18/¥180 是 limer 2026-11-16 确认的国内价（¥58 占位价已否决：
 * 国内竞品 ¥18–28/月）。
 * 旧包的 productId（focus-pack / sleep-pack / rain-night-pack）
 * 不再出现在目录里；已发放的旧包权益仍保留在 entitlements 记录中
 * （见 server/auth.ts 的 legacy packs），不影响老用户。
 *
 * 双币种：CNY 走支付宝，USD 走 Waffo Pancake（海外版）。
 */
export type Currency = 'CNY' | 'USD'

export interface Product {
  productId: string
  name: string
  nameEn: string
  subject: string
  /** CNY 金额（支付宝用）。 */
  totalAmount: string
  /** USD 金额（Waffo 用，显示金额字符串，不是分）。 */
  totalAmountUsd: string
  /** 有效期天数（订阅用；一次性商品为 0）。 */
  durationDays: number
}

const PRODUCTS: Record<string, Product> = {
  'subscription-monthly': {
    productId: 'subscription-monthly',
    name: '订阅（月付）',
    nameEn: 'Subscription · Monthly',
    subject: 'Sound Cocktail · 订阅（月付）',
    totalAmount: '18.00',
    totalAmountUsd: '7.99',
    durationDays: 30,
  },
  'subscription-yearly': {
    productId: 'subscription-yearly',
    name: '订阅（年付）',
    nameEn: 'Subscription · Yearly',
    subject: 'Sound Cocktail · 订阅（年付）',
    totalAmount: '180.00',
    totalAmountUsd: '79.90',
    durationDays: 365,
  },
}

/** 旧的一次性包 productId（已下架，仅用于识别老订单/老权益）。 */
export const LEGACY_PACK_PRODUCT_IDS = ['focus-pack', 'sleep-pack', 'rain-night-pack']

export function getProduct(productId: string): Product | null {
  return PRODUCTS[productId] || null
}

export function isSubscriptionProduct(productId: string): boolean {
  return productId === 'subscription-monthly' || productId === 'subscription-yearly'
}

export function isLegacyPackProduct(productId: string): boolean {
  return LEGACY_PACK_PRODUCT_IDS.includes(productId)
}

/** 取指定币种的金额（服务端决定；未知币种回落到 CNY）。 */
export function productAmount(product: Product, currency: Currency): string {
  return currency === 'USD' ? product.totalAmountUsd : product.totalAmount
}

export function normalizeCurrency(value: unknown): Currency {
  return String(value || '').trim().toUpperCase() === 'USD' ? 'USD' : 'CNY'
}

/**
 * 商品目录。文案语言（locale）和金额币种（currency）是两个独立参数：
 * locale 只决定 name 用中文还是英文，currency 只决定金额。
 * 保持向后兼容：name 永远是中文名，nameEn 另给英文名。
 */
export function listProducts(
  currency: Currency = 'CNY',
  locale: string = 'zh',
): Array<{ productId: string; name: string; nameEn: string; totalAmount: string; currency: Currency; durationDays: number }> {
  const useEn = String(locale || '').trim().toLowerCase() === 'en'
  return Object.values(PRODUCTS).map((p) => ({
    productId: p.productId,
    name: useEn ? p.nameEn : p.name,
    nameEn: p.nameEn,
    totalAmount: productAmount(p, currency),
    currency,
    durationDays: p.durationDays,
  }))
}
