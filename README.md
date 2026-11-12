# Sound Cocktail

选一个场景开始专注，再把现场录音和乐器调成自己的一杯。手绘涂鸦玻璃杯随配比变化，调音台旁的小杯同步显示液位。

- 22 条通道，包括 18 条现场录音、3 条乐器采样和 1 条实时合成通道。另有白、粉、褐三种底噪。
- 录音按需加载，在 Web Audio 缓冲区内交叉淡化循环。每条通道可调音量、亮度、远近和节奏，乐器采样与合成通道还可调密度和随机度。
- 免费版可直接听 4 个场景配方、12 条基础通道与 3 种底噪。首次播放开始 10 分钟体验，暂停、切换配方和刷新继续使用同一个截止时间。最后 5 秒淡出，到点后可主动再开一段。
- 首页可按写作、深度专注或短暂放松进入沉浸模式。调音台支持本地保存、配方码和分享卡。
- 进阶入口展示 6 个额外配方、10 条额外通道和长时体验。当前为浏览器内的产品原型，正式上线需接入账号、服务端权益和付费音源交付。

## 本地运行

需要 Node.js 22.12 或更新版本。

```sh
npm ci
npm run dev        # http://localhost:3000（TanStack Start 开发服务器，跑在 workerd 里）
```

首页 `/` 和沉浸页 `/focus` 由 TanStack Start（文件路由）管理，共用一个 Web Audio 控制器。直接访问沉浸页时可按「继续播放」开始。首页 SSR：初始 HTML 已包含标题、描述和三个进阶包。

用 `npm test` 运行计时与配方权限测试。用 `npm run build` 构建，再用 `npm run preview` 预览生产包（同样跑在 workerd 里）。

### 支付（本地沙箱）

支付 API 与网站跑在同一个 Worker 里（`src/routes/api/*`，同源 `/api`，不需要开发代理）。本地开发用支付宝沙箱配置：

```sh
npm run sync-dev-vars   # 从 .alipay-sandbox.json 生成 .dev.vars（沙箱密钥，绝不提交）
npm run dev
```

`.dev.vars` 只在本地生效；生产密钥用 `wrangler secret put` 设置（见部署一节）。订单存在 Cloudflare KV（`ORDERS_KV` 绑定），本地开发用 `wrangler.jsonc` 里 `preview_id` 对应的本地命名空间，数据存在 `.wrangler/` 下。

沙箱下单验证：`POST /api/pay/create {"productId":"focus-pack"}` 应返回 200 和一张 ¥6.00 的支付宝沙箱支付表单。注意：本机出站代理会破坏 workerd 的 TLS 握手，workerd 无法直接连到支付宝沙箱网关做查询/退款——服务端 API 调用（query/refund/close）用的是 `src/server/alipay-fetch.ts` 的 fetch 传输（与 SDK 相同的 RSA2 签名/验签算法），已用本地假网关端到端验证通过（见该文件头注释），上线前请在已部署的 Worker 上再跑一次真实沙箱查询确认。

### 海外版（英文 + Waffo Pancake）

导航栏右上角有 EN / 中文切换（存在 `localStorage` 的 `sc-locale` 里）。语言决定界面文案、货币和支付通道：中文 → 支付宝（人民币 ¥6/¥9/¥12），英文 → Waffo Pancake（美元 $1.99/$2.99/$3.99）。包 ID 不变（`focus-pack` / `sleep-pack` / `rain-night-pack`），两条通道共用同一份权益（`GET /api/entitlements`）。

- 语言相关的商品接口：`GET /api/products?locale=en` 返回 USD 价格，`?locale=zh`（或不带参数）返回 CNY 价格。
- Waffo 下单：`POST /api/waffo/create {"productId":"focus-pack"}`（需登录，未登录返回 401；未配置返回 503 `WAFFO_NOT_CONFIGURED`）。成功返回 `{checkoutUrl, sessionId, outTradeNo, productId, totalAmount, currency}`，前端在新标签页打开 `checkoutUrl`。
- Waffo 回调：`POST /api/waffo/webhook`（原始 body 验签，事件 `order.completed` → 标记已支付并授予权益；已处理的 `event.id` 会跳过）。付款完成后 Waffo 跳回 `/waffo-return?order=<outTradeNo>&pack=<id>`，页面轮询权益接口确认解锁。
- 本地开发配置（`.dev.vars`，绝不提交；示例见 `.dev.vars.example`）：

```sh
WAFFO_MERCHANT_ID=
WAFFO_STORE_ID=
WAFFO_PRIVATE_KEY=
WAFFO_ENV=test
WAFFO_PRODUCT_FOCUS_PACK=
WAFFO_PRODUCT_SLEEP_PACK=
WAFFO_PRODUCT_RAIN_NIGHT_PACK=
```

私钥填法：用**单行 raw base64**（去掉 `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` 和所有换行，只留 base64 本身）；SDK 也接受 PEM（含头尾行）或字面 `\n` 转义，但单行 base64 是最稳妥的格式。部署到 Worker 时同样贴单行 base64：`npx wrangler secret put WAFFO_PRIVATE_KEY` 后直接粘贴（或把 PEM 文件重定向进 stdin：`npx wrangler secret put WAFFO_PRIVATE_KEY < waffo-private-key.pem`）。

