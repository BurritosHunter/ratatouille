import { z } from "zod";

export const emptyInputSchema = z.object({});

/* Assistant tool. */
export const layoutOptions = ["singleColumn", "twoColumn", "fullWidth"] as const;
export type LayoutOption = (typeof layoutOptions)[number];

export const layoutRegionsSchema = z.object({ layout: z.enum(layoutOptions) });
export type LayoutRegionsToolInput = z.infer<typeof layoutRegionsSchema>;
