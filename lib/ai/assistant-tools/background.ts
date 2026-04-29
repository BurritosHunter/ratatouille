import { z } from "zod";
import type { BackgroundColorToken } from "@/lib/generated-ui";

export const assistantBackgroundSchema = z.object({ color: z.enum(["red", "blue", "green"]) });

export type AssistantBackgroundToolInput = z.infer<typeof assistantBackgroundSchema>;

export function backgroundToolResult(input: AssistantBackgroundToolInput): { backgroundColor: BackgroundColorToken } {
  return { backgroundColor: input.color };
}
