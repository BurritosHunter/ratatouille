import { z } from "zod";
import type { AssistantBackgroundColorToken } from "@/lib/assistant/surface";

export const assistantBackgroundSchema = z.object({ color: z.enum(["red", "blue", "green"]) });

export type AssistantBackgroundToolInput = z.infer<typeof assistantBackgroundSchema>;

export function backgroundToolResult( input: AssistantBackgroundToolInput ): { backgroundColor: AssistantBackgroundColorToken } {
  return { backgroundColor: input.color };
}
