import Link from "next/link"

import { restoreDeletedRecipe } from "./actions"
import { UndoDeleteToast } from "@/components/molecules/toast-undo-delete"
import { Button } from "@/components/ui/button"
import { requireUserId } from "@/lib/auth-user"
import { listRecipes } from "@/lib/data/recipes"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ deleted?: string }>
}

export default async function RecipesPage({ searchParams }: PageProps) {
  const userId = await requireUserId("/recipes")
  const recipes = await listRecipes(userId)

  const sp = await searchParams
  const deletedRaw = sp.deleted
  const deletedParsed = typeof deletedRaw === "string" ? Number.parseInt(deletedRaw, 10) : Number.NaN
  const deletedRecipeId = Number.isFinite(deletedParsed) ? deletedParsed : undefined

  return (
    <div className="flex min-h-svh flex-col gap-6 p-6">
      <UndoDeleteToast
        deletedId={deletedRecipeId}
        replacePath="/recipes"
        scope="recipe"
        message="Recipe deleted"
        restoredMessage="Recipe restored"
        onUndo={restoreDeletedRecipe}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-medium">Recipes</h1>
        <Button asChild size="sm">
          <Link href="/recipes/new">Create recipe</Link>
        </Button>
      </div>

      {recipes.length === 0 ? (
        <div className="flex flex-col gap-2 items-center">
          <p className="text-sm text-muted-foreground">No recipes yet</p>
          <Button asChild size="sm">
            <Link href="/recipes/new">Create recipe</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex max-w-md flex-col gap-2">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                {recipe.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
