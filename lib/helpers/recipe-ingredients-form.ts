import type { RecipeIngredientPayloadItem } from "@/lib/models/recipe-ingredient"

export function parseRecipeIngredientsPayload(raw: unknown): RecipeIngredientPayloadItem[] | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const data = JSON.parse(trimmed) as unknown
    if (!Array.isArray(data)) return null
    const out: RecipeIngredientPayloadItem[] = []
    for (const element of data) {
      if (!element || typeof element !== "object") continue
      const record = element as Record<string, unknown>
      const name = typeof record.name === "string" ? record.name.trim() : ""
      if (!name) continue
      const quantityNote = typeof record.quantityNote === "string" ? record.quantityNote : undefined
      const ingredientId = record.ingredientId
      out.push({
        name,
        quantityNote,
        ingredientId:
          typeof ingredientId === "number" || typeof ingredientId === "string" ? ingredientId : undefined,
      })
    }
    return out
  } catch {
    return null
  }
}
