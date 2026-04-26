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
