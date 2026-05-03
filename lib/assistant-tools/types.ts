import { z } from "zod";

export type AssistantChatTool = {
  description: string;
  inputSchema: z.ZodType<unknown>;
  execute: (input?: unknown) => Promise<unknown>;
};
