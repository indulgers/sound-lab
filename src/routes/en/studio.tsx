import { createFileRoute } from '@tanstack/react-router'
import MixerSection from '../../MixerSection.jsx'
import { headForRoute } from '../../seo.mjs'

export const Route = createFileRoute('/en/studio')({
  head: () => headForRoute('studio', 'en'),
  component: MixerSection,
})
