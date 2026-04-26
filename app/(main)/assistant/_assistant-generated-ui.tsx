"use client";

import type { ReactNode } from "react";
import { RecipeListRowLink } from "@/components/molecules/recipe-list-row-link";
import { useAssistantGeneratedUI } from "@/contexts/assistant-generated-ui-context";
import type { RecipeToolRow } from "@/lib/ai/recipe-tool-rows";
import type { AssistantBackgroundColorToken, AssistantLayoutOption } from "@/lib/assistant/generated-ui";
import { cn } from "@/lib/helpers/utils";
import { useTranslation } from "react-i18next";

const SQUARE_CLASS_BY_COLOR: Record<AssistantBackgroundColorToken, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
};

function AssistantLayoutRegions({ layout, squareColor, recipeBlock }: { layout: AssistantLayoutOption | undefined; squareColor: AssistantBackgroundColorToken | undefined; recipeBlock: ReactNode }) {
  const resolvedLayout: AssistantLayoutOption = layout ?? "singleColumn";
  const square = squareColor ? (
    <div
      className={cn(
        "size-24 shrink-0 rounded-md border border-border shadow-sm",
        SQUARE_CLASS_BY_COLOR[squareColor]
      )}
    />
  ) : null;

  if (resolvedLayout === "twoColumn") {
    return (
      <div className="grid min-h-[12rem] grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-sm">{square}</div>
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-sm">{recipeBlock}</div>
      </div>
    );
  }

  if (resolvedLayout === "fullWidth") {
    return (
      <div className="min-h-[12rem] rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-sm">
        {square}
        <div className="mt-4">{recipeBlock}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[12rem] flex-col gap-4">
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-sm">{square}</div>
      {recipeBlock}
    </div>
  );
}

/**
 * Renders modular assistant tool output on the /assistant route.
 * Hidden when there is no generatedUI state.
 */
export function AssistantGeneratedUI() {
  const { t: translate } = useTranslation();
  const { generatedUI } = useAssistantGeneratedUI();
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
            <p className="text-xs font-medium text-foreground">
              {translate("assistant.layoutLine", { layout: generatedUI.layout })}
            </p>
          ) : null}
          {generatedUI.backgroundColor ? (
            <p className="text-xs font-medium text-foreground -mt-2">
              {translate("assistant.layoutTestSquare", { color: generatedUI.backgroundColor })}
            </p>
          ) : null}
        </div>
        <AssistantLayoutRegions
          layout={generatedUI.layout}
          squareColor={generatedUI.backgroundColor}
          recipeBlock={recipeBlock}
        />
      </div>
    </section>
  );
}
