import { createFileRoute } from '@tanstack/react-router'
import SceneExperience from '../../scenes/SceneExperience.jsx'

// Studio is a listening experience, not a collection of indexable mix permutations.
export const Route = createFileRoute('/zh/studio')({
  head: () => ({
    meta: [
      { title: '声音 Studio — 调配属于自己的音景 | Sound Cocktail' },
      { name: 'description', content: '保持沉浸播放，实时调节和声、氛围和音乐细节。' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [],
  }),
  component: () => <SceneExperience initialJourneyId="focus-chiang-mai" startInStudio />,
})
