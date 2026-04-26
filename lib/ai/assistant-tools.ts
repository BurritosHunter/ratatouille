import {
  assistantBackgroundSchema,
  backgroundToolResult,
  type AssistantBackgroundToolInput,
} from "@/lib/ai/assistant-background-tool";
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

export function createAssistantTools({ userId }: { userId: number }): Record<string, AssistantChatTool> {
  const emptyInputSchema = z.object({});

  return {
    listRecipesForUser: {
      description: "Load and return the signed-in user's recipe list for the generated UI preview. Call when the user asks about their recipes, wants a list, or an overview. Do not invent or guess recipe names; use this tool output as the source of truth.",
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
    setAssistantBackground: {
      description: "Show a solid colored square inside the first column of the modular layout preview in the main shell (not the whole page). Use the color input: red, blue, or green—choose the one that matches the user's request, or the best option when they ask for a swatch or colored square without naming a color. The square is not the full page background.",
      inputSchema: assistantBackgroundSchema,
      execute: async (input: unknown) => backgroundToolResult(input as AssistantBackgroundToolInput),
    },
  };
}
