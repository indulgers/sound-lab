import { createFileRoute, notFound } from '@tanstack/react-router'
import SoundScenePage from '../../scenes/SoundScenePage.jsx'
import { getFeaturedScenePage } from '../../scenes/scene-pages.mjs'
import { headForSoundScene } from '../../seo.mjs'

export const Route = createFileRoute('/en/scenes/$slug')({
  beforeLoad: ({ params }) => {
    if (!getFeaturedScenePage(params.slug)) throw notFound()
  },
  head: ({ params }) => headForSoundScene(params.slug, 'en'),
  component: SceneRoute,
})

function SceneRoute() {
  const { slug } = Route.useParams()
  return <SoundScenePage slug={slug} locale="en" />
}
