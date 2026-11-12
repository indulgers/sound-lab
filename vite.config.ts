import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

// TanStack Start on Cloudflare Workers（官方路径）：
// cloudflare() 必须排在 tanstackStart() 之前；不要再加 nitro() 等适配器。
// /api 由同源的 Start 服务器路由提供，不再需要开发代理。
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact(),
  ],
})
