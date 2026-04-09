import { getSql } from "@/lib/db"
import { RecipeImagePatchAction } from "@/lib/constants"
import type { Recipe, RecipeImagePatch, RecipeSummary } from "../models/recipe"

type RecipeRow = {
  id: string | number
  title: string
  ingredients: string
  instructions: string
  main_image_url: string | null
  has_stored_image: boolean
}

type RecipeSummaryRow = {
  id: string | number
  title: string
  main_image_url: string | null
  has_stored_image: boolean
}


function toId(value: string | number): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value)
  if (!Number.isFinite(parsed)) throw new Error("Invalid recipe id")
  return parsed
}

function toRecipe(row: RecipeRow): Recipe {
  return {
    id: toId(row.id),
    title: row.title,
    ingredients: row.ingredients,
    instructions: row.instructions,
    mainImageUrl: row.main_image_url,
    hasStoredImage: Boolean(row.has_stored_image),
  }
}

function toRecipeSummary(row: RecipeSummaryRow): RecipeSummary {
  return {
    id: toId(row.id),
    title: row.title,
    mainImageUrl: row.main_image_url,
    hasStoredImage: Boolean(row.has_stored_image),
  }
}

/** Expects `recipes` columns per db/recipes.sql */
export async function listRecipes(userId: number): Promise<RecipeSummary[]> {
  const rows = await getSql()`
    SELECT
      id,
      title,
      main_image_url,
      (main_image_data IS NOT NULL) AS has_stored_image
    FROM recipes
    WHERE user_id = ${userId} AND deleted_at IS NULL
    ORDER BY created_at DESC
  `
  return (rows as RecipeSummaryRow[]).map(toRecipeSummary)
}

export async function getRecipeById(userId: number, recipeId: number): Promise<Recipe | null> {
  const rows = await getSql()`
    SELECT
      id,
      title,
      ingredients,
      instructions,
      main_image_url,
      (main_image_data IS NOT NULL) AS has_stored_image
    FROM recipes
    WHERE id = ${recipeId} AND user_id = ${userId} AND deleted_at IS NULL
    LIMIT 1
  `
  const row = (rows as RecipeRow[])[0]
  if (!row) return null
  return toRecipe(row)
}

export async function getRecipeImageState(
  userId: number,
  recipeId: number,
): Promise<{ mainImageUrl: string | null; hasStoredImage: boolean } | null> {
  const rows = await getSql()`
    SELECT main_image_url, (main_image_data IS NOT NULL) AS has_stored_image
    FROM recipes
    WHERE id = ${recipeId} AND user_id = ${userId} AND deleted_at IS NULL
    LIMIT 1
  `
  const row = (rows as { main_image_url: string | null; has_stored_image: boolean }[])[0]
  if (!row) return null

  return {
    mainImageUrl: row.main_image_url,
    hasStoredImage: Boolean(row.has_stored_image),
  }
}

export async function getRecipeImageBlob(
  userId: number,
  recipeId: number,
): Promise<{ data: Buffer; mime: string } | null> {
  const rows = await getSql()`
    SELECT main_image_data, main_image_mime
    FROM recipes
    WHERE id = ${recipeId} AND user_id = ${userId} AND deleted_at IS NULL
    LIMIT 1
  `
  const row = (rows as { main_image_data: Buffer | null; main_image_mime: string | null }[])[0]
  if (!row?.main_image_data || !row.main_image_mime) return null

  return { data: row.main_image_data, mime: row.main_image_mime }
}

export async function createRecipe(
  userId: number,
  title: string,
  ingredients: string,
  instructions: string,
  mainImageUrl: string | null,
  mainImageData: Buffer | null,
  mainImageMime: string | null,
): Promise<Recipe> {
  const rows = await getSql()`
    INSERT INTO recipes (
      user_id,
      title,
      ingredients,
      instructions,
      main_image_url,
      main_image_data,
      main_image_mime
    )
    VALUES (
      ${userId},
      ${title},
      ${ingredients},
      ${instructions},
      ${mainImageUrl},
      ${mainImageData},
      ${mainImageMime}
    )
    RETURNING
      id,
      title,
      ingredients,
      instructions,
      main_image_url,
      (main_image_data IS NOT NULL) AS has_stored_image
  `
  const row = (rows as RecipeRow[])[0]
  if (!row) throw new Error("Failed to create recipe")
  return toRecipe(row)
}

