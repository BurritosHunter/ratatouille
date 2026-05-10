import type { Prisma } from "@/prisma/client"

import { prisma } from "@/prisma/client"
import { resolveShelfLifePreset } from "@/lib/models/ingredient"
import type {
  PantryCatalogHit,
  PantryInventoryRow,
  PantryItemKind,
  PantryStorageLocation,
} from "@/lib/models/pantry-inventory"

import { bigIntId, numberFromBigInt } from "@/prisma/mappers"

const STORAGE_LOCATIONS: readonly PantryStorageLocation[] = ["fridge", "pantry", "storage", "freezer"] as const

function isPantryStorageLocation(value: string): value is PantryStorageLocation {
  return (STORAGE_LOCATIONS as readonly string[]).includes(value)
}

function isPantryItemKind(value: string): value is PantryItemKind {
  return value === "ingredient" || value === "meal" || value === "custom"
}

type PantryInventoryLoaded = Prisma.PantryInventoryGetPayload<{
  include: { ingredient_ref: true; meal: true }
}>

function displayNameFromPantryRow(row: PantryInventoryLoaded): string {
  const fromIngredient =
    row.ingredient_ref && row.ingredient_ref.deleted_at == null ? row.ingredient_ref.name : null
  const fromMeal = row.meal && row.meal.deleted_at == null ? row.meal.title : null
  return fromIngredient ?? fromMeal ?? row.custom_label ?? "—"
}

function rowToInventoryEntry(row: PantryInventoryLoaded): PantryInventoryRow {
  if (!isPantryStorageLocation(row.storage_location)) {
    throw new Error("Invalid storage location in row")
  }
  if (!isPantryItemKind(row.item_kind)) {
    throw new Error("Invalid item kind in row")
  }
  const expiresOn =
    row.expires_on === null ? null : row.expires_on.toISOString().slice(0, 10)

  return {
    id: numberFromBigInt(row.id),
    storageLocation: row.storage_location,
    itemKind: row.item_kind,
    ingredientId: row.ingredient_id == null ? null : numberFromBigInt(row.ingredient_id),
    recipeId: row.recipe_id == null ? null : numberFromBigInt(row.recipe_id),
    customLabel: row.custom_label,
    quantity: row.quantity.toString(),
    expiresOn,
    displayName: displayNameFromPantryRow(row),
  }
}

function sortPantryInventoryRows(rows: PantryInventoryRow[], locationFilter: PantryStorageLocation | "all"): void {
  if (locationFilter === "all") {
    rows.sort((left, right) => {
      const locationCompare = left.storageLocation.localeCompare(right.storageLocation, undefined, {
        sensitivity: "base",
      })
      if (locationCompare !== 0) return locationCompare
      const nameCompare = left.displayName.toLowerCase().localeCompare(right.displayName.toLowerCase(), undefined, {
        sensitivity: "base",
      })
      if (nameCompare !== 0) return nameCompare
      return left.id - right.id
    })
    return
  }
  rows.sort((left, right) => {
    const nameCompare = left.displayName.toLowerCase().localeCompare(right.displayName.toLowerCase(), undefined, {
      sensitivity: "base",
    })
    if (nameCompare !== 0) return nameCompare
    return left.id - right.id
  })
}

function sanitizeSearchFragment(query: string): string {
  return query.trim().replaceAll("%", "").replaceAll("_", "")
}

export async function searchPantryCatalog(
  userId: number,
  query: string,
  limit = 20,
): Promise<PantryCatalogHit[]> {
  const sanitized = sanitizeSearchFragment(query)
  if (!sanitized) return []
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20

  const [ingredientRows, recipeRows] = await Promise.all([
    prisma.ingredient.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        name: { contains: sanitized, mode: "insensitive" },
      },
      select: { id: true, name: true, shelf_life_preset: true },
      orderBy: { name: "asc" },
      take: safeLimit,
    }),
    prisma.recipe.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        title: { contains: sanitized, mode: "insensitive" },
      },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: safeLimit,
    }),
  ])

  ingredientRows.sort((left, right) =>
    left.name.trim().toLowerCase().localeCompare(right.name.trim().toLowerCase(), undefined, {
      sensitivity: "base",
    }),
  )
  recipeRows.sort((left, right) =>
    left.title.toLowerCase().localeCompare(right.title.toLowerCase(), undefined, {
      sensitivity: "base",
    }),
  )

  const hits: PantryCatalogHit[] = []
  for (const row of ingredientRows) {
    hits.push({
      kind: "ingredient",
      id: numberFromBigInt(row.id),
      name: row.name,
      shelfLifePreset: resolveShelfLifePreset(row.shelf_life_preset),
    })
  }
  for (const row of recipeRows) {
    hits.push({ kind: "meal", id: numberFromBigInt(row.id), name: row.title })
  }

  hits.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
  return hits.slice(0, safeLimit)
}

export async function listPantryInventory(
  userId: number,
  locationFilter: PantryStorageLocation | "all",
): Promise<PantryInventoryRow[]> {
  const rows = await prisma.pantryInventory.findMany({
    where: {
      user_id: userId,
      ...(locationFilter === "all" ? {} : { storage_location: locationFilter }),
    },
    include: { ingredient_ref: true, meal: true },
  })
  const mapped = rows.map(rowToInventoryEntry)
  sortPantryInventoryRows(mapped, locationFilter)
  return mapped
}

export async function insertPantryInventoryRow(params: {
  userId: number
  storageLocation: PantryStorageLocation
  itemKind: PantryItemKind
  ingredientId: number | null
  recipeId: number | null
  customLabel: string | null
  quantity: number
  expiresOn: string | null
}): Promise<PantryInventoryRow> {
  const {
    userId,
    storageLocation,
    itemKind,
    ingredientId,
    recipeId,
    customLabel,
    quantity,
    expiresOn,
  } = params

  const trimmedExpiry = expiresOn?.trim()
  const expiresDate =
    trimmedExpiry == null || trimmedExpiry === ""
      ? null
      : new Date(`${trimmedExpiry.slice(0, 10)}T00:00:00.000Z`)
  const created = await prisma.pantryInventory.create({
    data: {
      user_id: userId,
      storage_location: storageLocation,
      item_kind: itemKind,
      ingredient_id: ingredientId == null ? null : bigIntId(ingredientId),
      recipe_id: recipeId == null ? null : bigIntId(recipeId),
      custom_label: customLabel,
      quantity,
      expires_on: expiresDate,
    },
  })

  const displayRow = await prisma.pantryInventory.findFirst({
    where: { id: created.id, user_id: userId },
    include: { ingredient_ref: true, meal: true },
  })
  if (!displayRow) throw new Error("Failed to load pantry row after insert")
  return rowToInventoryEntry(displayRow)
}

export async function deletePantryInventoryRow(userId: number, rowId: number): Promise<void> {
  await prisma.pantryInventory.deleteMany({ where: { id: bigIntId(rowId), user_id: userId } })
}
