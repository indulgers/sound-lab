/**
 * GET /waffo-return — Waffo 支付成功后的回跳页。
 *
 * 与支付宝 GET /return 一致的思路（独立 HTML 页，不走应用外壳）：
 * 回跳链接里的参数不是支付成功依据。页面先展示“正在确认”，
 * 再轮询确认：每轮先调 GET /api/waffo/order-status（快查——直接
 * 向 Waffo 查这笔订单有没有成功的付款，查到就立刻标记已付并发
 * 权益，不用干等 webhook），再查 GET /api/entitlements（同账号的
 * 服务端权益记录）兜底；一旦包出现在权益列表里，就展示“已解锁”
 * 并给出去调音台的链接；轮询约 60 秒仍未出现时，说明 webhook
 * 还没到或支付未完成，如实展示“仍在处理”，不伪装成功。
 * ?pack= 只用于展示包名（显示用，不作为发放依据）。
 * 回跳页明确提示“不要重复付款”：webhook 慢到时用户容易回去
 * 再付一笔——进行中订单续付才是正确路径（见结账页与 PLUS 卡片）。
 */
import { createFileRoute } from '@tanstack/react-router'
import { escapeHtml } from '../server/pay-shared'

const PACK_NAMES: Record<string, { zh: string; en: string }> = {
  'focus-pack': { zh: '专注包', en: 'Focus Pack' },
  'sleep-pack': { zh: '助眠包', en: 'Sleep Pack' },
  'rain-night-pack': { zh: '雨夜包', en: 'Rain Night Pack' },
}

export const Route = createFileRoute('/waffo-return')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const packId = url.searchParams.get('pack') || ''
        const orderNo = url.searchParams.get('order') || ''
        const pack = PACK_NAMES[packId] || null
        const safePack = escapeHtml(packId)
        const safeOrder = escapeHtml(orderNo)
        const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Payment result · Sound Cocktail</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:sans-serif;max-width:560px;margin:64px auto;padding:0 16px;}
a.go{display:inline-block;margin-top:8px;padding:10px 20px;border-radius:99px;background:#16130c;color:#faf8f3;text-decoration:none;font-weight:600}
</style></head>
<body>
<h1 id="title">Payment result</h1>
<p id="status">Payment received — confirming with Waffo, this usually takes a few seconds. Please don’t pay again.</p>
<p id="unlocked" hidden></p>
<div id="actions" hidden><a href="/" class="go" id="goMixer">Go to the mixer</a></div>
<p><a href="/" id="backHome">Back to Sound Cocktail</a></p>
<script>
(function () {
  var locale = 'en';
  try { locale = window.localStorage.getItem('sc-locale') === 'zh' ? 'zh' : 'en'; } catch (e) {}
  var T = {
    en: {
      title: 'Payment result',
      checking: 'Payment received — confirming with Waffo, this usually takes a few seconds. Please don’t pay again.',
      unlocked: function (name) { return 'Unlocked: ' + name + '. It is ready in the mixer on this account.'; },
      processing: 'Still processing — the payment confirmation has not arrived yet. Please don’t pay again; check the mixer in a moment — your pack will appear there once it is confirmed.',
      needLogin: 'Please sign in with the same account you bought with, then check the mixer.',
      failed: 'Could not confirm the payment. Please refresh and try again.',
      goMixer: 'Go to the mixer',
      backHome: 'Back to Sound Cocktail'
    },
    zh: {
      title: '支付结果',
      checking: '已收到付款，正在向 Waffo 确认，通常几秒内完成。请不要重复付款。',
      unlocked: function (name) { return '已解锁：' + name + '。登录同一账号即可在调音台使用。'; },
      processing: '仍在处理：支付确认还没到。请不要重复付款，稍后去调音台看看，确认后包会自动出现。',
      needLogin: '请用购买时用的账号登录，再去调音台查看。',
      failed: '确认失败，请稍后刷新重试。',
      goMixer: '去调音台',
      backHome: '返回 Sound Cocktail'
    }
  }[locale];
  document.getElementById('title').textContent = T.title;
  document.getElementById('goMixer').textContent = T.goMixer;
  document.getElementById('backHome').textContent = T.backHome;
  var packId = ${JSON.stringify(safePack)};
  var orderNo = ${JSON.stringify(safeOrder)};
  var packNames = ${JSON.stringify(Object.fromEntries(Object.entries(PACK_NAMES).map(([id, v]) => [id, v.en])))};;
  var packNamesZh = ${JSON.stringify(Object.fromEntries(Object.entries(PACK_NAMES).map(([id, v]) => [id, v.zh])))};
  var packName = packId ? (locale === 'zh' ? (packNamesZh[packId] || packId) : (packNames[packId] || packId)) : '';
  var status = document.getElementById('status');
  var unlocked = document.getElementById('unlocked');
  var actions = document.getElementById('actions');
  var attempts = 0;
  var maxAttempts = 30; // 约 60 秒
  status.textContent = T.checking;
  function showUnlocked() {
    status.textContent = packName ? T.unlocked(packName) : T.unlocked(packId || 'your pack');
    unlocked.hidden = true;
    actions.hidden = false;
  }
  // 快查：直接向 Waffo 查这笔订单有没有成功的付款（服务端快查接口，
  // 查到就立刻标记已付并发权益）。失败时返回 false，交给权益轮询。
  function checkOrderStatus() {
    if (!orderNo) return Promise.resolve(false);
    return fetch('/api/waffo/order-status?order=' + encodeURIComponent(orderNo))
      .then(function (r) {
        if (!r.ok) throw new Error('order-status ' + r.status);
        return r.json();
      })
      .then(function (d) {
        return !!(d && d.status === 'PAID');
      })
      .catch(function () { return false; });
  }
  // 兜底：查同账号的服务端权益记录（webhook 到账后这里会出现）。
  // 返回 true 表示已完成（解锁或需登录），false 表示继续轮询。
  function checkEntitlements() {
    return fetch('/api/entitlements')
      .then(function (r) {
        if (r.status === 401) {
          status.textContent = T.needLogin;
          actions.hidden = false;
          return true;
        }
        if (!r.ok) throw new Error('entitlements ' + r.status);
        return r.json();
      })
      .then(function (d) {
        if (d === true) return true;
        var packs = Array.isArray(d.packs) ? d.packs : [];
        if (!packId || packs.indexOf(packId) !== -1) {
          showUnlocked();
          return true;
        }
        return false;
      });
  }
  function poll() {
    attempts++;
    checkOrderStatus()
      .then(function (paid) {
        if (paid) { showUnlocked(); return true; }
        return checkEntitlements();
      })
      .then(function (done) {
        if (done) return;
        if (attempts >= maxAttempts) {
          status.textContent = T.processing;
          actions.hidden = false;
          return;
        }
        setTimeout(poll, 2000);
      })
      .catch(function () {
        if (attempts >= maxAttempts) {
          status.textContent = T.failed;
          actions.hidden = false;
          return;
        }
        setTimeout(poll, 2000);
      });
  }
  poll();
})();
</script>
</body></html>`
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      },
    },
  },
})
