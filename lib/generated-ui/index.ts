import type { RecipeToolRow } from "@/lib/assistant-tools/recipe-rows";
import { layoutRegionsToolType, tryParseLayoutRegionsToolOutput, type LayoutOption } from "@/lib/assistant-tools/layout-regions";
import type { PantryInventoryRow, PantryItemKind } from "@/lib/models/pantry-inventory";

export type { LayoutOption };

export type GeneratedUIPayload = {
  generatedAtIso: string;
  lastCallId: string;
  recipes?: RecipeToolRow[];
  layout?: LayoutOption;
  pantryRows?: PantryInventoryRow[];
};

export type GeneratedUIDataFields = Partial<Pick<GeneratedUIPayload, "layout" | "recipes" | "pantryRows">>;

export const SUPPORTED_TOOL_TYPES = [layoutRegionsToolType, "tool-recipeList", "tool-pantryList"] as const;

export function mergeGeneratedUIPayload(previous: GeneratedUIPayload | null, callId: string, dataFields: GeneratedUIDataFields): GeneratedUIPayload {
  return {
    ...(previous ?? {}),
    ...dataFields,
    generatedAtIso: new Date().toISOString(),
    lastCallId: callId,
  };
}

function isPantryItemKind(value: unknown): value is PantryItemKind {
  return value === "ingredient" || value === "meal" || value === "custom";
}
function isPantryStorageLocation(value: unknown): value is PantryInventoryRow["storageLocation"] {
  return value === "fridge" || value === "pantry" || value === "storage" || value === "freezer";
}
function pantryRowFromUnknown(value: unknown): PantryInventoryRow | null {
  if (typeof value !== "object" || value === null) return null;

  const record = value as Record<string, unknown>;

  const idRaw = record.id;
  const id = typeof idRaw === "number" && Number.isFinite(idRaw)
      ? idRaw
      : typeof idRaw === "string" && idRaw.trim() !== "" && Number.isFinite(Number(idRaw))
        ? Number(idRaw)
        : null;
  const displayName = record.displayName;
  const quantity = record.quantity;

  const storageLocation = record.storageLocation;
  const itemKind = record.itemKind;

  if (id === null || typeof displayName !== "string" || typeof quantity !== "string") return null;
  if (!isPantryStorageLocation(storageLocation)) return null;
  if (!isPantryItemKind(itemKind)) return null;

  const ingredientIdRaw = record.ingredientId;
  const ingredientId = ingredientIdRaw === null
      ? null
      : typeof ingredientIdRaw === "number"
        ? ingredientIdRaw
        : typeof ingredientIdRaw === "string" && Number.isFinite(Number(ingredientIdRaw))
          ? Number(ingredientIdRaw)
          : null;

  const recipeIdRaw = record.recipeId;
  const recipeId = recipeIdRaw === null
      ? null
      : typeof recipeIdRaw === "number"
        ? recipeIdRaw
        : typeof recipeIdRaw === "string" && Number.isFinite(Number(recipeIdRaw))
          ? Number(recipeIdRaw)
          : null;

  const expiresOnRaw = record.expiresOn;
  const expiresOn = expiresOnRaw === null ? null : typeof expiresOnRaw === "string" ? expiresOnRaw : null;

  const customLabelRaw = record.customLabel;
  const customLabel = customLabelRaw === null ? null : typeof customLabelRaw === "string" ? customLabelRaw : null;

  return {
    id,
    storageLocation,
    itemKind,
    ingredientId,
    recipeId,
    customLabel,
    quantity,
    expiresOn,
    displayName,
  };
}
function tryPantryBoardToolGeneratedUIData(toolOutput: unknown): GeneratedUIDataFields | null {
  if (typeof toolOutput !== "object" || toolOutput === null) return null;

  const record = toolOutput as Record<string, unknown>;
  if (!Array.isArray(record.pantryRows)) return null;

  const pantryRows: PantryInventoryRow[] = [];
  for (const entry of record.pantryRows) {
    const mapped = pantryRowFromUnknown(entry);
    if (!mapped) return null;
    pantryRows.push(mapped);
  }

  return { pantryRows };
}

export function tryParseToolData(toolType: (typeof SUPPORTED_TOOL_TYPES)[number], toolOutput: unknown): GeneratedUIDataFields | null {
  switch (toolType) {
    case "tool-recipeList": {
      const listRecipesToolOutput = toolOutput as { recipes?: RecipeToolRow[] };
      if (!listRecipesToolOutput.recipes) return null;

      return { recipes: listRecipesToolOutput.recipes };
    }
    case "tool-pantryList":
      return tryPantryBoardToolGeneratedUIData(toolOutput);
    case layoutRegionsToolType:
      return tryParseLayoutRegionsToolOutput(toolOutput);
    default:
      return null;
  }
}
