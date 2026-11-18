# 测试 Plus：指定账号白名单（本地 + 线上）

为了检查全部 6 个旅行场景、Studio 高级声音图层、定时器、收藏与 10 分钟免费限制，Sound Lab 支持**临时 QA Plus 账号**。本功能不会发出支付订单、不会创建付费订阅、不会更新 Waffo/支付宝权益，也不会向所有访客解锁功能。

**采用账号，而不是 URL 免登录解锁。** 公共 \`?plus=true\`、\`?plan=pro\` 一类 URL 不会改变权益。只匹配服务端的随机 userId 白名单，同时验证真实账号、会话、访问主机和截止时间。

## 本地配置（推荐，约 3 步）

1. 打开本地 \`http://localhost:3000/en\`，通过普通邮箱+密码注册一个**专门用于测试**的账号并登录。建议不要使用自己的真实支付账户，以便清晰区分测试权益。
2. 登录后在浏览器开发者工具 Console 运行，取得该账号的实际 userId：

    fetch('/api/auth/me').then(r => r.json()).then(console.log)

返回形如 \`{"userId":"<真实生成的 ID>","email":"<测试用邮箱>"}\`。使用 **userId**，不是邮箱或密码。不同 Cloudflare KV 命名空间下，即使邮箱相同，userId 也可能不同。

3. 在项目根目录的私有 \`.dev.vars\` 中追加（不要提交到 Git）：

    SOUNDLAB_QA_PLUS_USER_IDS=粘贴登录后获得的userId
    SOUNDLAB_QA_PLUS_EXPIRES_AT=2026-11-25T12:00:00Z

时间必须使用带时区的 ISO 8601（Z 或 +08:00），在启动/使用时仍有效，且不超过未来 **30 天**。可以用以下命令动态生成 7 天后日期：

    node -p 'new Date(Date.now() + 7 * 86400_000).toISOString()'

重启 \`pnpm dev\`，刷新或重新登录。首页会出现 \`QA PLUS\` 标记；\`/en/plus\` 或 \`/zh/plus\` 展示“测试 Plus 已开启”，并提醒不会收费；访问 \`/api/entitlements\` 可以看见：

    {
      "packs": [],
      "subscription": {
        "active": true,
        "plan": "subscription-yearly",
        "provider": "qa",
        "status": "active",
        "currentPeriodEnd": 1795608000000,
        "isTest": true
      }
    }

上述字段是响应格式示例；具体到期时间以你设置的时间为准。无须真实购买。

如果你的 \`.dev.vars\` 是由 \`pnpm sync-dev-vars\` 根据支付宝沙箱设置生成的，该脚本会保留已有 \`SOUNDLAB_QA_PLUS_*\` 配置，避免覆盖。

## 线上 Worker / 预览环境

建议使用独立 staging Worker、独立 KV，不要让预览站点和真实用户付款共享数据。不要把白名单放在前端 \`VITE_*\`、\`wrangler.jsonc\` 的公开配置或 URL 参数中。

1. 在测试 Worker 域名里注册/登录账号，通过该环境的 \`/api/auth/me\` 获取其自己的 userId。
2. 给部署这个分支的 Worker 设置**三个服务端 Secret**（下面 \`<worker-name>\` 是你自己部署的 Worker 名）：

    npx wrangler secret put SOUNDLAB_QA_PLUS_USER_IDS --name <worker-name>
    npx wrangler secret put SOUNDLAB_QA_PLUS_EXPIRES_AT --name <worker-name>
    npx wrangler secret put SOUNDLAB_QA_PLUS_ALLOWED_HOSTS --name <worker-name>

各自的值依次是：指定 userId、未来 30 天内的到期时间、访问域名的**纯 hostname**（不带 \`https://\`、路径或端口），例如 \`sound-cocktail-preview.your-subdomain.workers.dev\`。

3. 登录对应线上域名，访问 \`/api/entitlements\` 验证 \`provider=qa\` 与 \`isTest=true\`；同时换一个账号验证没有开通。请勿在公共生产域名上不经确认使用此功能。

没有配置 \`SOUNDLAB_QA_PLUS_ALLOWED_HOSTS\` 时，仅允许 \`localhost\` 和 \`127.0.0.1\`；\`*.workers.dev\` 不会被当作通配符。若明确需要对正式线上域名的某个测试账号启用，需要操作人显式填写该主机名，权限仍受会话、userId 和到期时间约束。

## QA 生命周期与回滚

- 换账号：修改 \`SOUNDLAB_QA_PLUS_USER_IDS\`，可以用逗号分隔多个 userId，但建议先只放 1 个。
- 关闭：移除 \`SOUNDLAB_QA_PLUS_USER_IDS\`（或清空），然后重启开发环境/更新 Worker Secret。到期后会自动降级为原有免费或真实付费权益。
- 从真实会员切换到测试会员：如果用户本来有有效付费订阅，仍优先返回真实订阅；测试不会覆盖或续费它。
- 不会写入 KV 订阅记录，不会产生订单，不会向管理员提供任意用户授权 URL。
- 在 QA 页面会隐藏购买按钮，以减少误操作。要测试真实结账流程，请使用普通非 QA 测试账号和支付沙箱。

## 手工验收

访问 \`/api/auth/me\` 确认当前 userId → \`/api/entitlements\` 确认 provider=qa → 确认 6 个目的地能播放 → 调音、保存与睡眠定时器 → 退出后确认不再可用 → 用其他账号确认 Plus 不会自动开启 → 到期或删除配置后确认恢复正常。

注意：这一功能**不会**自动创建账号，也不会自动把任何账号设为会员。你需要在自己的本地/线上环境注册并显式配置 userId。代码通过 PR 交付，部署到线上需要管理员执行。
