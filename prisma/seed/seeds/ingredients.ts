import type { PrismaClient } from "../../generated/client";

import { clearUserPantryAndRecipes } from "./clear";
import type { SeedIngredient } from "../types";

/** Replaces this user’s `ingredients` rows with `payload` after clearing pantry & recipes for FK safety. */
export async function seedIngredientsTable(prisma: PrismaClient, userId: number, payload: SeedIngredient[]): Promise<number> {
  await clearUserPantryAndRecipes(prisma, userId);
  await prisma.ingredient.deleteMany({ where: { user_id: userId } });

  await prisma.ingredient.createMany({
    data: payload.map((row) => ({
      user_id: userId,
      name: row.name,
      category: row.category ?? "miscellaneous",
      shelf_life_preset: row.shelfLifePreset ?? "1_year",
    })),
  });
  return payload.length;
}
