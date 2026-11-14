import { createFileRoute } from '@tanstack/react-router'
import MixerSection from '../../MixerSection.jsx'
import { headForRoute } from '../../seo.mjs'

export const Route = createFileRoute('/zh/studio')({
  head: () => headForRoute('studio', 'zh'),
  component: MixerSection,
})
