import Link from "next/link"
import { notFound } from "next/navigation"

import { EditRecipeForm } from "./_edit-recipe-form"
import type { MealIngredientEditorLine } from "@/components/organisms/meal-ingredients-editor"
import { Button } from "@/components/ui/button"
import { requireUserId } from "@/lib/auth/auth-user"
import { listIngredients } from "@/lib/data/ingredients"
import { legacyPayloadFromIngredientsText, listRecipeIngredientLines } from "@/lib/data/recipe-ingredients"
import { getRecipeById } from "@/lib/data/recipes"
import { imageSrcFromStoredOrExternal } from "@/lib/helpers/image/stored-or-external-src"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditRecipePage({ params }: PageProps) {
  const { id: idParam } = await params
  const recipeId = Number.parseInt(idParam, 10)
  if (!Number.isFinite(recipeId)) notFound()

  const callbackPath = `/recipes/${recipeId}/edit`
  const userId = await requireUserId(callbackPath)
  const recipe = await getRecipeById(userId, recipeId)
  if (!recipe) notFound()

  const catalog = await listIngredients(userId)
  const junctionLines = await listRecipeIngredientLines(userId, recipeId)
  const initialLines: MealIngredientEditorLine[] =
    junctionLines.length > 0
      ? junctionLines.map((line) => ({
          ingredientId: line.ingredientId,
          name: line.name,
          quantityNote: line.quantityNote ?? "",
        }))
      : legacyPayloadFromIngredientsText(recipe.ingredients).map((payloadItem) => ({
          ingredientId: typeof payloadItem.ingredientId === "number" ? payloadItem.ingredientId : undefined,
          name: payloadItem.name,
          quantityNote: typeof payloadItem.quantityNote === "string" ? payloadItem.quantityNote : "",
        }))

  const previewSrc = imageSrcFromStoredOrExternal({
    hasStored: recipe.hasStoredImage,
    storedSrc: `/api/recipes/${recipe.id}/image`,
    externalUrl: recipe.mainImageUrl,
  })

  return (
    <div className="max-w-header gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-medium">Edit recipe</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/recipes/${recipe.id}`}>View recipe</Link>
        </Button>
      </div>
      <EditRecipeForm
        recipeId={recipe.id}
        initialTitle={recipe.title}
        initialInstructions={recipe.instructions}
        previewSrc={previewSrc}
        defaultImageUrl={recipe.mainImageUrl ?? ""}
        catalog={catalog}
        initialLines={initialLines}
      />
    </div>
  )
}
