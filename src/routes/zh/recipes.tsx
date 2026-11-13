import { createFileRoute } from '@tanstack/react-router'
import RecipesPage from '../../RecipesPage.jsx'
import { headForRoute } from '../../seo.mjs'

// /zh/recipes：配方页（中文版）——配方卡片列表，选场景直接走常驻引擎。
export const Route = createFileRoute('/zh/recipes')({
  head: () => headForRoute('recipes', 'zh'),
  component: RecipesPage,
})
