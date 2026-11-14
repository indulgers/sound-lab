import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createPublicKey, createPrivateKey, sign, verify, generateKeyPairSync } from 'node:crypto'
import { mkdtempSync, readFileSync, statSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

const script = resolve('scripts/alipay-keygen.mjs')
const checker = resolve('scripts/alipay-check-keys.mjs')

test('Alipay key generator creates valid PKCS#1 RSA2 files and refuses overwrite', () => {
  const root = mkdtempSync(join(tmpdir(), 'sound-lab-alipay-'))
  try {
    const first = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' })
    assert.equal(first.status, 0, first.stderr)
    assert.match(first.stdout, /signature self-check passed/)
    const dir = join(root, '.secrets/alipay')
    const privatePem = readFileSync(join(dir, 'app_private_key_pkcs1.pem'), 'utf8')
    const privateRaw = readFileSync(join(dir, 'app_private_key_pkcs1.txt'), 'utf8').trim()
    const publicPem = readFileSync(join(dir, 'app_public_key.pem'), 'utf8')
    const publicRaw = readFileSync(join(dir, 'app_public_key.txt'), 'utf8').trim()
    assert.match(privatePem, /^-----BEGIN RSA PRIVATE KEY-----/)
    assert.equal(privateRaw, privatePem.replace(/-----BEGIN RSA PRIVATE KEY-----|-----END RSA PRIVATE KEY-----|\s/g, ''))
    assert.equal(publicRaw, publicPem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, ''))
    assert.equal(createPrivateKey(privatePem).asymmetricKeyDetails.modulusLength, 2048)
    assert.equal(createPublicKey(publicPem).asymmetricKeyDetails.modulusLength, 2048)
    const data = Buffer.from('rsa2-roundtrip')
    assert.ok(verify('RSA-SHA256', data, publicPem, sign('RSA-SHA256', data, privatePem)))
    if (process.platform !== 'win32') {
      assert.equal(statSync(join(dir, 'app_private_key_pkcs1.pem')).mode & 0o777, 0o600)
      assert.equal(statSync(join(dir, 'app_private_key_pkcs1.txt')).mode & 0o777, 0o600)
    }
    const second = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' })
    assert.equal(second.status, 1)
    assert.match(second.stderr, /Refusing to overwrite/)
    assert.equal(readFileSync(join(dir, 'app_private_key_pkcs1.pem'), 'utf8'), privatePem)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('Alipay key checker distinguishes the two public keys', () => {
  const root = mkdtempSync(join(tmpdir(), 'sound-lab-alipay-check-'))
  try {
    assert.equal(spawnSync(process.execPath, [script], { cwd: root }).status, 0)
    const dir = join(root, '.secrets/alipay')
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs1', format: 'pem' } })
    writeFileSync(join(dir, 'alipay_public_key.txt'), publicKey)
    const ok = spawnSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' })
    assert.equal(ok.status, 0, ok.stderr)
    writeFileSync(join(dir, 'alipay_public_key.txt'), readFileSync(join(dir, 'app_public_key.txt'), 'utf8'))
    const wrong = spawnSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' })
    assert.equal(wrong.status, 1)
    assert.match(wrong.stderr, /cannot be your application public key/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
