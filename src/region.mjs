/**
 * 支付地区（payment region）与界面语言（UI locale）是两条独立的线，
 * 不要再把它们混在一起（2026-11-12 用户明确规则：手动切换语言只改
 * 文案，绝不改支付方式和价格）。
 *
 * - UI 语言：只看浏览器语言（navigator.language），手动切换覆盖自动
 *   判断并持久化（见 locale.mjs）。语言只决定文案，不决定货币和渠道。
 * - 支付地区：服务端优先取 Cloudflare 国家（request.cf.country 或
 *   cf-ipcountry 头），取不到时客户端按时区 → 浏览器语言兜底。
 *   CN → 支付宝 CNY；其他 → Waffo USD。地区没有手动切换入口。
 * - 价格展示跟支付地区走，不跟语言走：在国外的中文界面显示 $ 价，
 *   在中国的英文界面显示 ¥ 价；金额永远与实际要用的支付渠道一致。
 *
 * 本模块是唯一事实来源：服务端路由（/api/region）和客户端共用同一套
 * 纯函数；fetchRegion() 的服务端结果在同一次页面加载内缓存复用。
 */
import { useEffect, useState } from 'react'

export const CN_TIMEZONES = new Set([
  'Asia/Shanghai',
  'Asia/Chongqing',
  'Asia/Taipei',
  'Asia/Hong_Kong',
  'Asia/Macau',
])

/** 'cn' = 中国大陆及港澳台地区（走支付宝 CNY）；其他一律 'overseas'。 */
export function regionFromCountry(country) {
  return String(country || '').trim().toUpperCase() === 'CN' ? 'cn' : 'overseas'
}

export function regionFromTimeZone(timeZone) {
  return CN_TIMEZONES.has(String(timeZone || '').trim()) ? 'cn' : 'overseas'
}

export function regionFromLanguage(language) {
  return String(language || '').trim().toLowerCase().startsWith('zh') ? 'cn' : 'overseas'
}

/**
 * 按优先级判定地区：国家 > 时区 > 浏览器语言 > 默认 overseas。
 * 只返回第一个有信号的来源；调用方用 source 知道结论从哪来。
 */
export function detectRegion({ country, timeZone, languages } = {}) {
  if (country !== undefined && country !== null && String(country).trim() !== '') {
    return { region: regionFromCountry(country), source: 'country' }
  }
  if (timeZone !== undefined && timeZone !== null && String(timeZone).trim() !== '') {
    return { region: regionFromTimeZone(timeZone), source: 'timezone' }
  }
  const langs = Array.isArray(languages) ? languages : languages ? [languages] : []
  const first = langs.find((lang) => lang !== undefined && lang !== null && String(lang).trim() !== '')
  if (first !== undefined) {
    return { region: regionFromLanguage(first), source: 'language' }
  }
  return { region: 'overseas', source: 'default' }
}

/** 从服务端请求里取国家：request.cf.country 优先，cf-ipcountry 头兜底。 */
export function countryFromRequest(request) {
  if (!request) return null
  try {
    const cfCountry = request.cf && request.cf.country
    if (cfCountry && String(cfCountry).trim() !== '') return String(cfCountry).trim()
  } catch {
    // request.cf 在非 Workers 环境可能不存在。
  }
  try {
    const header = request.headers && request.headers.get('cf-ipcountry')
    if (header && String(header).trim() !== '') return String(header).trim()
  } catch {
    // headers 不可用时返回 null。
  }
  return null
}

/** 地区 → 币种。 */
export function currencyForRegion(region) {
  return region === 'cn' ? 'CNY' : 'USD'
}

/** 地区 → 支付渠道。 */
export function providerForRegion(region) {
  return region === 'cn' ? 'alipay' : 'waffo'
}

export function symbolForCurrency(currency) {
  return currency === 'USD' ? '$' : '¥'
}

/** 结账页的完整选择：只看地区，不看语言。 */
export function checkoutConfig(region) {
  const currency = currencyForRegion(region)
  return {
    region: region === 'cn' ? 'cn' : 'overseas',
    currency,
    provider: providerForRegion(region),
    symbol: symbolForCurrency(currency),
    isWaffo: region !== 'cn',
  }
}

/** 浏览器端同步兜底（时区 → 语言）：首屏渲染就能用，不用等网络。 */
export function detectRegionSync() {
  let timeZone = ''
  try {
    timeZone =
      (typeof Intl !== 'undefined' &&
        Intl.DateTimeFormat &&
        Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      ''
  } catch {
    timeZone = ''
  }
  let languages = []
  try {
    if (typeof navigator !== 'undefined') {
      languages = navigator.languages || (navigator.language ? [navigator.language] : [])
    }
  } catch {
    languages = []
  }
  return detectRegion({ timeZone, languages })
}

let regionPromise = null

/**
 * 取当前支付地区：先问服务端 GET /api/region（Cloudflare 国家最准），
 * 拿不到国家时用浏览器端兜底。同一次页面加载内只请求一次。
 * 返回 { country: string | null, region: 'cn' | 'overseas', source }。
 */
export function fetchRegion() {
  if (!regionPromise) {
    regionPromise = (async () => {
      try {
        const response = await fetch('/api/region')
        if (response.ok) {
          const data = await response.json()
          if (data && data.country) {
            return { country: data.country, region: data.region, source: 'country' }
          }
        }
      } catch {
        // 服务端信号拿不到时走浏览器端兜底。
      }
      return { country: null, ...detectRegionSync() }
    })()
  }
  return regionPromise
}

export function resetRegionCacheForTests() {
  regionPromise = null
}

/** 订阅支付地区的 React Hook：首屏先用同步兜底，随后用服务端国家修正。 */
export function useRegion() {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return { country: null, region: 'overseas', source: 'default' }
    return { country: null, ...detectRegionSync() }
  })
  useEffect(() => {
    let cancelled = false
    fetchRegion().then((resolved) => {
      if (!cancelled) setState(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return state
}
