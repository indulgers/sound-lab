# Sound Lab / Soundcocktail 支付宝正式密钥配置

项目已实现支付宝网页支付：`src/routes/api/pay/create.ts` 下单、`notify.ts` 异步验签、`query.$outTradeNo.ts` 查单及权益发放；运行于 **TanStack Start + Cloudflare Workers**。这里仅配置支付宝开放平台的 **密钥模式 + RSA2**，不替换现有沙箱或海外 Waffo 通道。

> 私钥只在本地生成，绝不可上传 GitHub、发到聊天、写入 `VITE_` 环境变量或浏览器。生产和沙箱密钥不要混用。轮换已有密钥前先备份，并按支付宝控制台要求操作。

## 1. 在 Mac 项目根目录生成密钥

需要 Node >=22.12（与 `package.json` 一致）：

```sh
npm run alipay:keygen
```

命令在本机生成 RSA2（RSA 2048 位），并进行签名自检。所有输出放在 Git 忽略目录 `.secrets/alipay/`：

| 文件 | 用途 |
| --- | --- |
| `app_public_key.txt` | **应用公钥**，粘贴到支付宝控制台（无 PEM 头尾） |
| `app_public_key.pem` | 同一应用公钥的 PEM 备份 |
| `app_private_key_pkcs1.pem` | **应用私钥**的 PKCS#1 PEM 备份，严禁上传 |
| `app_private_key_pkcs1.txt` | 同一应用私钥的裸 Base64，供 `ALIPAY_APP_PRIVATE_KEY_PKCS1` 使用 |

生成器不打印密钥值、不会覆盖已有密钥。本项目的私钥配置是 **PKCS#1 RSA PRIVATE KEY**，不要直接套用其他教程的 PKCS#8 私钥。

## 2. 上传应用公钥

支付宝开放平台 → 应用 → 开发设置 → 接口加签方式 → 密钥 + RSA2 → 下一步。

```sh
pbcopy < .secrets/alipay/app_public_key.txt
```

把剪贴板内容粘贴到**应用公钥**字段并上传，**不要上传应用私钥**。保存成功后，进入下一步**下载/复制支付宝公钥**。

## 3. 保存支付宝公钥并检查

在支付宝平台复制**支付宝公钥**（不是应用公钥），Mac 终端执行：

```sh
pbpaste > .secrets/alipay/alipay_public_key.txt
chmod 600 .secrets/alipay/alipay_public_key.txt
npm run alipay:check
```

检查会验证本地应用私钥和应用公钥是否匹配、支付宝公钥是否为另一把合法的 RSA 2048 位公钥。检查通过**不等于**平台已接受公钥，还需平台确认及沙箱/线上交易验证。

## 4. 配置 Cloudflare Workers 的正式环境 Secret

**前提**：确认真实应用 AppID、签约支付产品已经生效、正确的 Worker 目标环境及公网回调地址。先在独立测试/预览 Worker 验证，**不要直接将仍在运行沙箱的 Worker 切成正式网关**。

登录并核对账号、目标 Worker 环境后，逐项设置：

```sh
npx wrangler whoami
npx wrangler secret put ALIPAY_APP_ID
npx wrangler secret put ALIPAY_APP_PRIVATE_KEY_PKCS1 < .secrets/alipay/app_private_key_pkcs1.txt
npx wrangler secret put ALIPAY_PUBLIC_KEY < .secrets/alipay/alipay_public_key.txt
npx wrangler secret put ALIPAY_GATEWAY
npx wrangler secret put ALIPAY_NOTIFY_URL
```

`ALIPAY_GATEWAY` 输入 `https://openapi.alipay.com/gateway.do`。`ALIPAY_NOTIFY_URL` 输入**实际已部署**的 HTTPS Worker 地址，例如 `https://<实际 Worker 域名>/api/pay/notify`，不能指向尚未切流量的 Pages 页面。

- `ALIPAY_APP_ID`：支付宝开放平台真实 AppID（不是商户 PID）。
- `ALIPAY_APP_PRIVATE_KEY_PKCS1`：本机生成的**应用私钥**裸 Base64。
- `ALIPAY_PUBLIC_KEY`：平台下载的**支付宝公钥**，**不是应用公钥**。
- `ALIPAY_GATEWAY`：正式网关。项目未配置时默认**沙箱**网关，切生产时必须设置。
- `ALIPAY_NOTIFY_URL`：支付宝异步通知地址，公网可访问的 HTTPS Worker 路径。

请确认 `wrangler secret put` 作用到的是目标 Worker；这会改变其环境配置。不要将真实密钥写进 `.dev.vars.example`、`.github` 工作流或仓库提交。

## 5. 验收清单

1. 支付宝控制台确认应用公钥与 `app_public_key.txt` 一致，RSA2 已启用，支付产品签约生效。
2. Cloudflare `ORDERS_KV` 绑定及 `/health`、`/api/products` 可用。
3. 沙箱完整测试下单、支付表单、异步验签、查单及权益发放；再小额线上交易验证。
4. 只根据已验签异步通知或可信查单结果发放权益，不能根据同步回跳或前端状态发放（现有代码已有相关路径）。

官方文档：[支付宝 Vibe Pay 网页应用支付接入指南](https://aipay.alipay.com/docs/vibe-pay/ai-web-app-payment-qianyi/ai-web-app-payment-integration-guide.html)。
