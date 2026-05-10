import type { ZodType } from "zod";

export type AssistantChatTool = {
  description: string;
  inputSchema: ZodType<unknown>;
  execute: (input?: unknown) => Promise<unknown>;
};
