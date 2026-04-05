import { getSql } from "@/lib/db"
import type { Recipe, RecipeSummary } from "@/lib/types/recipe"

type RecipeRow = {
  id: string | number
  title: string
  ingredients: string
  instructions: string
}

type RecipeSummaryRow = {
  id: string | number
  title: string
}

function toId(value: string | number): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : Number(value)
  if (!Number.isFinite(n)) throw new Error("Invalid recipe id")
  return n
}

function toRecipe(row: RecipeRow): Recipe {
  return {
    id: toId(row.id),
    title: row.title,
    ingredients: row.ingredients,
    instructions: row.instructions,
  }
}

function toRecipeSummary(row: RecipeSummaryRow): RecipeSummary {
  return { id: toId(row.id), title: row.title }
}

/** Expects a `recipes` table per db/recipes.sql */
export async function listRecipes(userId: number): Promise<RecipeSummary[]> {
  const rows = await getSql()`
    SELECT id, title
    FROM recipes
    WHERE user_id = ${userId} AND deleted_at IS NULL
    ORDER BY created_at DESC
  `
  return (rows as RecipeSummaryRow[]).map(toRecipeSummary)
}

export async function getRecipeById(userId: number, recipeId: number): Promise<Recipe | null> {
  const rows = await getSql()`
    SELECT id, title, ingredients, instructions
    FROM recipes
    WHERE id = ${recipeId} AND user_id = ${userId} AND deleted_at IS NULL
    LIMIT 1
  `
  const row = (rows as RecipeRow[])[0]
  if (!row) return null
  return toRecipe(row)
}

export async function createRecipe(
  userId: number,
  title: string,
  ingredients: string,
  instructions: string,
): Promise<Recipe> {
  const rows = await getSql()`
    INSERT INTO recipes (user_id, title, ingredients, instructions)
    VALUES (${userId}, ${title}, ${ingredients}, ${instructions})
    RETURNING id, title, ingredients, instructions
  `
  const row = (rows as RecipeRow[])[0]
  if (!row) throw new Error("Failed to create recipe")
  return toRecipe(row)
}

export async function softDeleteRecipe(userId: number, recipeId: number): Promise<void> {
  await getSql()`
    UPDATE recipes
    SET deleted_at = now(), updated_at = now()
    WHERE id = ${recipeId} AND user_id = ${userId} AND deleted_at IS NULL
  `
}

export async function restoreRecipe(userId: number, recipeId: number): Promise<void> {
  await getSql()`
    UPDATE recipes
    SET deleted_at = NULL, updated_at = now()
    WHERE id = ${recipeId} AND user_id = ${userId} AND deleted_at IS NOT NULL
  `
}
