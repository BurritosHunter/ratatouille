import type { PrismaClient } from "../../generated/client";

/** Clears FK-heavy rows before reseeding this user’s `recipes` or `ingredients`. */
export async function clearUserPantryAndRecipes(prisma: PrismaClient, userId: number): Promise<void> {
  await prisma.pantryInventory.deleteMany({ where: { user_id: userId } });
  await prisma.recipe.deleteMany({ where: { user_id: userId } });
}
