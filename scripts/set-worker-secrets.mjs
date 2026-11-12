// Set the Alipay secrets on the deployed Worker from a local config file.
//
// Usage (from the project root, with wrangler authenticated — either
// `wrangler login` or CLOUDFLARE_API_TOKEN in the environment):
//   node scripts/set-worker-secrets.mjs [--config .alipay-sandbox.json]
//
// Reads the sandbox config the Alipay skill writes (credentials under
// appIds[0]) and runs `wrangler secret put` for the three values the
// Worker requires. The gateway is NOT set: the Worker defaults to the
// Alipay sandbox gateway, which is what a sandbox test wants. For a
// production switch, set ALIPAY_GATEWAY separately:
//   echo -n "https://openapi.alipay.com/gateway.do" | npx wrangler secret put ALIPAY_GATEWAY
//
// Secret VALUES ARE NEVER PRINTED. Only the names and wrangler's own
// success lines are shown.

import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const configIndex = args.indexOf('--config')
const configPath = configIndex >= 0 ? args[configIndex + 1] : '.alipay-sandbox.json'

const raw = JSON.parse(readFileSync(configPath, 'utf8'))
const app = raw.appIds?.[0] ?? raw

const secrets = {
  ALIPAY_APP_ID: app.appId,
  ALIPAY_APP_PRIVATE_KEY_PKCS1: app.appPrivatePkcsKey || app.appPrivateKey,
  ALIPAY_PUBLIC_KEY: app.alipayPublicKey,
}

for (const [name, value] of Object.entries(secrets)) {
  if (!value || typeof value !== 'string') {
    console.error(`missing or invalid value for ${name} in ${configPath}`)
    process.exit(1)
  }
}

function putSecret(name, value) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['wrangler', 'secret', 'put', name], { stdio: ['pipe', 'inherit', 'inherit'] })
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`wrangler secret put ${name} exited ${code}`))))
    child.stdin.end(value)
  })
}

for (const [name, value] of Object.entries(secrets)) {
  console.log(`setting ${name} ...`)
  await putSecret(name, value)
}
console.log('done. The Worker now has the Alipay sandbox credentials.')
console.log('Verify with: curl -s -X POST https://soundcocktail.app/api/pay/create -H "content-type: application/json" -d \'{"productId":"focus-pack"}\'')
