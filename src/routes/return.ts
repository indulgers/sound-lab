/**
 * GET /return — 支付宝同步回跳结果页。
 *
 * 与 Express 版 GET /return 完全一致（独立 HTML 页，不走应用外壳）：
 * 同步回跳参数不是支付成功依据：页面先展示“正在确认支付结果”，
 * 再通过服务端交易查询展示最终结果；无订单上下文时展示中性状态。
 */
import { createFileRoute } from '@tanstack/react-router'
import { escapeHtml } from '../server/pay-shared'

export const Route = createFileRoute('/return')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const outTradeNo = url.searchParams.get('out_trade_no') || ''
        const safeNo = escapeHtml(outTradeNo)
        const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>支付结果 · Sound Cocktail</title>
<style>
body{font-family:sans-serif;max-width:560px;margin:64px auto;padding:0 16px;}
a.go{display:inline-block;margin-top:8px;padding:10px 20px;border-radius:99px;background:#16130c;color:#faf8f3;text-decoration:none;font-weight:600}
</style></head>
<body style="font-family:sans-serif;max-width:560px;margin:64px auto;padding:0 16px;">
<h1>支付结果</h1>
${safeNo
    ? `<p id="status">正在确认支付结果……</p>
<p id="unlocked" hidden></p>
<div id="actions" hidden><a href="/" class="go">去调音台</a></div>
<script>
var PACK_NAMES = { 'focus-pack': '专注包', 'sleep-pack': '助眠包', 'rain-night-pack': '雨夜包' };
fetch('/api/pay/query/${encodeURIComponent(outTradeNo)}')
  .then(r => r.json())
  .then(d => {
    var el = document.getElementById('status');
    if (d.status === 'PAID') {
      el.textContent = '支付成功：订单 ' + d.outTradeNo + ' 已确认。';
      // 查询确认支付成功时，后端已把权益发给下单的账号；
      // 这里只展示结果，不信任回跳链接里的任何参数。
      var name = PACK_NAMES[d.productId] || d.productId || '';
      if (name) {
        var u = document.getElementById('unlocked');
        u.textContent = '已解锁：' + name + '。登录同一账号即可在调音台使用。';
        u.hidden = false;
      }
      document.getElementById('actions').hidden = false;
    }
    else if (d.status === 'PENDING_PAYMENT') el.textContent = '等待付款：订单尚未完成支付。';
    else if (d.status === 'CLOSED') el.textContent = '交易已关闭。';
    else el.textContent = '支付状态未知，请稍后刷新重试或联系客服。';
  })
  .catch(() => { document.getElementById('status').textContent = '确认失败，请稍后刷新重试。'; });
</script>`
    : '<p>未找到订单信息。</p>'}
<p><a href="/">返回 Sound Cocktail</a></p>
</body></html>`
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      },
    },
  },
})
