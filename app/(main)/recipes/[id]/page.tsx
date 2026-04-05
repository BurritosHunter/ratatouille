import Link from "next/link"
import { notFound } from "next/navigation"

import { deleteRecipe } from "../actions"
import { Button } from "@/components/ui/button"
import { requireUserId } from "@/lib/auth-user"
import { getRecipeById } from "@/lib/data/recipes"

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

  return (
    <div className="flex min-h-svh flex-col gap-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/recipes">All recipes</Link>
        </Button>
        <form action={deleteRecipe} className="flex items-center">
          <input type="hidden" name="id" value={recipe.id} />
          <Button type="submit" variant="destructive" size="sm">
            Delete recipe
          </Button>
        </form>
      </div>

      <article className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{recipe.title}</h1>
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
