import { IngredientsEditor } from "@/components/organisms/ingredients-editor"
import { requireUserId } from "@/lib/auth/auth-user"
import { listIngredients } from "@/lib/data/ingredients"

export const dynamic = "force-dynamic"

export default async function IngredientsPage() {
  const userId = await requireUserId("/ingredients")
  const items = await listIngredients(userId)

  return (
    <div className="flex min-h-svh flex-col py-6">
      <div className="container mx-auto px-6">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-medium">Ingredients</h1>
          </div>

          <IngredientsEditor initial={items} />
        </div>
      </div>
    </div>
  )
}
