/**
 * 金额工具：与 Express 版（sound-cocktail-pay-server/src/alipay.js）完全一致。
 * 金额一律用“元”为单位、保留两位小数的字符串比较，禁止浮点数直接比较。
 */

export function formatAlipayTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 返回“元”为单位、保留两位小数的金额文本，例如 88.00；非法返回 null。 */
export function normalizeAmountText(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  const match = text.match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!match) return null
  return `${BigInt(match[1]).toString()}.${(match[2] || '').padEnd(2, '0')}`
}

export function amountEquals(expected: unknown, actual: unknown): boolean {
  const a = normalizeAmountText(expected)
  const b = normalizeAmountText(actual)
  return a !== null && a === b
}

/** 十进制定点加法（单位：分），避免浮点误差。 */
export function amountToCents(value: unknown): bigint | null {
  const text = normalizeAmountText(value)
  if (text === null) return null
  const [yuan, fen] = text.split('.')
  return BigInt(yuan) * 100n + BigInt(fen)
}

export function centsToAmountText(cents: bigint): string {
  const c = BigInt(cents)
  return `${(c / 100n).toString()}.${(c % 100n).toString().padStart(2, '0')}`
}
