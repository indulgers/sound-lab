import { createFileRoute } from '@tanstack/react-router'
import SceneExperience from '../../scenes/SceneExperience.jsx'

// Studio is a listening experience, not a collection of indexable mix permutations.
export const Route = createFileRoute('/en/studio')({
  head: () => ({
    meta: [
      { title: 'Sound Studio — Create your own ambient mix | Sound Cocktail' },
      { name: 'description', content: 'Adjust harmony, atmosphere and musical details while the soundscape keeps playing.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [],
  }),
  component: () => <SceneExperience initialJourneyId="focus-chiang-mai" startInStudio />,
})
