import { createFileRoute } from '@tanstack/react-router'

// 首页：内容由根路由的 SoundLab 外壳渲染（View + 音频引擎），
// 本路由不额外渲染任何东西，与原代码路由（indexRoute 无 component）一致。
export const Route = createFileRoute('/')({
  component: () => null,
})
