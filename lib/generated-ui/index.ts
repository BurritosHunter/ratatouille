import type { RecipeToolRow } from "@/lib/ai/assistant-tools/recipe-rows";

export type LayoutOption = "singleColumn" | "twoColumn" | "fullWidth";

export type GeneratedUIPayload = {
  generatedAtIso: string;
  lastCallId: string;
  recipes?: RecipeToolRow[];
  layout?: LayoutOption;
};

export type GeneratedUIDataFields = Partial<Pick<GeneratedUIPayload, "recipes" | "layout">>;

export const SUPPORTED_TOOL_TYPES = ["tool-listRecipesForUser", "tool-setAssistantLayout"] as const;

export function mergeGeneratedUIPayload(previous: GeneratedUIPayload | null, callId: string, dataFields: GeneratedUIDataFields): GeneratedUIPayload {
  return {
    ...(previous ?? {}),
    ...dataFields,
    generatedAtIso: new Date().toISOString(),
    lastCallId: callId,
  };
}

export function tryParseToolData(toolType: (typeof SUPPORTED_TOOL_TYPES)[number], toolOutput: unknown): GeneratedUIDataFields | null {
  switch (toolType) {
    case "tool-listRecipesForUser": {
      const listRecipesToolOutput = toolOutput as { recipes?: RecipeToolRow[] };
      if (!listRecipesToolOutput.recipes) return null;

      return { recipes: listRecipesToolOutput.recipes };
    }
    case "tool-setAssistantLayout": {
      const layoutToolOutput = toolOutput as { layout?: LayoutOption };
      if (!layoutToolOutput.layout) return null;

      return { layout: layoutToolOutput.layout };
    }
    default:
      return null;
  }
}
