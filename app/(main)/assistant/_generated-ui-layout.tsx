"use client";

import { LayoutRegions } from "@/components/features/layout-regions";
import { PantryList } from "@/components/features/pantry-list";
import { RecipeList } from "@/components/features/recipe-list";
import { useGeneratedUI } from "@/contexts/assistant-generated-ui-context";
import type { RecipeToolRow } from "@/lib/assistant-tools/recipe-rows";
import { useTranslation } from "react-i18next";

export function GeneratedUILayout() {
  const { t } = useTranslation();
  const { generatedUI } = useGeneratedUI();
  if (!generatedUI) return null;

  const pantryRowsMerged = generatedUI.pantryRows;
  const hasPantryList = pantryRowsMerged !== undefined;
  const recipeRows: RecipeToolRow[] = generatedUI.recipes ?? [];

  const recipePreview = recipeRows.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("assistant.noRecipesInSurface")}</p>
    ) : (
      <RecipeList recipes={recipeRows} />
    );

  const recipeSectionHeadingBlock =
    recipeRows.length > 0 || generatedUI.recipes !== undefined ? (
      <div className="flex min-h-0 flex-col gap-2">
        <h3 className="font-heading font-semibold text-foreground">{t("assistant.recipesSectionHeading")}</h3>
        {recipePreview}
      </div>
    ) : null;

  const surfaceRegions = [
    hasPantryList ? <PantryList key={generatedUI.lastCallId} initialRows={pantryRowsMerged} /> : null,
    hasPantryList ? recipeSectionHeadingBlock : recipePreview,
  ] as const;

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden border-b border-border bg-muted/30"
      aria-label={t("assistant.surfaceAria")}
    >
      <div className="mx-auto flex w-full max-w-header flex-col gap-3 px-4 py-3">
        <div className="flex flex-col gap-2 border-b border-border/60 pb-3">
          <h2 className="font-heading font-semibold text-foreground">{t("assistant.surfaceHeading")}</h2>
          <p className="text-xs text-muted-foreground -mt-2">
            {t("assistant.surfaceMeta", {
              date: new Date(generatedUI.generatedAtIso).toLocaleString(),
              lastCallId: generatedUI.lastCallId,
            })}
          </p>
          {generatedUI.layout ? (
            <p className="text-xs font-medium text-foreground">{t("assistant.layoutLine", { layout: generatedUI.layout })}</p>
          ) : null}
        </div>
        <LayoutRegions layout={generatedUI.layout} regions={surfaceRegions} />
      </div>
    </section>
  );
}
