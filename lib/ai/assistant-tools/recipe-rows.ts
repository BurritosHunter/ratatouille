import type { RecipeSummary } from "@/lib/models/recipe";
import {
  recipeSummariesToListLinkItems,
  type RecipeListLinkItem,
} from "@/lib/helpers/recipe-list-link-items";

export type RecipeToolRow = RecipeListLinkItem;

export function recipesToToolRows(summaries: RecipeSummary[]): RecipeToolRow[] {
  return recipeSummariesToListLinkItems(summaries);
}
