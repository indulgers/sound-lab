import { createFileRoute } from '@tanstack/react-router'
import RecipesPage from '../../RecipesPage.jsx'
import { headForRoute } from '../../seo.mjs'

// /en/recipes：配方页（英文版）——配方卡片列表，选场景直接走常驻引擎。
export const Route = createFileRoute('/en/recipes')({
  head: () => headForRoute('recipes', 'en'),
  component: RecipesPage,
})