export async function updateRecipe(
  userId: number,
  recipeId: number,
  data: {
    title: string
    ingredients: string
    instructions: string
  },
  imagePatch: RecipeImagePatch,
): Promise<Recipe | null> {
  if (imagePatch.action === RecipeImagePatchAction.NoChange) {
    const rows = await getSql()`
      UPDATE recipes
      SET
        title = ${data.title},
        ingredients = ${data.ingredients},
        instructions = ${data.instructions},
        updated_at = now()
      WHERE id = ${recipeId} AND user_id = ${userId} AND deleted_at IS NULL
      RETURNING
        id,
        title,
        ingredients,
        instructions,
        main_image_url,
        (main_image_data IS NOT NULL) AS has_stored_image
    `
    const row = (rows as RecipeRow[])[0]
    if (!row) return null

    return toRecipe(row)
  }

  if (imagePatch.action === RecipeImagePatchAction.ClearAll) {
    const rows = await getSql()`
      UPDATE recipes
      SET
        title = ${data.title},
        ingredients = ${data.ingredients},
        instructions = ${data.instructions},
        main_image_url = NULL,
        main_image_data = NULL,
        main_image_mime = NULL,
        updated_at = now()
      WHERE id = ${recipeId} AND user_id = ${userId} AND deleted_at IS NULL
      RETURNING
        id,
        title,
        ingredients,
        instructions,
        main_image_url,
        (main_image_data IS NOT NULL) AS has_stored_image
    `
    const row = (rows as RecipeRow[])[0]
    if (!row) return null

    return toRecipe(row)
  }

  if (imagePatch.action === RecipeImagePatchAction.SetFile) {
    const rows = await getSql()`
      UPDATE recipes
      SET
        title = ${data.title},
        ingredients = ${data.ingredients},
        instructions = ${data.instructions},
        main_image_url = NULL,
        main_image_data = ${imagePatch.buffer},
        main_image_mime = ${imagePatch.mime},
        updated_at = now()
      WHERE id = ${recipeId} AND user_id = ${userId} AND deleted_at IS NULL
      RETURNING
        id,
        title,
        ingredients,
        instructions,
        main_image_url,
        (main_image_data IS NOT NULL) AS has_stored_image
    `
    const row = (rows as RecipeRow[])[0]
    if (!row) return null

    return toRecipe(row)
  }

  if (imagePatch.action === RecipeImagePatchAction.SetExternalUrl) {
    const rows = await getSql()`
      UPDATE recipes
      SET
        title = ${data.title},
        ingredients = ${data.ingredients},
        instructions = ${data.instructions},
        main_image_url = ${imagePatch.url},
        main_image_data = NULL,
        main_image_mime = NULL,
        updated_at = now()
      WHERE id = ${recipeId} AND user_id = ${userId} AND deleted_at IS NULL
      RETURNING
        id,
        title,
        ingredients,
        instructions,
        main_image_url,
        (main_image_data IS NOT NULL) AS has_stored_image
    `
    const row = (rows as RecipeRow[])[0]
    if (!row) return null

    return toRecipe(row)
  }

  if (imagePatch.action === RecipeImagePatchAction.ClearExternalUrlOnly) {
    const rows = await getSql()`
      UPDATE recipes
      SET
        title = ${data.title},
        ingredients = ${data.ingredients},
        instructions = ${data.instructions},
        main_image_url = NULL,
        updated_at = now()
      WHERE id = ${recipeId} AND user_id = ${userId} AND deleted_at IS NULL
      RETURNING
        id,
        title,
        ingredients,
        instructions,
        main_image_url,
        (main_image_data IS NOT NULL) AS has_stored_image
    `
    const row = (rows as RecipeRow[])[0]
    if (!row) return null

    return toRecipe(row)
  }

  throw new Error("Invalid image patch")
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
