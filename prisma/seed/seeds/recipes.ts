import type { PrismaClient } from "../../generated/client";

import { clearUserPantryAndRecipes } from "./clear";
import type { SeedRecipe } from "../types";

/** Replaces this user’s `recipes` and `recipe_ingredients` rows. Expects matching `ingredients` names. */
export async function seedRecipesTables(prisma: PrismaClient, userId: number, recipes: SeedRecipe[]): Promise<number> {
  await clearUserPantryAndRecipes(prisma, userId);
  const ingredientRows = await prisma.ingredient.findMany({
    where: { user_id: userId, deleted_at: null },
    select: { id: true, name: true },
  });
  const ingredientIdByName = new Map<string, bigint>();
  for (const row of ingredientRows) {
    ingredientIdByName.set(row.name, row.id);
  }

  for (const recipe of recipes) {
    const recipeRow = await prisma.recipe.create({
      data: {
        user_id: userId,
        title: recipe.title,
        ingredients: recipe.ingredientsText,
        instructions: recipe.instructions,
        main_image_url: null,
      },
    });
    await prisma.recipeIngredient.createMany({
      data: recipe.lines.map((line) => {
        const ingredient_id = ingredientIdByName.get(line.ingredientName);
        if (ingredient_id == null) {
          throw new Error(`Unknown ingredient name: "${line.ingredientName}" (${recipe.title})`);
        }
        return {
          recipe_id: recipeRow.id,
          ingredient_id,
          sort_order: line.sortOrder,
          quantity_note: line.quantityNote,
        };
      }),
    });
  }

  return recipes.length;
}
