import { getSql } from "@/lib/db"
import {
  type Ingredient,
  type IngredientCategory,
  type IngredientShelfLifePreset,
  parseIngredientCategory,
  resolveShelfLifePreset,
} from "../models/ingredient"

export type CreateIngredientOptions = {
  shelfLifePreset?: IngredientShelfLifePreset
  category?: IngredientCategory
}

type IngredientRow = {
  id: string | number
  name: string
  shelf_life_preset: string | null | undefined
  category: string | null | undefined
}

function toId(value: string | number): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value)
  if (!Number.isFinite(parsed)) throw new Error("Invalid ingredient id")
  return parsed
}

function toIngredient(row: IngredientRow): Ingredient {
  return {
    id: toId(row.id),
    name: row.name,
    shelfLifePreset: resolveShelfLifePreset(row.shelf_life_preset),
    category: parseIngredientCategory(row.category),
  }
}

export async function listIngredients(userId: number): Promise<Ingredient[]> {
  const rows = await getSql()`
    SELECT id, name, shelf_life_preset, category
    FROM ingredients
    WHERE user_id = ${userId} AND deleted_at IS NULL
    ORDER BY lower(btrim(name)) ASC
  `
  return (rows as IngredientRow[]).map(toIngredient)
}

export async function getIngredientById(
  userId: number,
  ingredientId: number,
): Promise<Ingredient | null> {
  const rows = await getSql()`
    SELECT id, name, shelf_life_preset, category
    FROM ingredients
    WHERE id = ${ingredientId} AND user_id = ${userId} AND deleted_at IS NULL
    LIMIT 1
  `
  const row = (rows as IngredientRow[])[0]
  if (!row) return null
  return toIngredient(row)
}

export async function findIngredientByName(
  userId: number,
  name: string,
): Promise<Ingredient | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const rows = await getSql()`
    SELECT id, name, shelf_life_preset, category
    FROM ingredients
    WHERE user_id = ${userId} AND deleted_at IS NULL AND lower(btrim(name)) = lower(${trimmed})
    LIMIT 1
  `
  const row = (rows as IngredientRow[])[0]
  if (!row) return null
  return toIngredient(row)
}

export async function createIngredient(
  userId: number,
  name: string,
  options?: CreateIngredientOptions,
): Promise<Ingredient> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Ingredient name is required")
  const existing = await findIngredientByName(userId, trimmed)
  if (existing) return existing
  const category = options?.category ?? "miscellaneous"
  const shelfLifePresetSql = resolveShelfLifePreset(options?.shelfLifePreset)
  const rows = await getSql()`
    INSERT INTO ingredients (user_id, name, shelf_life_preset, category)
    VALUES (${userId}, ${trimmed}, ${shelfLifePresetSql}, ${category})
    RETURNING id, name, shelf_life_preset, category
  `
  const row = (rows as IngredientRow[])[0]
  if (!row) throw new Error("Failed to create ingredient")
  return toIngredient(row)
}

export async function findOrCreateIngredient(userId: number, name: string): Promise<Ingredient> {
  return createIngredient(userId, name)
}

export type IngredientPatch = {
  name: string
  shelfLifePreset: IngredientShelfLifePreset
  category: IngredientCategory
}

export async function updateIngredient(
  userId: number,
  ingredientId: number,
  patch: IngredientPatch,
): Promise<Ingredient | null> {
  const trimmed = patch.name.trim()
  if (!trimmed) return null
  const shelfLifePresetSql = resolveShelfLifePreset(patch.shelfLifePreset)
  const rows = await getSql()`
    UPDATE ingredients
    SET
      name = ${trimmed},
      shelf_life_preset = ${shelfLifePresetSql},
      category = ${patch.category},
      updated_at = now()
    WHERE id = ${ingredientId} AND user_id = ${userId} AND deleted_at IS NULL
    RETURNING id, name, shelf_life_preset, category
  `
  const row = (rows as IngredientRow[])[0]
  if (!row) return null
  return toIngredient(row)
}

export async function softDeleteIngredient(userId: number, ingredientId: number): Promise<void> {
  await getSql()`
    UPDATE ingredients
    SET deleted_at = now(), updated_at = now()
    WHERE id = ${ingredientId} AND user_id = ${userId} AND deleted_at IS NULL
  `
}

export async function restoreIngredient(userId: number, ingredientId: number): Promise<void> {
  await getSql()`
    UPDATE ingredients
    SET deleted_at = NULL, updated_at = now()
    WHERE id = ${ingredientId} AND user_id = ${userId} AND deleted_at IS NOT NULL
  `
}
