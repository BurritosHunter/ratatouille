import type { RecipeToolRow } from "@/lib/ai/recipe-tool-rows";

export type AssistantLayoutOption = "singleColumn" | "twoColumn" | "fullWidth";
export type AssistantBackgroundColorToken = "red" | "blue" | "green";

export type AssistantGeneratedUIPayload = {
  generatedAtIso: string;
  lastCallId: string;
  recipes?: RecipeToolRow[];
  layout?: AssistantLayoutOption;
  backgroundColor?: AssistantBackgroundColorToken;
};

export type AssistantGeneratedUIDataFields = Partial<Pick<AssistantGeneratedUIPayload, "recipes" | "layout" | "backgroundColor">>;

export const SUPPORTED_TOOL_TYPES = [
  "tool-listRecipesForUser",
  "tool-setAssistantLayout",
  "tool-setAssistantBackground",
] as const;

export function mergeAssistantGeneratedUIPayload(
  previous: AssistantGeneratedUIPayload | null,
  callId: string,
  dataFields: AssistantGeneratedUIDataFields,
): AssistantGeneratedUIPayload {
  return {
    ...(previous ?? {}),
    ...dataFields,
    generatedAtIso: new Date().toISOString(),
    lastCallId: callId,
  };
}

export function getGeneratedUIDataFieldsFromToolOutput(
  toolType: (typeof SUPPORTED_TOOL_TYPES)[number],
  toolOutput: unknown,
): AssistantGeneratedUIDataFields | null {
  switch (toolType) {
    case "tool-listRecipesForUser": {
      const output = toolOutput as { recipes?: RecipeToolRow[] };
      if (!output.recipes) { return null; }
      return { recipes: output.recipes };
    }
    case "tool-setAssistantLayout": {
      const output = toolOutput as { layout?: AssistantLayoutOption };
      if (!output.layout) { return null; }
      return { layout: output.layout };
    }
    case "tool-setAssistantBackground": {
      const output = toolOutput as { backgroundColor?: AssistantBackgroundColorToken };
      if (!output.backgroundColor) { return null; }
      return { backgroundColor: output.backgroundColor };
    }
    default:
      return null;
  }
}
