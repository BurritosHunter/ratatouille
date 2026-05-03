import { z } from "zod";

export const layoutOptions = ["singleColumn", "twoColumn", "fullWidth"] as const;
export type LayoutOption = (typeof layoutOptions)[number];

export const layoutRegionsToolType = "tool-layoutRegions" as const;

export const layoutRegionsSchema = z.object({ layout: z.enum(layoutOptions) });

export type LayoutRegionsToolInput = z.infer<typeof layoutRegionsSchema>;

export function tryParseLayoutRegionsToolOutput(toolOutput: unknown): { layout: LayoutOption } | null {
  const parsed = layoutRegionsSchema.safeParse(toolOutput);
  if (!parsed.success) return null;

  return parsed.data;
}
