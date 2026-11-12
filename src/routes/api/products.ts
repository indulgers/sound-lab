/**
 * GET /api/products — 商品目录（服务端定价）。
 * 与 Express 版 GET /api/products 响应一致。
 *
 * 文案语言和金额币种是两个独立参数（2026-11-12 解耦规则）：
 * - ?locale=zh|en 只决定 name 用中文还是英文；
 * - ?currency=CNY|USD 或 ?region=cn|overseas 只决定金额币种。
 * 向后兼容：不传 currency/region 时，?locale=en 仍返回美元价（与之前一致），
 * 其他情况返回人民币价。前端必须显式传 currency（按检测到的支付地区），
 * 不要只传 locale 就指望金额正确。
 */
import { createFileRoute } from '@tanstack/react-router'
import { listProducts, normalizeCurrency, type Currency } from '../../server/products.ts'

export const Route = createFileRoute('/api/products')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const locale = (url.searchParams.get('locale') || '').trim().toLowerCase()
        const currencyParam = url.searchParams.get('currency')
        const regionParam = (url.searchParams.get('region') || '').trim().toLowerCase()
        let currency: Currency
        if (currencyParam !== null && currencyParam !== '') {
          currency = normalizeCurrency(currencyParam)
        } else if (regionParam === 'cn') {
          currency = 'CNY'
        } else if (regionParam === 'overseas') {
          currency = 'USD'
        } else {
          // 兼容旧行为：只传 locale 时，en → USD，其他 → CNY。
          currency = locale === 'en' ? 'USD' : 'CNY'
        }
        return Response.json({ currency, products: listProducts(currency, locale) })
      },
    },
  },
})
