import { getSql } from "@/lib/db"
import {
  DEFAULT_SHELF_LIFE_PRESET,
  type IngredientCategory,
  INGREDIENT_CATEGORIES,
  parseIngredientCategory,
  type IngredientShelfLifePreset,
  resolveShelfLifePreset,
} from "@/lib/models/ingredient"

export type CategoryShelfLifeDefaultsMap = Record<IngredientCategory, IngredientShelfLifePreset>

type ShelfDefaultRow = {
  category: string
  default_shelf_life_preset: string | null
}

export async function listIngredientCategoryShelfDefaults(): Promise<CategoryShelfLifeDefaultsMap> {
  const rows = (await getSql()`
    SELECT category, default_shelf_life_preset
    FROM ingredient_category_shelf_defaults
  `) as ShelfDefaultRow[]
  const byCategory = new Map<IngredientCategory, IngredientShelfLifePreset>(
    rows.map((row) => [
      parseIngredientCategory(row.category),
      resolveShelfLifePreset(row.default_shelf_life_preset),
    ]),
  )
  const result = {} as CategoryShelfLifeDefaultsMap
  for (const categoryKey of INGREDIENT_CATEGORIES) {
    result[categoryKey] = byCategory.get(categoryKey) ?? DEFAULT_SHELF_LIFE_PRESET
  }
  return result
}
