import { createFileRoute } from '@tanstack/react-router'

// /focus：与首页同一个 View，专注模式由根路由的 SoundLab 外壳
// 根据 pathname 切换（原代码路由 focusRoute 同样无 component）。
export const Route = createFileRoute('/focus')({
  component: () => null,
})
