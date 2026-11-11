# 声音实验室 Sound Lab

手绘可爱风的声音调配 + 专注产品：调声音就像调一杯鸡尾酒。

- 19 种合成音：自然 8 种、城市/乡村社会 6 种、乐器 5 种，每条通道除音量外有五维调音（密度、明亮度、远近、随机度、节奏）
- 手绘水彩杯：液位、颜色、波纹、气泡、冰块、柠檬/樱桃/薄荷装饰全部由混音状态实时驱动，颜色和液位用缓动过渡
- 沉浸模式、专注 25 分钟（淡出结束 + 安静完成卡）、保存配方、分享卡、配方码
- 真实录音：把 mp3 放进 `assets/audio/<通道 id>.mp3`，对应通道自动改播真实录音

## 本地运行

直接用浏览器打开 `index.html` 就能用，不用装依赖、不用联网（字体走 Google Fonts，离线回落系统字体）。

## 部署（Cloudflare Pages + GitHub Actions CI/CD）

1. 在 GitHub 新建仓库，把这个仓库 push 上去（`main` 分支）。
2. 在 Cloudflare Dashboard → Workers & Pages → Create → Pages，新建项目 `sound-lab`（先建空项目，部署由 GitHub Actions 完成；也可以改用 Cloudflare 的 Git 直连，见下）。
3. 在 Cloudflare → My Profile → API Tokens，新建一个有 `Cloudflare Pages: Edit` 权限的 token。
4. 在 GitHub 仓库 → Settings → Secrets and variables → Actions，加两个 secret：
   - `CLOUDFLARE_API_TOKEN`：第 3 步的 token
   - `CLOUDFLARE_ACCOUNT_ID`：Cloudflare Dashboard 右侧的 Account ID
5. push 到 `main` 就自动部署；PR 会部署预览。

替代方案（更简单，不用 token）：Cloudflare Pages 里选 Connect to Git，选这个仓库，Build command 留空，Output directory 填 `.`，每次 push 自动部署。两种方式二选一，不要同时开。
