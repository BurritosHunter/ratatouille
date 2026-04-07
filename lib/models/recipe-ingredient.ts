/** One line on a recipe, resolved from catalog + optional quantity note. */
export type RecipeIngredientLine = {
  ingredientId: number
  name: string
  quantityNote: string | null
  sortOrder: number
}

/** Payload item from the meal editor (client JSON). */
export type RecipeIngredientPayloadItem = {
  ingredientId?: number | string
  name: string
  quantityNote?: string
}
