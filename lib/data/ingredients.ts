import { prisma } from "@/prisma/client"
import { type Ingredient, type IngredientCategory, type IngredientShelfLifePreset, parseIngredientCategory, resolveShelfLifePreset } from "@/types/ingredient"
import { bigIntId, numberFromBigInt } from "@/prisma/mappers"

export type CreateIngredientOptions = {
  shelfLifePreset?: IngredientShelfLifePreset
  category?: IngredientCategory
}

function normalizeNameForOrdering(name: string): string {
  return name.trim().toLowerCase()
}

function toIngredient(record: {
  id: bigint
  name: string
  shelf_life_preset: string
  category: string
}): Ingredient {
  return {
    id: numberFromBigInt(record.id),
    name: record.name,
    shelfLifePreset: resolveShelfLifePreset(record.shelf_life_preset),
    category: parseIngredientCategory(record.category),
  }
}

export async function listIngredients(userId: number): Promise<Ingredient[]> {
  const rows = await prisma.ingredient.findMany({
    select: { id: true, name: true, shelf_life_preset: true, category: true },
    where: { user_id: userId, deleted_at: null },
  })
  rows.sort((left, right) =>
    normalizeNameForOrdering(left.name).localeCompare(normalizeNameForOrdering(right.name), undefined, {
      sensitivity: "base",
    }),
  )
  return rows.map(toIngredient)
}

export async function getIngredientById(
  userId: number,
  ingredientId: number,
): Promise<Ingredient | null> {
  const row = await prisma.ingredient.findFirst({
    select: { id: true, name: true, shelf_life_preset: true, category: true },
    where: { id: bigIntId(ingredientId), user_id: userId, deleted_at: null },
  })
  if (!row) return null
  return toIngredient(row)
}

export async function findIngredientByName(
  userId: number,
  name: string,
): Promise<Ingredient | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const row = await prisma.ingredient.findFirst({
    select: { id: true, name: true, shelf_life_preset: true, category: true },
    where: {
      user_id: userId,
      deleted_at: null,
      name: {
        equals: trimmed,
        mode: "insensitive",
      },
    },
  })
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
  const preset = resolveShelfLifePreset(options?.shelfLifePreset)
  const row = await prisma.ingredient.create({
    select: { id: true, name: true, shelf_life_preset: true, category: true },
    data: {
      user_id: userId,
      name: trimmed,
      shelf_life_preset: preset,
      category,
    },
  })
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
  const preset = resolveShelfLifePreset(patch.shelfLifePreset)

  try {
    const row = await prisma.ingredient.update({
      select: { id: true, name: true, shelf_life_preset: true, category: true },
      where: {
        id: bigIntId(ingredientId),
        user_id: userId,
        deleted_at: null,
      },
      data: { name: trimmed, shelf_life_preset: preset, category: patch.category, updated_at: new Date() },
    })
    return toIngredient(row)
  } catch {
    return null
  }
}

export async function softDeleteIngredient(userId: number, ingredientId: number): Promise<void> {
  await prisma.ingredient.updateMany({
    where: { id: bigIntId(ingredientId), user_id: userId, deleted_at: null },
    data: { deleted_at: new Date(), updated_at: new Date() },
  })
}

export async function restoreIngredient(userId: number, ingredientId: number): Promise<void> {
  await prisma.ingredient.updateMany({
    where: { id: bigIntId(ingredientId), user_id: userId, deleted_at: { not: null } },
    data: { deleted_at: null, updated_at: new Date() },
  })
}
