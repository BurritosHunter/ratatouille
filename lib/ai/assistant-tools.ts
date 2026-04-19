import {
  assistantLayoutSchema,
  layoutToolResult,
  type AssistantLayoutToolInput,
} from "@/lib/ai/assistant-layout-tool";
import { recipesToToolRows } from "@/lib/ai/recipe-tool-rows";
import { listRecipes } from "@/lib/data/recipes";
import { z } from "zod";

type AssistantChatTool = {
  description: string;
  inputSchema: z.ZodType<unknown>;
  execute: (input?: unknown) => Promise<unknown>;
};

export function createAssistantTools(userId: number): Record<string, AssistantChatTool> {
  const emptyInputSchema = z.object({});

  return {
    listRecipesForUser: {
      description: "List all recipes belonging to the signed-in user. Call this when the user asks about their recipes, wants to see what they have saved, or needs an overview of their recipe collection.",
      inputSchema: emptyInputSchema,
      execute: async () => {
        const summaries = await listRecipes(userId);
        return { recipes: recipesToToolRows(summaries) };
      },
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
