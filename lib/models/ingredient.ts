export const INGREDIENT_CATEGORIES = [
  "dairy",
  "pasta",
  "bread",
  "meat",
  "nut",
  "seed",
  "herb",
  "vegetable",
  "fruit",
  "miscellaneous",
] as const

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number]

const categorySet = new Set<string>(INGREDIENT_CATEGORIES)

export function parseIngredientCategory(raw: unknown): IngredientCategory {
  if (typeof raw !== "string" || !categorySet.has(raw)) return "miscellaneous"
  return raw as IngredientCategory
}

/** Hard-coded shelf-life options (matches DB CHECK constraint on `ingredients` and defaults table). */
export const INGREDIENT_SHELF_LIFE_PRESETS = [
  "3_days",
  "5_days",
  "7_days",
  "2_weeks",
  "1_month",
  "3_months",
  "6_months",
  "1_year",
] as const

export type IngredientShelfLifePreset = (typeof INGREDIENT_SHELF_LIFE_PRESETS)[number]

export const DEFAULT_SHELF_LIFE_PRESET: IngredientShelfLifePreset = "1_year"

const shelfLifePresetSet = new Set<string>(INGREDIENT_SHELF_LIFE_PRESETS)

export function parseShelfLifePreset(raw: unknown): IngredientShelfLifePreset | null {
  if (raw == null || raw === "") return null
  if (typeof raw !== "string" || !shelfLifePresetSet.has(raw)) return null
  return raw as IngredientShelfLifePreset
}

export function resolveShelfLifePreset(raw: unknown): IngredientShelfLifePreset {
  return parseShelfLifePreset(raw) ?? DEFAULT_SHELF_LIFE_PRESET
}

/** Days from today for default pantry expiry dates (months/year are approximate). */
export function expirationDaysOffsetForShelfLifePreset(preset: IngredientShelfLifePreset): number {
  switch (preset) {
    case "3_days":   return 3
    case "5_days":   return 5
    case "7_days":   return 7
    case "2_weeks":  return 14
    case "1_month":  return 30
    case "3_months": return 90
    case "6_months": return 182
    case "1_year":   return 365
  }
}

export type Ingredient = {
  id: number
  name: string
  shelfLifePreset: IngredientShelfLifePreset
  category: IngredientCategory
}

export type IngredientSummary = Ingredient
