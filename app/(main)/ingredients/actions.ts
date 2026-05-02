"use server"

import { revalidatePath } from "next/cache"
import { requireUserId } from "@/lib/auth/auth-user"
import {
  createIngredient,
  listIngredients,
  softDeleteIngredient,
  updateIngredient,
} from "@/lib/data/ingredients"
import type { IngredientShelfLifePreset } from "@/lib/models/ingredient"
import {
  parseIngredientCategory,
  resolveShelfLifePreset,
} from "@/lib/models/ingredient"

export type IngredientLinePayload = {
  id?: number
  name: string
  shelfLifePreset: IngredientShelfLifePreset
  category?: unknown
}

export async function quickCreateIngredient(
  rawName: string,
): Promise<{ ok: true; id: number; name: string } | { ok: false }> {
  const userId = await requireUserId("/ingredients")
  const name = typeof rawName === "string" ? rawName.trim() : ""
  if (!name) return { ok: false }

  try {
    const ing = await createIngredient(userId, name)
    revalidatePath("/ingredients")
    return { ok: true, id: ing.id, name: ing.name }
  } catch {
    return { ok: false }
  }
}

export async function saveIngredientsState(payload: unknown): Promise<{ ok: true } | { ok: false }> {
  const userId = await requireUserId("/ingredients")
  if (!Array.isArray(payload)) return { ok: false }

  const lines: IngredientLinePayload[] = []
  for (const rawLine of payload) {
    if (!rawLine || typeof rawLine !== "object") continue
    const lineFields = rawLine as Record<string, unknown>
    const name = typeof lineFields.name === "string" ? lineFields.name : ""
    let id: number | undefined
    if (typeof lineFields.id === "number" && Number.isFinite(lineFields.id)) id = lineFields.id
    else if (typeof lineFields.id === "string") {
      const parsedId = Number.parseInt(lineFields.id, 10)
      if (Number.isFinite(parsedId)) id = parsedId
    }
    lines.push({
      id,
      name,
      shelfLifePreset: resolveShelfLifePreset(
        lineFields.shelfLifePreset ?? lineFields.shelf_life_preset,
      ),
      category: lineFields.category,
    })
  }

  const existing = await listIngredients(userId)
  const existingById = new Map(existing.map((ingredient) => [ingredient.id, ingredient]))
  const idsInPayload = new Set<number>()
  for (const line of lines) {
    if (line.id !== undefined && existingById.has(line.id)) idsInPayload.add(line.id)
  }

  for (const id of existingById.keys()) {
    if (!idsInPayload.has(id)) await softDeleteIngredient(userId, id)
  }

  for (const line of lines) {
    const trimmed = line.name.trim()
    const category = parseIngredientCategory(line.category)
    const shelfLifePresetParsed = resolveShelfLifePreset(line.shelfLifePreset)
    if (line.id !== undefined) {
      if (!existingById.has(line.id)) continue
      if (!trimmed) {
        await softDeleteIngredient(userId, line.id)
        continue
      }
      const previous = existingById.get(line.id)
      if (
        previous &&
        (previous.name !== trimmed ||
          previous.shelfLifePreset !== shelfLifePresetParsed ||
          previous.category !== category)
      ) {
        await updateIngredient(userId, line.id, {
          name: trimmed,
          shelfLifePreset: shelfLifePresetParsed,
          category,
        })
      }
      continue
    }
    if (trimmed)
      await createIngredient(userId, trimmed, { shelfLifePreset: shelfLifePresetParsed, category })
  }

  revalidatePath("/ingredients")
  return { ok: true }
}
