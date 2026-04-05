"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireUserId } from "@/lib/auth/auth-user"
import {
  createRecipe,
  getRecipeImageState,
  restoreRecipe as restoreRecipeRow,
  softDeleteRecipe,
  updateRecipe as updateRecipeRow,
} from "@/lib/data/recipes"
import { RecipeImagePatchAction } from "@/lib/constants"
import type { RecipeImagePatch } from "@/lib/models/recipe"
import { parseImageUpload } from "@/lib/helpers/image/image-file"

function parseMainImageUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null

  const t = raw.trim()
  if (!t) return null

  try {
    const u = new URL(t)
    if (u.protocol !== "https:" && u.protocol !== "http:") return null
    return t
    
  } catch {
    return null
  }
}

export async function addRecipe(formData: FormData) {
  const userId = await requireUserId("/recipes/new")
  const title = formData.get("title")
  const ingredients = formData.get("ingredients")
  const instructions = formData.get("instructions")
  const file = await parseImageUpload(formData.get("main_image"))
  const url = parseMainImageUrl(formData.get("main_image_url"))
  if (typeof title !== "string" || !title.trim()) return
  if (typeof ingredients !== "string" || !ingredients.trim()) return
  if (typeof instructions !== "string" || !instructions.trim()) return

  let mainImageUrl: string | null = null
  let mainImageData: Buffer | null = null
  let mainImageMime: string | null = null
  if (file) {
    mainImageData = file.buffer
    mainImageMime = file.mime
  } else {
    mainImageUrl = url
  }

  const recipe = await createRecipe(
    userId,
    title.trim(),
    ingredients.trim(),
    instructions.trim(),
    mainImageUrl,
    mainImageData,
    mainImageMime,
  )
  revalidatePath("/recipes")
  redirect(`/recipes/${recipe.id}`)
}

function resolveUpdateImagePatch(
  formData: FormData,
  file: Awaited<ReturnType<typeof parseImageUpload>>,
  urlParsed: string | null,
  meta: { mainImageUrl: string | null; hasStoredImage: boolean },
): RecipeImagePatch {
  if (formData.get("remove_main_image") === "1") 
    return { action: RecipeImagePatchAction.ClearAll }
  if (file) 
    return { action: RecipeImagePatchAction.SetFile, buffer: file.buffer, mime: file.mime }
  if (urlParsed !== null) 
    return { action: RecipeImagePatchAction.SetExternalUrl, url: urlParsed }
  if (meta.mainImageUrl) 
    return { action: RecipeImagePatchAction.ClearExternalUrlOnly }

  return { action: RecipeImagePatchAction.NoChange }
}

export async function updateRecipe(formData: FormData) {
  const idRaw = formData.get("id")
  const id = typeof idRaw === "string" ? Number.parseInt(idRaw, 10) : Number.NaN
  if (!Number.isFinite(id)) return

  const userId = await requireUserId(`/recipes/${id}/edit`)
  const title = formData.get("title")
  const ingredients = formData.get("ingredients")
  const instructions = formData.get("instructions")
  if (typeof title !== "string" || !title.trim()) return
  if (typeof ingredients !== "string" || !ingredients.trim()) return
  if (typeof instructions !== "string" || !instructions.trim()) return

  const meta = await getRecipeImageState(userId, id)
  if (!meta) return

  const file = await parseImageUpload(formData.get("main_image"))
  const urlParsed = parseMainImageUrl(formData.get("main_image_url"))
  const imagePatch = resolveUpdateImagePatch(formData, file, urlParsed, meta)

  const recipe = await updateRecipeRow(
    userId,
    id,
    {
      title: title.trim(),
      ingredients: ingredients.trim(),
      instructions: instructions.trim(),
    },
    imagePatch,
  )
  if (!recipe) return

  revalidatePath("/recipes")
  revalidatePath(`/recipes/${id}`)
  redirect(`/recipes/${id}`)
}

export async function deleteRecipe(formData: FormData) {
  const idRaw = formData.get("id")
  const id = typeof idRaw === "string" ? Number.parseInt(idRaw, 10) : Number.NaN
  if (!Number.isFinite(id)) return

  const userId = await requireUserId(`/recipes/${id}`)
  await softDeleteRecipe(userId, id)
  revalidatePath("/recipes")
  revalidatePath(`/recipes/${id}`)
  redirect(`/recipes?deleted=${id}`)
}

export async function restoreDeletedRecipe(recipeId: number) {
  if (!Number.isFinite(recipeId)) return
  const userId = await requireUserId("/recipes")
  await restoreRecipeRow(userId, recipeId)
  revalidatePath("/recipes")
  revalidatePath(`/recipes/${recipeId}`)
}
