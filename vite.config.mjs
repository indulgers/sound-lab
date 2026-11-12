import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: {
    // 本地开发：结账页走同源 /api，由这里代理到支付后端。
    // 支付后端不发 CORS 头，直接跨源请求会被浏览器拦截。
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
