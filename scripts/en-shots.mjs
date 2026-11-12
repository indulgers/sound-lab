// EN toggle screenshot via CDP (no extra deps; uses the cached Chromium + Node's built-in WebSocket).
import { execFile } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

const chrome = `${homedir()}/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome`
const child = execFile(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=9222', '--window-size=1280,900', 'about:blank',
], () => {})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let targets
for (let i = 0; i < 30; i++) {
  await sleep(500)
  try {
    targets = await (await fetch('http://127.0.0.1:9222/json')).json()
    break
  } catch { /* not up yet */ }
}
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => { ws.onopen = r })
let id = 0
const pending = new Map()
const events = []
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  else if (msg.method) events.push(msg)
}
function send(method, params = {}) {
  const mid = ++id
  ws.send(JSON.stringify({ id: mid, method, params }))
  return new Promise((resolve) => pending.set(mid, resolve))
}
await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: 'http://127.0.0.1:3000/' })
await sleep(2500)
await send('Runtime.evaluate', { expression: `localStorage.setItem('sc-locale','en'); window.dispatchEvent(new CustomEvent('soundcocktail:locale-changed'))` })
await sleep(900)
const nav = await send('Runtime.evaluate', { expression: `document.querySelector('.sc-nav')?.innerText?.slice(0,400)`, returnByValue: true })
console.log('EN nav:', JSON.stringify(nav.result?.result?.value))
const plus = await send('Runtime.evaluate', { expression: `document.querySelector('.sd-plus')?.innerText?.slice(0,200)`, returnByValue: true })
console.log('EN PLUS:', JSON.stringify(plus.result?.result?.value))
const shot = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync('/tmp/en-home.png', Buffer.from(shot.result.data, 'base64'))
await send('Page.navigate', { url: 'http://127.0.0.1:3000/checkout?pack=focus-pack' })
await sleep(2000)
const title = await send('Runtime.evaluate', { expression: `document.querySelector('h1,h2')?.textContent`, returnByValue: true })
console.log('EN checkout heading:', JSON.stringify(title.result?.result?.value))
const shot2 = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync('/tmp/en-checkout.png', Buffer.from(shot2.result.data, 'base64'))
ws.close()
child.kill()
console.log('screenshots saved')
