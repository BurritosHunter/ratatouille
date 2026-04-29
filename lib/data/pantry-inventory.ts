import { getSql } from "@/lib/db"
import type {
  PantryCatalogHit,
  PantryInventoryRow,
  PantryItemKind,
  PantryStorageLocation,
} from "@/lib/models/pantry-inventory"

const STORAGE_LOCATIONS: readonly PantryStorageLocation[] = [
  "fridge",
  "pantry",
  "storage",
  "freezer",
] as const

function toId(value: string | number): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value)
  if (!Number.isFinite(parsed)) throw new Error("Invalid id")
  return parsed
}

function isPantryStorageLocation(value: string): value is PantryStorageLocation {
  return (STORAGE_LOCATIONS as readonly string[]).includes(value)
}

function isPantryItemKind(value: string): value is PantryItemKind {
  return value === "ingredient" || value === "meal" || value === "custom"
}

type PantryInventoryJoinedRow = {
  id: string | number
  storage_location: string
  item_kind: string
  ingredient_id: string | number | null
  recipe_id: string | number | null
  custom_label: string | null
  quantity: string | number
  expires_on: Date | string | null
  display_name: string | null
}

function rowToInventoryEntry(row: PantryInventoryJoinedRow): PantryInventoryRow {
  if (!isPantryStorageLocation(row.storage_location)) {
    throw new Error("Invalid storage location in row")
  }
  if (!isPantryItemKind(row.item_kind)) {
    throw new Error("Invalid item kind in row")
  }
  const expiresOn =
    row.expires_on === null || row.expires_on === undefined
      ? null
      : typeof row.expires_on === "string"
        ? row.expires_on.slice(0, 10)
        : row.expires_on.toISOString().slice(0, 10)

  return {
    id: toId(row.id),
    storageLocation: row.storage_location,
    itemKind: row.item_kind,
    ingredientId: row.ingredient_id === null ? null : toId(row.ingredient_id),
    recipeId: row.recipe_id === null ? null : toId(row.recipe_id),
    customLabel: row.custom_label,
    quantity: String(row.quantity),
    expiresOn,
    displayName: row.display_name ?? row.custom_label ?? "—",
  }
}

export async function searchPantryCatalog(
  userId: number,
  query: string,
  limit = 20,
): Promise<PantryCatalogHit[]> {
  const trimmed = query.trim().replaceAll("%", "").replaceAll("_", "")
  if (!trimmed) return []

  const pattern = `%${trimmed}%`
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20

  const ingredientRows = await getSql()`
    SELECT id, name
    FROM ingredients
    WHERE user_id = ${userId}
      AND deleted_at IS NULL
      AND name ILIKE ${pattern}
    ORDER BY lower(btrim(name)) ASC
    LIMIT ${safeLimit}
  `

  const recipeRows = await getSql()`
    SELECT id, title AS name
    FROM recipes
    WHERE user_id = ${userId}
      AND deleted_at IS NULL
      AND title ILIKE ${pattern}
    ORDER BY lower(title) ASC
    LIMIT ${safeLimit}
  `

  const hits: PantryCatalogHit[] = []
  for (const row of ingredientRows as { id: string | number; name: string }[]) {
    hits.push({ kind: "ingredient", id: toId(row.id), name: row.name })
  }
  for (const row of recipeRows as { id: string | number; name: string }[]) {
    hits.push({ kind: "meal", id: toId(row.id), name: row.name })
  }

  hits.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
  return hits.slice(0, safeLimit)
}

export async function listPantryInventory(
  userId: number,
  locationFilter: PantryStorageLocation | "all",
): Promise<PantryInventoryRow[]> {
  const rows =
    locationFilter === "all"
      ? await getSql()`
          SELECT
            pi.id,
            pi.storage_location,
            pi.item_kind,
            pi.ingredient_id,
            pi.recipe_id,
            pi.custom_label,
            pi.quantity,
            pi.expires_on,
            COALESCE(i.name, r.title, pi.custom_label) AS display_name
          FROM pantry_inventory pi
          LEFT JOIN ingredients i ON i.id = pi.ingredient_id AND i.deleted_at IS NULL
          LEFT JOIN recipes r ON r.id = pi.recipe_id AND r.deleted_at IS NULL
          WHERE pi.user_id = ${userId}
          ORDER BY pi.storage_location ASC, lower(COALESCE(i.name, r.title, pi.custom_label)) ASC, pi.id ASC
        `
      : await getSql()`
          SELECT
            pi.id,
            pi.storage_location,
            pi.item_kind,
            pi.ingredient_id,
            pi.recipe_id,
            pi.custom_label,
            pi.quantity,
            pi.expires_on,
            COALESCE(i.name, r.title, pi.custom_label) AS display_name
          FROM pantry_inventory pi
          LEFT JOIN ingredients i ON i.id = pi.ingredient_id AND i.deleted_at IS NULL
          LEFT JOIN recipes r ON r.id = pi.recipe_id AND r.deleted_at IS NULL
          WHERE pi.user_id = ${userId}
            AND pi.storage_location = ${locationFilter}
          ORDER BY lower(COALESCE(i.name, r.title, pi.custom_label)) ASC, pi.id ASC
        `

  return (rows as PantryInventoryJoinedRow[]).map(rowToInventoryEntry)
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

  const rows = await getSql()`
    INSERT INTO pantry_inventory (
      user_id,
      storage_location,
      item_kind,
      ingredient_id,
      recipe_id,
      custom_label,
      quantity,
      expires_on
    )
    VALUES (
      ${userId},
      ${storageLocation},
      ${itemKind},
      ${ingredientId},
      ${recipeId},
      ${customLabel},
      ${quantity},
      ${expiresOn}
    )
    RETURNING
      id,
      storage_location,
      item_kind,
      ingredient_id,
      recipe_id,
      custom_label,
      quantity,
      expires_on
  `
  const inserted = (rows as Record<string, unknown>[])[0]
  if (!inserted) throw new Error("Failed to insert pantry row")

  const displayRows = await getSql()`
    SELECT
      pi.id,
      pi.storage_location,
      pi.item_kind,
      pi.ingredient_id,
      pi.recipe_id,
      pi.custom_label,
      pi.quantity,
      pi.expires_on,
      COALESCE(i.name, r.title, pi.custom_label) AS display_name
    FROM pantry_inventory pi
    LEFT JOIN ingredients i ON i.id = pi.ingredient_id AND i.deleted_at IS NULL
    LEFT JOIN recipes r ON r.id = pi.recipe_id AND r.deleted_at IS NULL
    WHERE pi.id = ${toId(inserted.id as string | number)} AND pi.user_id = ${userId}
    LIMIT 1
  `
  const displayRow = (displayRows as PantryInventoryJoinedRow[])[0]
  if (!displayRow) throw new Error("Failed to load pantry row after insert")
  return rowToInventoryEntry(displayRow)
}

export async function deletePantryInventoryRow(userId: number, rowId: number): Promise<void> {
  await getSql()`
    DELETE FROM pantry_inventory
    WHERE id = ${rowId} AND user_id = ${userId}
  `
}
