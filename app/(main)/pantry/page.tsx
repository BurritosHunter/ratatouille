import { PantryBoard } from "./_pantry-board"
import { requireUserId } from "@/lib/auth/auth-user"
import { getServerT } from "@/lib/i18n/server"
import { listPantryInventory } from "@/lib/data/pantry-inventory"

export const dynamic = "force-dynamic"

export default async function PantryPage() {
  const t = getServerT()
  const userId = await requireUserId("/pantry")
  const initialRows = await listPantryInventory(userId, "all")

  return (
    <div className="max-w-header">
      <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto mb-30">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <h1 className="font-large">{t("pantry.title")}</h1>
        </div>
        <PantryBoard initialRows={initialRows} />
      </div>
    </div>
  )
}
