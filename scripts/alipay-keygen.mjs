#!/usr/bin/env node
/**
 * Generate a new RSA2 (2048-bit RSA) application key pair for Alipay key mode.
 *
 * Run from the repository root: npm run alipay:keygen
 * All files stay local under .secrets/alipay/ and are ignored by Git.
 * This project expects the private key as raw PKCS#1 base64 in
 * ALIPAY_APP_PRIVATE_KEY_PKCS1, not the PKCS#8 format used by some SDK examples.
 */
import { createHash, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUTPUT_DIR = resolve(process.cwd(), '.secrets/alipay')
const paths = {
  privatePem: resolve(OUTPUT_DIR, 'app_private_key_pkcs1.pem'),
  privateRaw: resolve(OUTPUT_DIR, 'app_private_key_pkcs1.txt'),
  publicPem: resolve(OUTPUT_DIR, 'app_public_key.pem'),
  publicRaw: resolve(OUTPUT_DIR, 'app_public_key.txt'),
}

function pemBody(pem, label) {
  const match = pem.trim().match(new RegExp(`^-----BEGIN ${label}-----\\s+([A-Za-z0-9+/=\\s]+)\\s+-----END ${label}-----$`))
  if (!match) throw new Error(`Unexpected ${label} PEM format`)
  return match[1].replace(/\s+/g, '')
}

if (process.argv.length > 2) {
  console.error('Usage: npm run alipay:keygen (run from the repository root)')
  process.exit(2)
}

const existing = Object.values(paths).filter(existsSync)
if (existing.length) {
  console.error('Existing key files detected. Refusing to overwrite your current keys:')
  for (const path of existing) console.error(`  ${path}`)
  console.error('If you really need to rotate the keys, first back up the old pair and update the Alipay console before switching production.')
  process.exit(1)
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicExponent: 0x10001,
  privateKeyEncoding: { format: 'pem', type: 'pkcs1' },
  publicKeyEncoding: { format: 'pem', type: 'spki' },
})
const privateRaw = pemBody(privateKey, 'RSA PRIVATE KEY')
const publicRaw = pemBody(publicKey, 'PUBLIC KEY')

// Confirm that these keys form a working RSA2 pair before writing files.
const message = Buffer.from('sound-lab:alipay:rsa2:key-check', 'utf8')
const signature = sign('RSA-SHA256', message, privateKey)
if (!verify('RSA-SHA256', message, publicKey, signature)) {
  throw new Error('RSA2 key-pair self-check failed')
}

mkdirSync(OUTPUT_DIR, { recursive: true, mode: 0o700 })
writeFileSync(paths.privatePem, privateKey, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
writeFileSync(paths.privateRaw, `${privateRaw}
`, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
writeFileSync(paths.publicPem, publicKey, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
writeFileSync(paths.publicRaw, `${publicRaw}
`, { encoding: 'utf8', mode: 0o600, flag: 'wx' })

const fingerprint = createHash('sha256').update(createPublicKey(publicKey).export({ format: 'der', type: 'spki' })).digest('hex')
console.log('RSA2 2048-bit key pair generated and signature self-check passed.')
console.log(`Public key for Alipay console: ${paths.publicRaw}`)
console.log(`Private key for Cloudflare Worker secret: ${paths.privateRaw}`)
console.log(`PEM backup (private, do not upload): ${paths.privatePem}`)
console.log(`Public key SHA-256 (SPKI DER): ${fingerprint}`)
console.log('The key values were NOT printed. Keep private files local and backed up securely.')
