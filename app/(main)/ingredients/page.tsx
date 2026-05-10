import { IngredientsCatalog } from "@/components/ingredients/ingredients-catalog";
import { requireUserId } from "@/lib/auth/auth-user"
import { listIngredientCategoryShelfDefaults } from "@/lib/data/ingredient-category-shelf-defaults"
import { getServerT } from "@/lib/i18n/server"
import { listIngredients } from "@/lib/data/ingredients"
import { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Ingredients",
  description: "Ingredients is a list of your ingredients.",
}

export default async function IngredientsPage() {
  const t = getServerT()
  const userId = await requireUserId("/ingredients")
  const [items, categoryShelfDefaults] = await Promise.all([
    listIngredients(userId),
    listIngredientCategoryShelfDefaults(),
  ])

  return (
    <div className="max-w-header">
      <IngredientsCatalog
        title={t("ingredients.title")}
        initial={items}
        categoryShelfDefaults={categoryShelfDefaults}
      />
    </div>
  )
}
