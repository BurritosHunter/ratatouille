import Link from "next/link"

import { restoreDeletedRecipe } from "./actions"
import { RecipeList } from "@/components/features/recipe-list"
import { UndoDeleteToast } from "@/components/molecules/toast-undo-delete"
import { Button } from "@/components/ui/button"
import { requireUserId } from "@/lib/auth/auth-user"
import { listRecipes } from "@/lib/data/recipes"
import { recipeSummariesToListLinkItems } from "@/lib/helpers/recipe-list-link-items"
import { getServerT } from "@/lib/i18n/server"

export const dynamic = "force-dynamic"

type PageProps = { searchParams: Promise<{ deleted?: string }> };

export default async function RecipesPage({ searchParams }: PageProps) {
  const t = getServerT()
  const userId = await requireUserId("/recipes")
  const recipes = await listRecipes(userId)

  const sp = await searchParams
  const deletedRaw = sp.deleted
  const deletedParsed = typeof deletedRaw === "string" ? Number.parseInt(deletedRaw, 10) : Number.NaN
  const deletedRecipeId = Number.isFinite(deletedParsed) ? deletedParsed : undefined

  return (
    <div className="max-w-header">
      <UndoDeleteToast
        deletedId={deletedRecipeId}
        replacePath="/recipes"
        scope="recipe"
        message={t("recipes.deletedToast")}
        restoredMessage={t("recipes.restoredToast")}
        onUndo={restoreDeletedRecipe}
      />
      <div className="flex flex-col gap-6 mb-30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-medium">{t("recipes.title")}</h1>
          <Button asChild size="sm">
            <Link href="/recipes/new">{t("recipes.createRecipe")}</Link>
          </Button>
        </div>

        {recipes.length === 0 ? (
          <div className="flex flex-col gap-2 items-center">
            <p className="text-sm text-muted-foreground">{t("recipes.empty")}</p>
            <Button asChild size="sm">
              <Link href="/recipes/new">{t("recipes.createRecipe")}</Link>
            </Button>
          </div>
        ) : (
          <RecipeList recipes={recipeSummariesToListLinkItems(recipes)} />
        )}
      </div>
    </div>
  )
}
