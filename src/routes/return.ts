/**
 * GET /return — 支付宝同步回跳结果页。
 *
 * 与 Express 版 GET /return 完全一致（独立 HTML 页，不走应用外壳）：
 * 同步回跳参数不是支付成功依据：页面先展示“正在确认支付结果”，
 * 再通过服务端交易查询展示最终结果；无订单上下文时展示中性状态。
 * 文案按界面语言（localStorage 的 sc-locale）切换，与 waffo-return
 * 同一套做法：语言只决定文案，不影响支付渠道和金额。
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
<h1 id="title">支付结果</h1>
${safeNo
    ? `<p id="status">正在确认支付结果……</p>
<p id="unlocked" hidden></p>
<div id="actions" hidden><a href="/" class="go" id="goMixer">去调音台</a></div>
<script>
(function () {
  var locale = 'zh';
  try { locale = window.localStorage.getItem('sc-locale') === 'en' ? 'en' : 'zh'; } catch (e) {}
  var T = {
    en: {
      title: 'Payment result',
      checking: 'Confirming the payment result…',
      paid: function (no) { return 'Payment confirmed: order ' + no + '.'; },
      unlocked: function (name) { return 'Unlocked: ' + name + '. Sign in with the same account to use it in the mixer.'; },
      pending: 'Waiting for payment: this order has not been paid yet.',
      closed: 'This transaction is closed.',
      unknown: 'Payment status unknown. Please refresh and try again, or contact support.',
      failed: 'Confirmation failed. Please refresh and try again.',
      goMixer: 'Go to the mixer',
      backHome: 'Back to Sound Cocktail'
    },
    zh: {
      title: '支付结果',
      checking: '正在确认支付结果……',
      paid: function (no) { return '支付成功：订单 ' + no + ' 已确认。'; },
      unlocked: function (name) { return '已解锁：' + name + '。登录同一账号即可在调音台使用。'; },
      pending: '等待付款：订单尚未完成支付。',
      closed: '交易已关闭。',
      unknown: '支付状态未知，请稍后刷新重试或联系客服。',
      failed: '确认失败，请稍后刷新重试。',
      goMixer: '去调音台',
      backHome: '返回 Sound Cocktail'
    }
  }[locale];
  document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
  document.title = T.title + ' · Sound Cocktail';
  document.getElementById('title').textContent = T.title;
  document.getElementById('goMixer').textContent = T.goMixer;
  document.getElementById('backHome').textContent = T.backHome;
  var PACK_NAMES = {
    'focus-pack': { zh: '专注包', en: 'Focus Pack' },
    'sleep-pack': { zh: '助眠包', en: 'Sleep Pack' },
    'rain-night-pack': { zh: '雨夜包', en: 'Rain Night Pack' }
  };
  fetch('/api/pay/query/${encodeURIComponent(outTradeNo)}')
    .then(r => r.json())
    .then(d => {
      var el = document.getElementById('status');
      if (d.status === 'PAID') {
        el.textContent = T.paid(d.outTradeNo);
        // 查询确认支付成功时，后端已把权益发给下单的账号；
        // 这里只展示结果，不信任回跳链接里的任何参数。
        var name = (PACK_NAMES[d.productId] || {})[locale] || d.productId || '';
        if (name) {
          var u = document.getElementById('unlocked');
          u.textContent = T.unlocked(name);
          u.hidden = false;
        }
        document.getElementById('actions').hidden = false;
      }
      else if (d.status === 'PENDING_PAYMENT') el.textContent = T.pending;
      else if (d.status === 'CLOSED') el.textContent = T.closed;
      else el.textContent = T.unknown;
    })
    .catch(() => { document.getElementById('status').textContent = T.failed; });
})();
</script>`
    : '<p id="status">未找到订单信息。</p>'}
<p><a href="/" id="backHome">返回 Sound Cocktail</a></p>
</body></html>`
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      },
    },
  },
})
