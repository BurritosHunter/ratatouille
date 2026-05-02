"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/auth-user";
import { createIngredient } from "@/lib/data/ingredients";
import { deletePantryInventoryRow, insertPantryInventoryRow, searchPantryCatalog } from "@/lib/data/pantry-inventory";
import type { PantryCatalogHit, PantryStorageLocation } from "@/lib/models/pantry-inventory";

const STORAGE_SET = new Set<PantryStorageLocation>(["fridge", "pantry", "storage", "freezer"]);

function parseStorageLocation(value: unknown): PantryStorageLocation | null {
  if (typeof value !== "string") return null;
  if (STORAGE_SET.has(value as PantryStorageLocation)) return value as PantryStorageLocation;

  return null;
}

/** Empty or omitted quantity defaults to 1 (DB default). Non-empty invalid input yields null. */
function parseQuantityInput(value: unknown): number | null {
  if (value === null || value === undefined) return 1;
  if (typeof value === "string" && value.trim() === "") return 1;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) return parsed;

    return null;
  }
  return null;
}

/** Missing or blank → omit (`null`). Non-empty malformed input → `{ ok: false }`. */
function parseOptionalExpiresOnField(value: unknown): { ok: true; expiresOn: string | null } | { ok: false } {
  if (value === null || value === undefined) return { ok: true, expiresOn: null };
  if (typeof value !== "string") return { ok: false };

  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, expiresOn: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { ok: false };

  return { ok: true, expiresOn: trimmed };
}

export async function searchPantryCatalogAction(query: string): Promise<{ ok: true; hits: PantryCatalogHit[] } | { ok: false }> {
  try {
    const userId = await requireUserId("/pantry");
    const hits = await searchPantryCatalog(userId, query);
    return { ok: true, hits };
  } catch {
    return { ok: false };
  }
}

export async function addPantryInventoryLine(payload: unknown): Promise<{ ok: true } | { ok: false; reason: "validation" | "server" }> {
  try {
    const userId = await requireUserId("/pantry");
    if (!payload || typeof payload !== "object") return { ok: false, reason: "validation" };

    const fields = payload as Record<string, unknown>;
    const storageLocation = parseStorageLocation(fields.storageLocation);
    const quantity = parseQuantityInput(fields.quantity);
    const expiryParseResult = parseOptionalExpiresOnField(fields.expiresOn);
    if (!expiryParseResult.ok) return { ok: false, reason: "validation" };

    const expiresOn = expiryParseResult.expiresOn;
    if (!storageLocation || quantity === null) return { ok: false, reason: "validation" };

    const mode = fields.mode;
    if (mode === "catalog") {
      const kind = fields.itemKind;
      const catalogId = fields.catalogId;
      if (kind !== "ingredient" && kind !== "meal") return { ok: false, reason: "validation" };

      const resolvedCatalogNumericId = typeof catalogId === "number" && Number.isFinite(catalogId) ? catalogId : typeof catalogId === "string" ? Number.parseInt(catalogId, 10) : Number.NaN;
      if (!Number.isFinite(resolvedCatalogNumericId)) return { ok: false, reason: "validation" };

      await insertPantryInventoryRow({
        userId,
        storageLocation,
        itemKind: kind,
        ingredientId: kind === "ingredient" ? resolvedCatalogNumericId : null,
        recipeId: kind === "meal" ? resolvedCatalogNumericId : null,
        customLabel: null,
        quantity,
        expiresOn,
      });
      revalidatePath("/pantry");
      return { ok: true };
    }

    if (mode === "custom") {
      const label = typeof fields.customLabel === "string" ? fields.customLabel.trim() : "";
      if (!label) return { ok: false, reason: "validation" };

      await insertPantryInventoryRow({
        userId,
        storageLocation,
        itemKind: "custom",
        ingredientId: null,
        recipeId: null,
        customLabel: label,
        quantity,
        expiresOn,
      });
      revalidatePath("/pantry");
      return { ok: true };
    }

    if (mode === "newIngredient") {
      const name = typeof fields.ingredientName === "string" ? fields.ingredientName.trim() : "";
      if (!name) return { ok: false, reason: "validation" };

      const ingredient = await createIngredient(userId, name);
      await insertPantryInventoryRow({
        userId,
        storageLocation,
        itemKind: "ingredient",
        ingredientId: ingredient.id,
        recipeId: null,
        customLabel: null,
        quantity,
        expiresOn,
      });
      revalidatePath("/pantry");
      revalidatePath("/ingredients");
      return { ok: true };
    }

    return { ok: false, reason: "validation" };
  } catch {
    return { ok: false, reason: "server" };
  }
}

export async function removePantryInventoryLine(rowId: unknown): Promise<{ ok: true } | { ok: false }> {
  try {
    const userId = await requireUserId("/pantry");
    const resolvedInventoryRowNumericId = typeof rowId === "number" && Number.isFinite(rowId) ? rowId : typeof rowId === "string" ? Number.parseInt(rowId, 10) : Number.NaN;
    if (!Number.isFinite(resolvedInventoryRowNumericId)) return { ok: false };

    await deletePantryInventoryRow(userId, resolvedInventoryRowNumericId);
    revalidatePath("/pantry");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
