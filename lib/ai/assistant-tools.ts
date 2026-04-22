import {
  assistantLayoutSchema,
  layoutToolResult,
  type AssistantLayoutToolInput,
} from "@/lib/ai/assistant-layout-tool";
import { z } from "zod";

type AssistantChatTool = {
  description: string;
  inputSchema: z.ZodType<unknown>;
  execute: (input?: unknown) => Promise<unknown>;
};

export function createAssistantTools(): Record<string, AssistantChatTool> {
  const emptyInputSchema = z.object({});

  return {
    listRecipesForUser: {
      description: "Signal the app to load the signed-in user's recipe list in the main layout preview. The tool does not return recipe data—the client fetches and shows titles. Call when the user asks about their recipes, wants a list, or an overview. Do not make up or guess recipe names; after calling, you may add a short reply that the list and a summary are shown in the app.",
      inputSchema: emptyInputSchema,
      execute: async () => ({ status: "client" as const }),
    },
    setAssistantLayout: {
      description: "Set the modular layout preview in the main app shell (below the site header): singleColumn (stacked), twoColumn (side-by-side regions), or fullWidth (one wide content band). Use when the user asks to change the tool layout preview.",
      inputSchema: assistantLayoutSchema,
      execute: async (input: unknown) => layoutToolResult(input as AssistantLayoutToolInput),
    },
    setAssistantBackgroundRed: {
      description: "Show a solid red square inside the first column of the modular layout preview in the main shell (not the whole page). Call when the user asks for a red square or red swatch in that preview.",
      inputSchema: emptyInputSchema,
      execute: async () => ({ backgroundColor: "red" }),
    },
    setAssistantBackgroundBlue: {
      description: "Show a solid blue square inside the first column of the modular layout preview in the main shell (not the whole page). Call when the user asks for a blue square or blue swatch in that preview.",
      inputSchema: emptyInputSchema,
      execute: async () => ({ backgroundColor: "blue" }),
    },
    setAssistantBackgroundGreen: {
      description: "Show a solid green square inside the first column of the modular layout preview in the main shell (not the whole page). Call when the user asks for a green square or green swatch in that preview.",
      inputSchema: emptyInputSchema,
      execute: async () => ({ backgroundColor: "green" }),
    },
  };
}
