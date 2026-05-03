"use client";

import type { ReactNode } from "react";
import { RecipeListRowLink } from "@/components/molecules/recipe-list-row-link";
import { useGeneratedUI } from "@/contexts/assistant-generated-ui-context";
import type { RecipeToolRow } from "@/lib/ai/assistant-tools/recipe-rows";
import type { LayoutOption } from "@/lib/generated-ui";
import { useTranslation } from "react-i18next";

function LayoutRegions({ layout, recipeBlock }: { layout: LayoutOption | undefined; recipeBlock: ReactNode }) {
  const resolvedLayout: LayoutOption = layout ?? "singleColumn";
  const regionCardClass =
    "rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-sm";

  if (resolvedLayout === "twoColumn") {
    return (
      <div className="grid min-h-[12rem] grid-cols-1 gap-4 md:grid-cols-2">
        <div aria-hidden className={`min-h-[8rem] ${regionCardClass}`} />
        <div className={`flex flex-col gap-3 ${regionCardClass}`}>{recipeBlock}</div>
      </div>
    );
  }

  if (resolvedLayout === "fullWidth") {
    return <div className={`min-h-[12rem] ${regionCardClass}`}>{recipeBlock}</div>;
  }

  return (
    <div className="flex min-h-[12rem] flex-col gap-4">
      <div className={regionCardClass}>{recipeBlock}</div>
    </div>
  );
}

/**
 * Renders the generated-UI tool preview on the /assistant route.
 * Hidden when there is no `generatedUI` state.
 */
export function GeneratedUISurface() {
  const { t: translate } = useTranslation();
  const { generatedUI } = useGeneratedUI();
  if (!generatedUI) return null;

  const recipeRows: RecipeToolRow[] = generatedUI.recipes ?? [];
  const recipeBlock =
    recipeRows.length === 0 ? (
      <p className="text-sm text-muted-foreground">{translate("assistant.noRecipesInSurface")}</p>
    ) : (
      <ul className="flex flex-col gap-2">
        {recipeRows.map((recipe) => (
          <li key={recipe.recipeId}>
            <RecipeListRowLink recipeId={recipe.recipeId} title={recipe.title} thumbSrc={recipe.thumbSrc} />
          </li>
        ))}
      </ul>
    );

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden border-b border-border bg-muted/30"
      aria-label={translate("assistant.surfaceAria")}
    >
      <div className="mx-auto flex w-full max-w-header flex-col gap-3 px-4 py-3">
        <div className="flex flex-col gap-2 border-b border-border/60 pb-3">
          <h2 className="font-heading font-semibold text-foreground">{translate("assistant.surfaceHeading")}</h2>
          <p className="text-xs text-muted-foreground -mt-2">
            {translate("assistant.surfaceMeta", {
              date: new Date(generatedUI.generatedAtIso).toLocaleString(),
              lastCallId: generatedUI.lastCallId,
            })}
          </p>
          {generatedUI.layout ? (
            <p className="text-xs font-medium text-foreground">{translate("assistant.layoutLine", { layout: generatedUI.layout })}</p>
          ) : null}
        </div>
        <LayoutRegions layout={generatedUI.layout} recipeBlock={recipeBlock} />
      </div>
    </section>
  );
}
