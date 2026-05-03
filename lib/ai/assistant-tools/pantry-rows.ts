import type { PantryInventoryRow, PantryItemKind, PantryStorageLocation } from "@/lib/models/pantry-inventory";

/** Serializable pantry row for assistant tools and generated UI state. */
export type PantryToolRow = {
  id: number;
  storageLocation: PantryStorageLocation;
  itemKind: PantryItemKind;
  quantity: string;
  expiresOn: string | null;
  displayName: string;
};

export function pantryInventoryToToolRows(rows: PantryInventoryRow[]): PantryToolRow[] {
  return rows.map((row) => ({
    id: row.id,
    storageLocation: row.storageLocation,
    itemKind: row.itemKind,
    quantity: row.quantity,
    expiresOn: row.expiresOn,
    displayName: row.displayName,
  }));
}
