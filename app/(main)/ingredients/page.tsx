import { IngredientsEditor } from "./_list-editor"
import { requireUserId } from "@/lib/auth/auth-user"
import { listIngredients } from "@/lib/data/ingredients"

export const dynamic = "force-dynamic"

export default async function IngredientsPage() {
  const userId = await requireUserId("/ingredients")
  const items = await listIngredients(userId)

  return (
    <div className="max-w-header">
      <div className="flex flex-col gap-6 w-full max-w-lg mx-auto">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <h1 className="font-large">Ingredients</h1>
        </div>
        <IngredientsEditor initial={items} />
      </div>
    </div>
  )
}
