#!/usr/bin/env node
/**
 * Check the local application key pair and the downloaded Alipay public key.
 * Does not call Alipay and never prints or transmits private keys.
 */
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = resolve(process.cwd(), '.secrets/alipay')
const read = (name) => readFileSync(resolve(dir, name), 'utf8').trim()
function cleanPublicKey(content) {
  return content.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '')
}
function parsePublicKey(raw) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) throw new Error('Invalid public key base64')
  const pem = `-----BEGIN PUBLIC KEY-----
${raw}
-----END PUBLIC KEY-----`
  const key = createPublicKey(pem)
  if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails?.modulusLength !== 2048) {
    throw new Error('Expected a 2048-bit RSA public key')
  }
  return key
}

try {
  const appPrivatePem = read('app_private_key_pkcs1.pem')
  const appPrivateRaw = read('app_private_key_pkcs1.txt')
  const appPublicRaw = cleanPublicKey(read('app_public_key.txt'))
  const alipayPublicRaw = cleanPublicKey(read('alipay_public_key.txt'))
  if (!appPublicRaw || !alipayPublicRaw) throw new Error('A public key is empty')
  if (appPublicRaw === alipayPublicRaw) throw new Error('The Alipay public key cannot be your application public key')
  const appPrivateKey = createPrivateKey(appPrivatePem)
  if (appPrivateKey.asymmetricKeyType !== 'rsa' || appPrivateKey.asymmetricKeyDetails?.modulusLength !== 2048) {
    throw new Error('Expected a 2048-bit RSA application private key')
  }
  if (!appPrivatePem.startsWith('-----BEGIN RSA PRIVATE KEY-----')) {
    throw new Error('Expected a PKCS#1 RSA private key')
  }
  if (appPrivateRaw !== appPrivatePem.replace(/-----BEGIN RSA PRIVATE KEY-----|-----END RSA PRIVATE KEY-----|\s/g, '')) {
    throw new Error('Raw PKCS#1 private key does not match the PEM backup')
  }
  const appPublicKey = parsePublicKey(appPublicRaw)
  parsePublicKey(alipayPublicRaw)
  const message = Buffer.from('sound-lab:alipay:verify-config')
  const signature = sign('RSA-SHA256', message, appPrivateKey)
  if (!verify('RSA-SHA256', message, appPublicKey, signature)) {
    throw new Error('Application public and private keys do not match')
  }
  console.log('Local RSA2 key-format and key-pair checks passed.')
  console.log('Alipay public key is present, has RSA 2048 format and differs from the application public key.')
  console.log('Note: this does not prove that the Alipay platform accepted your application public key.')
} catch (err) {
  console.error(`Alipay key check failed: ${err.message}`)
  process.exitCode = 1
}
