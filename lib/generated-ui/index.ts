import type { PantryToolRow } from "@/lib/ai/assistant-tools/pantry-rows";
import type { RecipeToolRow } from "@/lib/ai/assistant-tools/recipe-rows";

export type LayoutOption = "singleColumn" | "twoColumn" | "fullWidth";
export type BackgroundColorToken = "red" | "blue" | "green";

export type GeneratedUIPayload = {
  generatedAtIso: string;
  lastCallId: string;
  recipes?: RecipeToolRow[];
  pantryRows?: PantryToolRow[];
  layout?: LayoutOption;
  backgroundColor?: BackgroundColorToken;
};

export type GeneratedUIDataFields = Partial<
  Pick<GeneratedUIPayload, "recipes" | "pantryRows" | "layout" | "backgroundColor">
>;

export const SUPPORTED_TOOL_TYPES = [
  "tool-listRecipesForUser",
  "tool-listPantryForUser",
  "tool-setAssistantLayout",
  "tool-setAssistantBackground",
] as const;

export function mergeGeneratedUIPayload(
  previous: GeneratedUIPayload | null,
  callId: string,
  dataFields: GeneratedUIDataFields,
): GeneratedUIPayload {
  return {
    ...(previous ?? {}),
    ...dataFields,
    generatedAtIso: new Date().toISOString(),
    lastCallId: callId,
  };
}

export function tryParseToolData(
  toolType: (typeof SUPPORTED_TOOL_TYPES)[number],
  toolOutput: unknown,
): GeneratedUIDataFields | null {
  switch (toolType) {
    case "tool-listRecipesForUser": {
      const output = toolOutput as { recipes?: RecipeToolRow[] };
      if (!output.recipes) { return null; }
      return { recipes: output.recipes };
    }
    case "tool-listPantryForUser": {
      const output = toolOutput as { pantryRows?: PantryToolRow[] };
      if (!output.pantryRows) { return null; }
      return { pantryRows: output.pantryRows };
    }
    case "tool-setAssistantLayout": {
      const output = toolOutput as { layout?: LayoutOption };
      if (!output.layout) { return null; }
      return { layout: output.layout };
    }
    case "tool-setAssistantBackground": {
      const output = toolOutput as { backgroundColor?: BackgroundColorToken };
      if (!output.backgroundColor) { return null; }
      return { backgroundColor: output.backgroundColor };
    }
    default:
      return null;
  }
}
