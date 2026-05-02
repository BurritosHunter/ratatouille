import { IngredientsCatalog } from "./_ingredients-catalog"
import { requireUserId } from "@/lib/auth/auth-user"
import { listIngredientCategoryShelfDefaults } from "@/lib/data/ingredient-category-shelf-defaults"
import { getServerT } from "@/lib/i18n/server"
import { listIngredients } from "@/lib/data/ingredients"

export const dynamic = "force-dynamic"

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
