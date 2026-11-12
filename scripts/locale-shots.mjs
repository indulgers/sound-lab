// Locale smoke test via CDP (no extra deps; uses the cached Chromium + Node's built-in WebSocket).
// Seeds one saved recipe with a Chinese auto-generated name (the user's screenshot case),
// then checks EN mode has no Chinese UI text and CN mode has no English UI labels
// (brand "Sound Cocktail", SYL- codes and user-typed recipe names are exempt),
// and screenshots the recipes + places sections in both locales.
// Usage: npm run dev must be running on :3000 first. Output: /tmp/locale-*.png + console audit.
import { execFile } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

const chrome = `${homedir()}/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome`
const child = execFile(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=9223', '--window-size=1280,900', 'about:blank',
], () => {})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let targets
for (let i = 0; i < 30; i++) {
  await sleep(500)
  try {
    targets = await (await fetch('http://127.0.0.1:9223/json')).json()
    break
  } catch { /* not up yet */ }
}
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => { ws.onopen = r })
let id = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
}
function send(method, params = {}) {
  const mid = ++id
  ws.send(JSON.stringify({ id: mid, method, params }))
  return new Promise((resolve) => pending.set(mid, resolve))
}
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails))
  return r.result?.result?.value
}
async function shot(name) {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`/tmp/${name}.png`, Buffer.from(s.result.data, 'base64'))
  console.log('saved /tmp/' + name + '.png')
}

await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: 'http://localhost:3000/' })
await sleep(3000)
// Seed: EN locale + one saved recipe with a Chinese auto-generated name (user content: stays as typed),
// then reload so the engine mounts with it.
await evalJs(`localStorage.setItem('sc-locale','en');
localStorage.setItem('sound-lab.recipes', JSON.stringify([{name:'雨 + 篝火之夜', mix:{rain:0.8, fire:0.52, piano:0.4}, params:{}, at:'2026-11-12T00:55:00'}]));`)
await send('Page.navigate', { url: 'http://localhost:3000/' })
await sleep(3000)

const AUDIT = `(() => {
  const pick = (sel) => document.querySelector(sel)?.innerText ?? '';
  const all = (sel) => [...document.querySelectorAll(sel)].map((el) => el.innerText);
  return {
    title: document.title,
    htmlLang: document.documentElement.lang,
    glassCap: pick('#glassCap'),
    currentMix: pick('#currentMix'),
    recipeNameValue: document.querySelector('#recipeName')?.value ?? '',
    savedCard: pick('#mineList .mine-item'),
    savedCardName: pick('#mineList .mine-item h4'),
    savedCardDate: pick('#mineList .mine-item time'),
    savedCardButtons: all('#mineList .mine-item .op-btn'),
    faderGroups: all('.chan-group-head'),
    faderNames: all('.chan .c-name'),
    faderBadges: all('.chan .src-badge'),
    faderPct: all('.chan .c-pct').slice(0, 5),
    tuneButtons: all('.chan .tune-toggle').slice(0, 5),
    plusPrices: all('.access-cards .price'),
    plusButtons: all('.access-cards .btn'),
    recipeLegends: all('#recipes .mix-legend').slice(0, 3),
    sectionSubs: all('.sec-sub'),
    bedChips: all('.chips .chip'),
    navText: pick('.topbar'),
  };
})()`

function checkCjk(obj, label) {
  const cjk = /[\u4e00-\u9fff]/
  const bad = []
  const walk = (v, path) => {
    if (typeof v === 'string') {
      // The nav toggle always shows the *target* language's own name ("中文" in EN mode).
      const stripped = path === '.navText' ? v.replace('中文', '') : v
      if (cjk.test(stripped)) bad.push(path + ': ' + JSON.stringify(v))
    }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, path + '[' + i + ']'))
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, path + '.' + k))
  }
  walk(obj, '')
  console.log(label, bad.length ? 'FAIL\n  ' + bad.join('\n  ') : 'OK (no CJK)')
  return bad
}
function checkLatin(obj, label) {
  // Latin allowed: brand (CSS uppercases it to SOUND COCKTAIL), SYL- codes,
  // user-typed recipe name, Google/Apple Pay, /api, HTTP, html lang attribute,
  // and the nav toggle, which always shows the *target* language's own name ("EN" in CN mode).
  const allow = /sound cocktail|SYL-|Google|Apple Pay|WeChat Pay|HTTP|\/api|\bEN\b|zh-CN/gim
  const latin = /[A-Za-z]/
  const bad = []
  const walk = (v, path) => {
    if (typeof v === 'string') {
      if (path.includes('savedCardName')) return // user-typed recipe name: never translated
      // recipeNameValue IS checked: the auto-generated prefill follows the locale on switch.
      const stripped = v.replace(allow, '')
      if (latin.test(stripped)) bad.push(path + ': ' + JSON.stringify(v))
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, path + '[' + i + ']'))
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, path + '.' + k))
  }
  walk(obj, '')
  console.log(label, bad.length ? 'FAIL\n  ' + bad.join('\n  ') : 'OK (no Latin UI labels)')
  return bad
}

console.log('=== EN mode (seeded, after reload) ===')
const en = await evalJs(AUDIT)
console.log(JSON.stringify(en, null, 1))
// savedCard includes the user-typed recipe name (Chinese by design): strip it before checking.
// savedCardName itself is user content: excluded. recipeNameValue IS checked: it is the
// auto-generated prefill, not user content yet.
const enForCheck = { ...en, savedCardName: '', savedCard: en.savedCard.replace(en.savedCardName, '') }
const enBad = checkCjk(enForCheck, 'EN audit')
await evalJs(`document.querySelector('#mine').scrollIntoView({behavior:'instant', block:'start'})`)
await sleep(600)
await shot('locale-en-recipes')
await evalJs(`document.querySelector('#mixer').scrollIntoView({behavior:'instant', block:'start'})`)
await sleep(600)
await shot('locale-en-places')

// Switch to CN via the real nav toggle button (tests the live repaint path, no reload).
console.log('=== switch to CN via nav toggle ===')
await evalJs(`[...document.querySelectorAll('.topbar button')].find(b => b.textContent.trim() === '中文')?.click()`)
await sleep(1200)
const zh = await evalJs(AUDIT)
console.log(JSON.stringify(zh, null, 1))
const zhBad = checkLatin(zh, 'CN audit')
await evalJs(`document.querySelector('#mine').scrollIntoView({behavior:'instant', block:'start'})`)
await sleep(600)
await shot('locale-zh-recipes')
await evalJs(`document.querySelector('#mixer').scrollIntoView({behavior:'instant', block:'start'})`)
await sleep(600)
await shot('locale-zh-places')

// Switch back to EN via the toggle (button now shows EN).
console.log('=== switch back to EN via nav toggle ===')
await evalJs(`[...document.querySelectorAll('.topbar button')].find(b => b.textContent.trim() === 'EN')?.click()`)
await sleep(1200)
const en2 = await evalJs(AUDIT)
console.log('title after toggle back:', JSON.stringify(en2.title), '| glassCap:', JSON.stringify(en2.glassCap))
const en2ForCheck = { ...en2, savedCardName: '', savedCard: en2.savedCard.replace(en2.savedCardName, '') }
const en2Bad = checkCjk(en2ForCheck, 'EN-after-toggle audit')

const failed = enBad.length + zhBad.length + en2Bad.length
console.log(failed === 0 ? 'ALL LOCALE CHECKS PASSED' : `LOCALE CHECKS FAILED (${failed} violations)`)
ws.close()
child.kill()
process.exit(failed === 0 ? 0 : 1)
