import { getSql } from "@/lib/db"
import type { Ingredient } from "../models/ingredient"

type IngredientRow = {
  id: string | number
  name: string
}

function toId(value: string | number): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value)
  if (!Number.isFinite(parsed)) throw new Error("Invalid ingredient id")
  return parsed
}

function toIngredient(row: IngredientRow): Ingredient {
  return { id: toId(row.id), name: row.name }
}

export async function listIngredients(userId: number): Promise<Ingredient[]> {
  const rows = await getSql()`
    SELECT id, name
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
    SELECT id, name
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
    SELECT id, name
    FROM ingredients
    WHERE user_id = ${userId} AND deleted_at IS NULL AND lower(btrim(name)) = lower(${trimmed})
    LIMIT 1
  `
  const row = (rows as IngredientRow[])[0]
  if (!row) return null
  return toIngredient(row)
}

export async function createIngredient(userId: number, name: string): Promise<Ingredient> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Ingredient name is required")
  const existing = await findIngredientByName(userId, trimmed)
  if (existing) return existing
  const rows = await getSql()`
    INSERT INTO ingredients (user_id, name)
    VALUES (${userId}, ${trimmed})
    RETURNING id, name
  `
  const row = (rows as IngredientRow[])[0]
  if (!row) throw new Error("Failed to create ingredient")
  return toIngredient(row)
}

export async function findOrCreateIngredient(userId: number, name: string): Promise<Ingredient> {
  return createIngredient(userId, name)
}

export async function updateIngredient(
  userId: number,
  ingredientId: number,
  name: string,
): Promise<Ingredient | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const rows = await getSql()`
    UPDATE ingredients
    SET name = ${trimmed}, updated_at = now()
    WHERE id = ${ingredientId} AND user_id = ${userId} AND deleted_at IS NULL
    RETURNING id, name
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
