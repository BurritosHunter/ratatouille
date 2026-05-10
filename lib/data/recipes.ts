import { Prisma } from "@/prisma/client"

import { RecipeImagePatchAction } from "@/lib/constants"
import { prisma } from "@/prisma/client"
import type { Recipe, RecipeImagePatch, RecipeSummary } from "@/types/recipe"

import { bigIntId, numberFromBigInt } from "@/prisma/mappers"

type RecipeSummaryRowRaw = {
  id: bigint
  title: string
  main_image_url: string | null
  has_stored_image: boolean
}

type RecipeImageUrlRowRaw = {
  main_image_url: string | null
  has_stored_image: boolean
}

function fromRecipeColumns(
  row: {
    id: bigint
    title: string
    ingredients: string
    instructions: string
    main_image_url: string | null
    main_image_data: Uint8Array | null | undefined
  },
): Recipe {
  return {
    id: numberFromBigInt(row.id),
    title: row.title,
    ingredients: row.ingredients,
    instructions: row.instructions,
    mainImageUrl: row.main_image_url,
    hasStoredImage: row.main_image_data != null && row.main_image_data.length > 0,
  }
}

/** Aligned with the Postgres `recipes` table / `Recipe` model in `prisma/schema.prisma`. */
export async function listRecipes(userId: number): Promise<RecipeSummary[]> {
  const rows = await prisma.$queryRaw<RecipeSummaryRowRaw[]>(
    Prisma.sql`
      SELECT
        id,
        title,
        main_image_url,
        (main_image_data IS NOT NULL) AS has_stored_image
      FROM recipes
      WHERE user_id = ${userId} AND deleted_at IS NULL
      ORDER BY lower(title) ASC
    `,
  )
  return rows.map((row) => ({
    id: numberFromBigInt(row.id),
    title: row.title,
    mainImageUrl: row.main_image_url,
    hasStoredImage: Boolean(row.has_stored_image),
  }))
}

export async function getRecipeById(userId: number, recipeId: number): Promise<Recipe | null> {
  const row = await prisma.recipe.findFirst({
    select: {
      id: true,
      title: true,
      ingredients: true,
      instructions: true,
      main_image_url: true,
      main_image_data: true,
    },
    where: { id: bigIntId(recipeId), user_id: userId, deleted_at: null },
  })
  if (!row) return null
  return fromRecipeColumns(row)
}

export async function getRecipeImageState(
  userId: number,
  recipeId: number,
): Promise<{ mainImageUrl: string | null; hasStoredImage: boolean } | null> {
  const rows = await prisma.$queryRaw<RecipeImageUrlRowRaw[]>(
    Prisma.sql`
      SELECT
        main_image_url,
        (main_image_data IS NOT NULL) AS has_stored_image
      FROM recipes
      WHERE id = ${bigIntId(recipeId)} AND user_id = ${userId} AND deleted_at IS NULL
      LIMIT 1
    `,
  )
  const row = rows[0]
  if (!row) return null
  return { mainImageUrl: row.main_image_url, hasStoredImage: Boolean(row.has_stored_image) }
}

export async function getRecipeImageBlob(
  userId: number,
  recipeId: number,
): Promise<{ data: Buffer; mime: string } | null> {
  const row = await prisma.recipe.findFirst({
    select: { main_image_data: true, main_image_mime: true },
    where: { id: bigIntId(recipeId), user_id: userId, deleted_at: null },
  })
  const data = row?.main_image_data
  const mime = row?.main_image_mime
  if (!data?.length || !mime) return null
  return { data: Buffer.from(data), mime }
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
  const row = await prisma.recipe.create({
    select: {
      id: true,
      title: true,
      ingredients: true,
      instructions: true,
      main_image_url: true,
      main_image_data: true,
    },
    data: {
      user_id: userId,
      title,
      ingredients,
      instructions,
      main_image_url: mainImageUrl,
      main_image_data: mainImageData == null ? null : new Uint8Array(mainImageData),
      main_image_mime: mainImageMime,
    },
  })
  return fromRecipeColumns(row)
}

async function findOwnedRecipeId(userId: number, recipeId: number): Promise<bigint | null> {
  const row = await prisma.recipe.findFirst({
    select: { id: true },
    where: { id: bigIntId(recipeId), user_id: userId, deleted_at: null },
  })
  return row?.id ?? null
}

async function updateRecipeOwned(
  ownedId: bigint,
  patch: Prisma.RecipeUncheckedUpdateInput,
): Promise<Recipe | null> {
  const row = await prisma.recipe.update({
    select: {
      id: true,
      title: true,
      ingredients: true,
      instructions: true,
      main_image_url: true,
      main_image_data: true,
    },
    where: { id: ownedId },
    data: patch,
  })
  return fromRecipeColumns(row)
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
  const ownedId = await findOwnedRecipeId(userId, recipeId)
  if (ownedId == null) return null

  const baseData: Prisma.RecipeUncheckedUpdateInput = {
    title: data.title,
    ingredients: data.ingredients,
    instructions: data.instructions,
    updated_at: new Date(),
  }

  if (imagePatch.action === RecipeImagePatchAction.NoChange) {
    return updateRecipeOwned(ownedId, baseData)
  }
  if (imagePatch.action === RecipeImagePatchAction.ClearAll) {
    return updateRecipeOwned(ownedId, {
      ...baseData,
      main_image_url: null,
      main_image_data: null,
      main_image_mime: null,
    })
  }
  if (imagePatch.action === RecipeImagePatchAction.SetFile) {
    return updateRecipeOwned(ownedId, {
      ...baseData,
      main_image_url: null,
      main_image_data: new Uint8Array(imagePatch.buffer),
      main_image_mime: imagePatch.mime,
    })
  }
  if (imagePatch.action === RecipeImagePatchAction.SetExternalUrl) {
    return updateRecipeOwned(ownedId, {
      ...baseData,
      main_image_url: imagePatch.url,
      main_image_data: null,
      main_image_mime: null,
    })
  }
  if (imagePatch.action === RecipeImagePatchAction.ClearExternalUrlOnly) {
    return updateRecipeOwned(ownedId, {
      ...baseData,
      main_image_url: null,
    })
  }

  throw new Error("Invalid image patch")
}

export async function softDeleteRecipe(userId: number, recipeId: number): Promise<void> {
  const ownedId = await findOwnedRecipeId(userId, recipeId)
  if (ownedId == null) return
  await prisma.recipe.update({
    where: { id: ownedId },
    data: { deleted_at: new Date(), updated_at: new Date() },
  })
}

export async function restoreRecipe(userId: number, recipeId: number): Promise<void> {
  await prisma.recipe.updateMany({
    where: { id: bigIntId(recipeId), user_id: userId, deleted_at: { not: null } },
    data: { deleted_at: null, updated_at: new Date() },
  })
}
