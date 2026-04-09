import Link from "next/link"
import { notFound } from "next/navigation"

import { deleteRecipe } from "../actions"
import { Button } from "@/components/ui/button"
import { requireUserId } from "@/lib/auth/auth-user"
import { getRecipeById } from "@/lib/data/recipes"
import { imageSrcFromStoredOrExternal } from "@/lib/helpers/image/stored-or-external-src"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id: idParam } = await params
  const recipeId = Number.parseInt(idParam, 10)
  if (!Number.isFinite(recipeId)) notFound()

  const callbackPath = `/recipes/${recipeId}`
  const userId = await requireUserId(callbackPath)
  const recipe = await getRecipeById(userId, recipeId)
  if (!recipe) notFound()
  const imageSrc = imageSrcFromStoredOrExternal({
    hasStored: recipe.hasStoredImage,
    storedSrc: `/api/recipes/${recipe.id}/image`,
    externalUrl: recipe.mainImageUrl,
  })

  return (
    <div className="flex min-h-svh flex-col gap-8 p-6 max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/recipes">All recipes</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/recipes/${recipe.id}/edit`}>Edit</Link>
          </Button>
          <form action={deleteRecipe} className="flex items-center">
            <input type="hidden" name="id" value={recipe.id} />
            <Button type="submit" variant="destructive" size="sm">
              Delete recipe
            </Button>
          </form>
        </div>
      </div>

      <article className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{recipe.title}</h1>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              className="aspect-video w-full max-h-[min(24rem,50vh)] rounded-lg border object-cover"
            />
          ) : null}
        </header>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Ingredients</h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{recipe.ingredients}</div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Instructions</h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{recipe.instructions}</div>
        </section>
      </article>
    </div>
  )
}
