import { z } from "zod";
import type { AssistantLayoutOption } from "@/lib/assistant/generated-ui";

export const assistantLayoutSchema = z.object({
  layout: z.enum(["singleColumn", "twoColumn", "fullWidth"]),
});

export type AssistantLayoutToolInput = z.infer<typeof assistantLayoutSchema>;

export function layoutToolResult(input: AssistantLayoutToolInput): { layout: AssistantLayoutOption } {
  return { layout: input.layout };
}
