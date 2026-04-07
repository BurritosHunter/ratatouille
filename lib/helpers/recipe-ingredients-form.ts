import type { RecipeIngredientPayloadItem } from "@/lib/models/recipe-ingredient"

export function parseRecipeIngredientsPayload(raw: unknown): RecipeIngredientPayloadItem[] | null {
  if (typeof raw !== "string") return null
  const t = raw.trim()
  if (!t) return null
  try {
    const data = JSON.parse(t) as unknown
    if (!Array.isArray(data)) return null
    const out: RecipeIngredientPayloadItem[] = []
    for (const el of data) {
      if (!el || typeof el !== "object") continue
      const o = el as Record<string, unknown>
      const name = typeof o.name === "string" ? o.name.trim() : ""
      if (!name) continue
      const quantityNote = typeof o.quantityNote === "string" ? o.quantityNote : undefined
      const ingredientId = o.ingredientId
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
