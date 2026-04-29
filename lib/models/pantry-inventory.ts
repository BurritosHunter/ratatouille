export type PantryStorageLocation = "fridge" | "pantry" | "storage" | "freezer"

export type PantryItemKind = "ingredient" | "meal" | "custom"

export type PantryInventoryRow = {
  id: number
  storageLocation: PantryStorageLocation
  itemKind: PantryItemKind
  ingredientId: number | null
  recipeId: number | null
  customLabel: string | null
  quantity: string
  expiresOn: string | null
  displayName: string
}

export type PantryCatalogHit =
  | { kind: "ingredient"; id: number; name: string }
  | { kind: "meal"; id: number; name: string }
