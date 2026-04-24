import type { RecipeToolRow } from "@/lib/ai/recipe-tool-rows";

export type AssistantLayoutOption = "singleColumn" | "twoColumn" | "fullWidth";
export type AssistantBackgroundColorToken = "red" | "blue" | "green";

export type AssistantSurfacePayload = {
  generatedAtIso: string;
  lastCallId: string;
  recipes?: RecipeToolRow[];
  layout?: AssistantLayoutOption;
  backgroundColor?: AssistantBackgroundColorToken;
};

export type AssistantSurfaceDataFields = Partial<Pick<AssistantSurfacePayload, "recipes" | "layout" | "backgroundColor">>;

export const SUPPORTED_TOOL_TYPES = [
  "tool-listRecipesForUser",
  "tool-setAssistantLayout",
  "tool-setAssistantBackground",
] as const;

export function mergeAssistantSurfacePayload(
  previous: AssistantSurfacePayload | null,
  callId: string,
  dataFields: AssistantSurfaceDataFields,
): AssistantSurfacePayload {
  return {
    ...(previous ?? {}),
    ...dataFields,
    generatedAtIso: new Date().toISOString(),
    lastCallId: callId,
  };
}
