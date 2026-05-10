import { prisma } from "@/prisma/client"
import {
  DEFAULT_SHELF_LIFE_PRESET,
  type IngredientCategory,
  INGREDIENT_CATEGORIES,
  parseIngredientCategory,
  type IngredientShelfLifePreset,
  resolveShelfLifePreset,
} from "../models/ingredient"

export type CategoryShelfLifeDefaultsMap = Record<IngredientCategory, IngredientShelfLifePreset>

export async function listIngredientCategoryShelfDefaults(): Promise<CategoryShelfLifeDefaultsMap> {
  const rows = await prisma.ingredientCategoryShelfDefault.findMany({
    select: {
      category: true,
      default_shelf_life_preset: true,
    },
  })
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
