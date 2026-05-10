import { prisma } from "@/prisma/client"
import type { RecipeIngredientLine, RecipeIngredientPayloadItem } from "@/types/recipe-ingredient"
import { expirationDaysOffsetForShelfLifePreset, resolveShelfLifePreset } from "@/types/ingredient"
import { findOrCreateIngredient, getIngredientById } from "./ingredients"

import { bigIntId, numberFromBigInt } from "@/prisma/mappers"

export type ResolvedRecipeIngredientLine = {
  ingredientId: number
  name: string
  quantityNote: string | null
}

export async function listRecipeIngredientLines(
  userId: number,
  recipeId: number,
): Promise<RecipeIngredientLine[]> {
  const rows = await prisma.recipeIngredient.findMany({
    where: {
      recipe_id: bigIntId(recipeId),
      ingredient: { user_id: userId },
    },
    select: {
      ingredient_id: true,
      quantity_note: true,
      sort_order: true,
      ingredient: { select: { name: true } },
    },
    orderBy: { sort_order: "asc" },
  })
  return rows.map((row) => ({
    ingredientId: numberFromBigInt(row.ingredient_id),
    name: row.ingredient.name,
    quantityNote: row.quantity_note,
    sortOrder: row.sort_order,
  }))
}

/** Smallest pantry-style day offset implied by ingredient shelf presets on lines (null when none). */
export async function shortestExpirationDaysOffsetForRecipe(
  userId: number,
  recipeId: number,
): Promise<number | null> {
  const rows = await prisma.recipeIngredient.findMany({
    select: {
      ingredient: {
        select: {
          shelf_life_preset: true,
          deleted_at: true,
          user_id: true,
        },
      },
    },
    where: {
      recipe_id: bigIntId(recipeId),
      recipe: { user_id: userId, deleted_at: null },
      ingredient: { user_id: userId, deleted_at: null },
    },
  })
  if (rows.length === 0) return null
  const offsets = rows.map((row) =>
    expirationDaysOffsetForShelfLifePreset(resolveShelfLifePreset(row.ingredient.shelf_life_preset)),
  )
  return Math.min(...offsets)
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
  const row = await prisma.recipe.findFirst({
    select: { id: true },
    where: { id: bigIntId(recipeId), user_id: userId, deleted_at: null },
  })
  return row != null
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
  const rid = bigIntId(recipeId)
  await prisma.$transaction(async (transaction) => {
    await transaction.recipeIngredient.deleteMany({ where: { recipe_id: rid } })
    if (resolved.length === 0) return
    await transaction.recipeIngredient.createMany({
      data: resolved.map((line, order) => ({
        recipe_id: rid,
        ingredient_id: bigIntId(line.ingredientId),
        sort_order: order,
        quantity_note: line.quantityNote,
      })),
    })
  })
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
