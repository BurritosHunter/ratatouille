import type { RecipeSummary } from "@/lib/models/recipe";
import { imageSrcFromStoredOrExternal } from "@/lib/helpers/image/stored-or-external-src";

export type RecipeListLinkItem = {
  recipeId: number;
  title: string;
  thumbSrc: string | null;
};

export function recipeSummariesToListLinkItems(summaries: readonly RecipeSummary[]): RecipeListLinkItem[] {
  return summaries.map((recipe) => ({
    recipeId: recipe.id,
    title: recipe.title,
    thumbSrc: imageSrcFromStoredOrExternal({
      hasStored: recipe.hasStoredImage,
      storedSrc: `/api/recipes/${recipe.id}/image`,
      externalUrl: recipe.mainImageUrl,
    }),
  }));
}
