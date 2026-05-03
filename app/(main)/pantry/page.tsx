import { PantryList } from "@/components/features/pantry-list";
import { requireUserId } from "@/lib/auth/auth-user";
import { getServerT } from "@/lib/i18n/server";
import { listPantryInventory } from "@/lib/data/pantry-inventory";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  const t = getServerT();
  const userId = await requireUserId("/pantry");
  const initialRows = await listPantryInventory(userId, "all");

  return (
    <div className="max-w-header">
      <div className="mx-auto mb-30 flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-large">{t("pantry.title")}</h1>
        </div>
        <PantryList initialRows={initialRows} />
      </div>
    </div>
  );
}
