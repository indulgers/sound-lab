import { createFileRoute } from '@tanstack/react-router'
import MixPage from '../../MixPage.jsx'
import { decodeRecipeCode } from '../../recipe-code.mjs'
import { headForMix } from '../../seo.mjs'

// 分享混音页（/zh/mix/:code）：loader 在服务端用现有 SYL- 编解码
// 解出配方名与配料；码无效时 recipe 为 null，页面展示中性提示
// 并 noindex。head 用配方名作标题、配料作描述；OG 图为默认图。
// 只有真实分享的混音才有 URL，不自动生成薄页面（也不进 sitemap）。
export const Route = createFileRoute('/zh/mix/$code')({
  loader: ({ params }: { params: { code: string } }) => {
    try {
      return { recipe: decodeRecipeCode(params.code) }
    } catch {
      return { recipe: null }
    }
  },
  head: ({ loaderData, params }: { loaderData?: { recipe: unknown } | null; params: { code: string } }) =>
    headForMix((loaderData?.recipe as Parameters<typeof headForMix>[0]) ?? null, 'zh', params.code),
  component: MixRoute,
})

function MixRoute() {
  const { recipe } = Route.useLoaderData()
  return <MixPage recipe={recipe} locale="zh" />
}
