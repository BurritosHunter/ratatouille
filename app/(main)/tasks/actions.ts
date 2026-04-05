"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth-user"
import { createTask, flipTaskCompletion } from "@/lib/data/tasks"

export async function addTask(formData: FormData) {
  const userId = await requireUserId("/tasks")
  const content = formData.get("content")
  if (typeof content !== "string" || !content.trim()) return
  await createTask(userId, content.trim())
  revalidatePath("/tasks")
}

export async function toggleTask(formData: FormData) {
  const userId = await requireUserId("/tasks")
  const idRaw = formData.get("id")
  const id = typeof idRaw === "string" ? Number.parseInt(idRaw, 10) : Number.NaN
  if (!Number.isFinite(id)) return
  await flipTaskCompletion(userId, id)
  revalidatePath("/tasks")
}
