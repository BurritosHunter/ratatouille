import type { RecipeSummary } from "@/lib/models/recipe"
import { imageSrcFromStoredOrExternal } from "@/lib/helpers/image/stored-or-external-src"

export type RecipeToolRow = {
  recipeId: number
  title: string
  thumbSrc: string | null
}

export function recipesToToolRows(summaries: RecipeSummary[]): RecipeToolRow[] {
  return summaries.map((recipe) => ({
    recipeId: recipe.id,
    title: recipe.title,
    thumbSrc: imageSrcFromStoredOrExternal({
      hasStored: recipe.hasStoredImage,
      storedSrc: `/api/recipes/${recipe.id}/image`,
      externalUrl: recipe.mainImageUrl,
    }),
  }))
}
