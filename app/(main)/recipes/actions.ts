"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireUserId } from "@/lib/auth-user"
import {
  createRecipe,
  restoreRecipe as restoreRecipeRow,
  softDeleteRecipe,
} from "@/lib/data/recipes"

export async function addRecipe(formData: FormData) {
  const userId = await requireUserId("/recipes/new")
  const title = formData.get("title")
  const ingredients = formData.get("ingredients")
  const instructions = formData.get("instructions")
  if (typeof title !== "string" || !title.trim()) return
  if (typeof ingredients !== "string" || !ingredients.trim()) return
  if (typeof instructions !== "string" || !instructions.trim()) return

  const recipe = await createRecipe(userId, title.trim(), ingredients.trim(), instructions.trim())
  revalidatePath("/recipes")
  redirect(`/recipes/${recipe.id}`)
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
