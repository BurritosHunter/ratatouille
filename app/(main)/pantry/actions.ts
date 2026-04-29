"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth/auth-user"
import { createIngredient } from "@/lib/data/ingredients"
import {
  deletePantryInventoryRow,
  insertPantryInventoryRow,
  searchPantryCatalog,
} from "@/lib/data/pantry-inventory"
import type { PantryCatalogHit, PantryStorageLocation } from "@/lib/models/pantry-inventory"

const STORAGE_SET = new Set<PantryStorageLocation>(["fridge", "pantry", "storage", "freezer"])

function parseStorageLocation(value: unknown): PantryStorageLocation | null {
  if (typeof value !== "string") return null
  if (STORAGE_SET.has(value as PantryStorageLocation)) return value as PantryStorageLocation
  return null
}

function parseQuantity(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim())
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function parseExpiresOn(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  return trimmed
}

export async function searchPantryCatalogAction(
  query: string,
): Promise<{ ok: true; hits: PantryCatalogHit[] } | { ok: false }> {
  try {
    const userId = await requireUserId("/pantry")
    const hits = await searchPantryCatalog(userId, query)
    return { ok: true, hits }
  } catch {
    return { ok: false }
  }
}

export async function addPantryInventoryLine(payload: unknown): Promise<
  | { ok: true }
  | { ok: false; reason: "validation" | "server" }
> {
  try {
    const userId = await requireUserId("/pantry")
    if (!payload || typeof payload !== "object") return { ok: false, reason: "validation" }

    const fields = payload as Record<string, unknown>
    const storageLocation = parseStorageLocation(fields.storageLocation)
    const quantity = parseQuantity(fields.quantity)
    const expiresOn = parseExpiresOn(fields.expiresOn)
    if (!storageLocation || quantity === null) return { ok: false, reason: "validation" }

    const mode = fields.mode
    if (mode === "catalog") {
      const kind = fields.itemKind
      const catalogId = fields.catalogId
      if (kind !== "ingredient" && kind !== "meal") return { ok: false, reason: "validation" }
      const id =
        typeof catalogId === "number" && Number.isFinite(catalogId)
          ? catalogId
          : typeof catalogId === "string"
            ? Number.parseInt(catalogId, 10)
            : Number.NaN
      if (!Number.isFinite(id)) return { ok: false, reason: "validation" }

      await insertPantryInventoryRow({
        userId,
        storageLocation,
        itemKind: kind,
        ingredientId: kind === "ingredient" ? id : null,
        recipeId: kind === "meal" ? id : null,
        customLabel: null,
        quantity,
        expiresOn,
      })
      revalidatePath("/pantry")
      return { ok: true }
    }

    if (mode === "custom") {
      const label = typeof fields.customLabel === "string" ? fields.customLabel.trim() : ""
      if (!label) return { ok: false, reason: "validation" }
      await insertPantryInventoryRow({
        userId,
        storageLocation,
        itemKind: "custom",
        ingredientId: null,
        recipeId: null,
        customLabel: label,
        quantity,
        expiresOn,
      })
      revalidatePath("/pantry")
      return { ok: true }
    }

    if (mode === "newIngredient") {
      const name = typeof fields.ingredientName === "string" ? fields.ingredientName.trim() : ""
      if (!name) return { ok: false, reason: "validation" }
      const ingredient = await createIngredient(userId, name)
      await insertPantryInventoryRow({
        userId,
        storageLocation,
        itemKind: "ingredient",
        ingredientId: ingredient.id,
        recipeId: null,
        customLabel: null,
        quantity,
        expiresOn,
      })
      revalidatePath("/pantry")
      revalidatePath("/ingredients")
      return { ok: true }
    }

    return { ok: false, reason: "validation" }
  } catch {
    return { ok: false, reason: "server" }
  }
}

export async function removePantryInventoryLine(
  rowId: unknown,
): Promise<{ ok: true } | { ok: false }> {
  try {
    const userId = await requireUserId("/pantry")
    const id =
      typeof rowId === "number" && Number.isFinite(rowId)
        ? rowId
        : typeof rowId === "string"
          ? Number.parseInt(rowId, 10)
          : Number.NaN
    if (!Number.isFinite(id)) return { ok: false }
    await deletePantryInventoryRow(userId, id)
    revalidatePath("/pantry")
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
