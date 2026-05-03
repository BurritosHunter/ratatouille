import { listPantryInventory } from "@/lib/data/pantry-inventory";
import { listRecipes } from "@/lib/data/recipes";
import { z } from "zod";
import { assistantLayoutSchema, layoutToolResult, type AssistantLayoutToolInput } from "@/lib/ai/assistant-tools/layout";
import { recipesToToolRows } from "@/lib/ai/assistant-tools/recipe-rows";
import type { AssistantChatTool } from "@/lib/ai/assistant-tools/types";

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
    showPantryBoardForUser: {
      description:
        "Load the signed-in user's full pantry inventory and show the same interactive Pantry board as `/pantry` in the generated UI preview (below the site header). Call when they want to see, browse, add, or manage pantry items in that preview area. Rows are authoritative—never invent items, quantities, or dates.",
      inputSchema: emptyInputSchema,
      execute: async () => {
        const pantryRows = await listPantryInventory(userId, "all");

        return { pantryRows };
      },
    },
    setAssistantLayout: {
      description: "Set the modular layout preview in the main app shell (below the site header): singleColumn (stacked), twoColumn (side-by-side regions), or fullWidth (one wide content band). Use when the user asks to change the tool layout preview.",
      inputSchema: assistantLayoutSchema,
      execute: async (input: unknown) => layoutToolResult(input as AssistantLayoutToolInput),
    },
  };
}
