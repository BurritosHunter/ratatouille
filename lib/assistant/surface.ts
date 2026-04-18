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

/** Tool `type` values on UI message parts (`tool-${camelName}`). Keep in sync with `createAssistantChatTools`. */
export const ASSISTANT_SURFACE_TOOL_PART_TYPES = [
  "tool-listRecipesForUser",
  "tool-setAssistantLayout",
  "tool-setAssistantBackgroundRed",
  "tool-setAssistantBackgroundBlue",
  "tool-setAssistantBackgroundGreen",
] as const;

export type AssistantSurfaceToolPartType = (typeof ASSISTANT_SURFACE_TOOL_PART_TYPES)[number];

export function mergeAssistantSurfacePayload(
  previous: AssistantSurfacePayload | null,
  callId: string,
  patch: Partial<Pick<AssistantSurfacePayload, "recipes" | "layout" | "backgroundColor">>,
): AssistantSurfacePayload {
  return {
    ...(previous ?? {}),
    ...patch,
    generatedAtIso: new Date().toISOString(),
    lastCallId: callId,
  };
}
