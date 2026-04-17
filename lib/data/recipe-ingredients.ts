import { getSql } from "@/lib/db"
import type { RecipeIngredientLine, RecipeIngredientPayloadItem } from "../models/recipe-ingredient"
import { findOrCreateIngredient, getIngredientById } from "./ingredients"

export type ResolvedRecipeIngredientLine = {
  ingredientId: number
  name: string
  quantityNote: string | null
}

export async function listRecipeIngredientLines(
  userId: number,
  recipeId: number,
): Promise<RecipeIngredientLine[]> {
  const rows = await getSql()`
    SELECT
      ri.ingredient_id AS ingredient_id,
      i.name AS name,
      ri.quantity_note AS quantity_note,
      ri.sort_order AS sort_order
    FROM recipe_ingredients ri
    INNER JOIN ingredients i ON i.id = ri.ingredient_id AND i.user_id = ${userId}
    WHERE ri.recipe_id = ${recipeId}
    ORDER BY ri.sort_order ASC
  `
  return (rows as { ingredient_id: string | number; name: string; quantity_note: string | null; sort_order: number }[]).map(
    (row) => ({
      ingredientId:
        typeof row.ingredient_id === "string" ? Number.parseInt(row.ingredient_id, 10) : row.ingredient_id,
      name: row.name,
      quantityNote: row.quantity_note,
      sortOrder: row.sort_order,
    }),
  )
}

export function formatIngredientsDisplay(lines: { name: string; quantityNote: string | null }[]): string {
  return lines
    .map((line) => {
      const note = (line.quantityNote ?? "").trim()
      if (!note) return line.name.trim()
      return `${note} ${line.name.trim()}`.trim()
    })
    .filter(Boolean)
    .join("\n")
}

export function legacyPayloadFromIngredientsText(text: string): RecipeIngredientPayloadItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((name) => ({ name }))
}

async function assertRecipeOwned(userId: number, recipeId: number): Promise<boolean> {
  const rows = await getSql()`
    SELECT 1 AS ok
    FROM recipes
    WHERE id = ${recipeId} AND user_id = ${userId} AND deleted_at IS NULL
    LIMIT 1
  `
  return Boolean((rows as { ok: number }[])[0])
}

function parsePayloadItemId(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string") {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

export async function resolveRecipeIngredientPayload(
  userId: number,
  items: RecipeIngredientPayloadItem[],
): Promise<ResolvedRecipeIngredientLine[]> {
  const resolved: ResolvedRecipeIngredientLine[] = []
  for (const item of items) {
    const name = typeof item.name === "string" ? item.name.trim() : ""
    if (!name) continue
    const noteRaw = typeof item.quantityNote === "string" ? item.quantityNote.trim() : ""
    const quantityNote = noteRaw.length > 0 ? noteRaw : null
    const idGuess = parsePayloadItemId(item.ingredientId)
    const catalog = idGuess !== undefined ? await getIngredientById(userId, idGuess) : null
    if (catalog && catalog.name.toLowerCase() === name.toLowerCase()) {
      resolved.push({ ingredientId: catalog.id, name: catalog.name, quantityNote })
      continue
    }
    const created = await findOrCreateIngredient(userId, name)
    resolved.push({ ingredientId: created.id, name: created.name, quantityNote })
  }
  return resolved
}

export async function writeRecipeIngredientLines(
  userId: number,
  recipeId: number,
  resolved: ResolvedRecipeIngredientLine[],
): Promise<void> {
  if (!(await assertRecipeOwned(userId, recipeId))) throw new Error("Recipe not found")
  await getSql()`DELETE FROM recipe_ingredients WHERE recipe_id = ${recipeId}`
  let order = 0
  for (const line of resolved) {
    await getSql()`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, sort_order, quantity_note)
      VALUES (${recipeId}, ${line.ingredientId}, ${order}, ${line.quantityNote})
    `
    order += 1
  }
}

export async function replaceRecipeIngredientsFromPayload(
  userId: number,
  recipeId: number,
  items: RecipeIngredientPayloadItem[],
): Promise<string> {
  const resolved = await resolveRecipeIngredientPayload(userId, items)
  await writeRecipeIngredientLines(userId, recipeId, resolved)
  return formatIngredientsDisplay(resolved)
}
