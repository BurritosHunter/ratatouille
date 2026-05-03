"use client";

import type { ReactNode } from "react";

import { PantryList } from "@/components/features/pantry-list";
import { RecipeList } from "@/components/features/recipe-list";
import { useGeneratedUI } from "@/contexts/assistant-generated-ui-context";
import type { RecipeToolRow } from "@/lib/ai/assistant-tools/recipe-rows";
import type { LayoutOption } from "@/lib/generated-ui";
import { useTranslation } from "react-i18next";

function LayoutRegions({ layout, preview }: { layout: LayoutOption | undefined; preview: ReactNode }) {
  const resolvedLayout: LayoutOption = layout ?? "singleColumn";
  const regionCardClass =
    "rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-sm";

  if (resolvedLayout === "twoColumn") {
    return (
      <div className="grid min-h-[12rem] grid-cols-1 gap-4 md:grid-cols-2">
        <div aria-hidden className={`min-h-[8rem] ${regionCardClass}`} />
        <div className={`flex min-h-0 min-w-0 flex-col gap-3 overflow-auto ${regionCardClass}`}>{preview}</div>
      </div>
    );
  }

  if (resolvedLayout === "fullWidth") {
    return <div className={`flex min-h-[12rem] min-w-0 flex-col overflow-auto ${regionCardClass}`}>{preview}</div>;
  }

  return (
    <div className="flex min-h-[12rem] flex-col gap-4">
      <div className={`flex min-h-0 min-w-0 flex-col overflow-auto ${regionCardClass}`}>{preview}</div>
    </div>
  );
}

/**
 * Assistant tool preview: meta header + layout regions + pantry / recipes content.
 */
export function GeneratedUILayout() {
  const { t } = useTranslation();
  const { generatedUI } = useGeneratedUI();
  if (!generatedUI) return null;

  const pantryRowsMerged = generatedUI.pantryRows;
  const hasPantryList = pantryRowsMerged !== undefined;
  const recipeRows: RecipeToolRow[] = generatedUI.recipes ?? [];

  const recipePreview =
    recipeRows.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("assistant.noRecipesInSurface")}</p>
    ) : (
      <RecipeList recipes={recipeRows} />
    );

  const preview = !hasPantryList ? (
    recipePreview
  ) : (
    <div className="flex min-h-0 flex-col gap-6">
      <PantryList key={generatedUI.lastCallId} initialRows={pantryRowsMerged} />
      {recipeRows.length > 0 || generatedUI.recipes !== undefined ? (
        <div className="flex min-h-0 flex-col gap-2">
          <h3 className="font-heading font-semibold text-foreground">{t("assistant.recipesSectionHeading")}</h3>
          {recipePreview}
        </div>
      ) : null}
    </div>
  );

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
        <LayoutRegions layout={generatedUI.layout} preview={preview} />
      </div>
    </section>
  );
}
