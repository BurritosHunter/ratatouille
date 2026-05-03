import { z } from "zod";
import type { LayoutOption } from "@/lib/generated-ui";

export const assistantLayoutSchema = z.object({ layout: z.enum(["singleColumn", "twoColumn", "fullWidth"]) });

export type AssistantLayoutToolInput = z.infer<typeof assistantLayoutSchema>;

export function layoutToolResult(input: AssistantLayoutToolInput): { layout: LayoutOption } {
  return { layout: input.layout };
}