测试环境产品已在 Waffo 后台建好（test 模式，**不要点 publish**，发布是单向的、等上线决定再做）。测试卡：成功 `4576750000000110`，拒付 `4576750000000220`。

本地验证脚本（都在 `scripts/`，读 `.dev.vars`，不打印任何密钥）：

```sh
node scripts/waffo-create-products.mjs   # 在 test 环境创建三个一次性产品，打印 productId
node scripts/waffo-checkout-smoke.mjs    # 用真实 test 密钥建一个 checkout 会话，确认返回 checkoutUrl（token 不打印）
```

注意：和支付宝沙箱一样，本机 workerd 的 TLS 握手会被出站代理破坏，所以**本地 `vite preview` 里的 `/api/waffo/create` 调不通 api.waffo.ai（502）**——这是本机环境的限制，不是代码问题；上面两个 Node 脚本（走 Node 的 fetch）可以验证 SDK 与真实 test 环境，部署到 Worker 后再在已部署的 Worker 上验证整条链路（下单 → 测试卡支付 → webhook 授予 → 回跳页解锁）。

## 音频素材

作者、原始链接及逐条许可见 [音源目录](src/audio/catalog.mjs) 和页面内的「音源清单」。详见 [素材整理说明](public/assets/audio/README.txt)。

## 部署（Cloudflare Workers）

本站已从 Cloudflare Pages（静态站）迁移到 Cloudflare Workers（TanStack Start 全栈：SSR + 支付 API 同一个 Worker）。**当前生产站仍在 Pages（soundcocktail.app / sound-lab-97n.pages.dev），切流量之前先在 Worker 上验证通过。**

### 首次部署（需要 Cloudflare 登录）

```sh
npx wrangler login
npx wrangler whoami

# 1. 创建订单 KV 命名空间，把返回的 id 填进 wrangler.jsonc（替换现在的占位 UUID）
npx wrangler kv namespace create ORDERS_KV
npx wrangler kv namespace create ORDERS_KV --preview

# 2. 设置生产支付宝密钥（生产密钥目前还不存在：需先完成白名单 → 签约 → 建应用，
#    再把应用公钥对应的私钥等填进来；不要用沙箱密钥部署生产）
npx wrangler secret put ALIPAY_APP_ID
npx wrangler secret put ALIPAY_APP_PRIVATE_KEY_PKCS1
npx wrangler secret put ALIPAY_PUBLIC_KEY
# 生产网关（默认是沙箱网关；生产用 https://openapi.alipay.com/gateway.do）：
npx wrangler secret put ALIPAY_GATEWAY
# 可选：异步通知地址（需公网可达）
npx wrangler secret put ALIPAY_NOTIFY_URL

# 3. 设置 Waffo Pancake 密钥（海外版，test 环境；生产切换前不要改 WAFFO_ENV）
npx wrangler secret put WAFFO_MERCHANT_ID
npx wrangler secret put WAFFO_PRIVATE_KEY   # 粘贴单行 raw base64（见上文「海外版」一节）
npx wrangler secret put WAFFO_PRODUCT_FOCUS_PACK
npx wrangler secret put WAFFO_PRODUCT_SLEEP_PACK
npx wrangler secret put WAFFO_PRODUCT_RAIN_NIGHT_PACK
npx wrangler secret put WAFFO_ENV           # test（生产切换时再改为 prod）
# 4. 在 Waffo 后台注册 webhook：https://soundcocktail.app/api/waffo/webhook，订阅 order.completed 事件

# 5. 部署（会自动先构建；不要加 --config 参数，部署用插件生成的配置）
npm run deploy
# 成功后会得到 https://sound-cocktail.<子域名>.workers.dev
```

部署包约 2.8 MiB（gzip 约 0.6 MiB），在免费版 3 MiB 限制内。

### 绑定自定义域名（验证通过之后再做）

```sh
# 先确认 workers.dev 上的站和支付都正常，再把域名从 Pages 项目解绑、绑到 Worker：
npx wrangler deploy   # 确认 Worker 已上线
# Cloudflare Dashboard → Workers & Pages → sound-cocktail → Settings → Domains → Add → Custom Domain → soundcocktail.app
# 或：npx wrangler custom-domains add soundcocktail.app
```

绑定后 `soundcocktail.app` 即由 Worker 提供服务，Pages 项目可保留作回滚（不要同时让两个项目绑同一个域名）。

### 部署后检查

```sh
curl https://<workers.dev 域名>/            # 初始 HTML 应含标题和三个包名
curl https://<workers.dev 域名>/api/products
curl -X POST https://<workers.dev 域名>/api/pay/create \
  -H 'Content-Type: application/json' -d '{"productId":"focus-pack"}'
# 生产密钥就绪前，下单会返回 503 PAYMENT_NOT_CONFIGURED（预期行为）
# 沙箱密钥部署到预览环境时，应返回 ¥6.00 的支付宝沙箱支付表单；
# 再用返回的 outTradeNo 调 /api/pay/query/:outTradeNo 确认查询链路
```

旧的 Pages 部署说明：生产站目前仍由 Cloudflare Pages 从 `indulgers/sound-lab` 的 `main` 分支部署（https://sound-lab-97n.pages.dev/）。本目录（TanStack Start 版）尚未推送到 GitHub、尚未部署，待验证通过后再决定推送与切换方式。
