import { readFileSync } from 'node:fs'
import { WaffoPancake } from '@waffo/pancake-ts'
const vars = {}
for (const line of readFileSync('/home/hatch/workspace/sound-lab-start/.dev.vars', 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq !== -1) vars[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
}
const client = new WaffoPancake({ merchantId: vars.WAFFO_MERCHANT_ID, privateKey: vars.WAFFO_PRIVATE_KEY, environment: 'test' })
const session = await client.checkout.authenticated.create({
  productId: vars.WAFFO_PRODUCT_FOCUS_PACK,
  currency: 'USD',
  buyerIdentity: 'u_S1GYXFRGx60N2XST',
  buyerEmail: 'waffo-test@example.com',
  orderMerchantExternalId: 'SC20261112085901BF7203',
  successUrl: 'https://soundcocktail.app/waffo-return?order=SC20261112085901BF7203&pack=focus-pack',
  metadata: { outTradeNo: 'SC20261112085901BF7203', productId: 'focus-pack', userId: 'u_S1GYXFRGx60N2XST' },
  language: 'en',
})
// Never print the token fragment: it is a bearer session token.
const url = new URL(session.checkoutUrl)
console.log('sessionId:', session.sessionId)
console.log('checkout host+path:', url.origin + url.pathname)
console.log('has token fragment:', url.hash.startsWith('#token='))
console.log('expiresAt:', session.expiresAt)
