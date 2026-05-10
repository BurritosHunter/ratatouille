import { layoutRegionsSchema, type LayoutOption } from "@/lib/validators";

export const layoutRegionsToolType = "tool-layoutRegions" as const;

export function tryParseLayoutRegionsToolOutput(toolOutput: unknown): { layout: LayoutOption } | null {
  const parsed = layoutRegionsSchema.safeParse(toolOutput);
  if (!parsed.success) return null;

  return parsed.data;
}
