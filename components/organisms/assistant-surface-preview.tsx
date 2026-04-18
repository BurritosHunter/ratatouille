"use client";

import type { ReactNode } from "react";

import { RecipeListRowLink } from "@/components/molecules/recipe-list-row-link";
import { useAssistantSurface } from "@/contexts/assistant-surface-context";
import type { RecipeToolRow } from "@/lib/ai/recipe-tool-rows";
import type {
  AssistantBackgroundColorToken,
  AssistantLayoutOption,
} from "@/lib/assistant/surface";
import { cn } from "@/lib/helpers/utils";

function colorSquareFillClass(color: AssistantBackgroundColorToken): string {
  switch (color) {
    case "red":
      return "bg-red-500";
    case "blue":
      return "bg-blue-500";
    case "green":
      return "bg-green-600";
    default:
      return "bg-muted";
  }
}

function LayoutColorSquare({ color }: { color: AssistantBackgroundColorToken }) {
  return (
      <div
        className={cn(
          "size-24 shrink-0 rounded-md border border-border shadow-sm",
          colorSquareFillClass(color),
        )}
        aria-label={`Layout test square: ${color}`}
      />
  );
}

function AssistantLayoutRegions({ layout, squareColor, recipeBlock }: {
  layout: AssistantLayoutOption | undefined;
  squareColor: AssistantBackgroundColorToken | undefined;
  recipeBlock: ReactNode;
}) {
  const resolvedLayout: AssistantLayoutOption = layout ?? "singleColumn";
  const square = squareColor ? <LayoutColorSquare color={squareColor} /> : null;
  if (resolvedLayout === "twoColumn") {
    return (
      <div className="grid min-h-[12rem] grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-sm">
          {square}
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-sm">
          {recipeBlock}
        </div>
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
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-sm">
        {square}
      </div>
      {recipeBlock}
    </div>
  );
}

/**
 * Renders modular assistant tool output (layout + color square + recipes) in the main shell layout.
 * Hidden when there is no surface state.
 */
export function AssistantSurfacePreviewPanel() {
  const { surface } = useAssistantSurface();
  if (!surface) { return null; }

  const recipeRows: RecipeToolRow[] = surface.recipes ?? [];
  const recipeBlock =
    recipeRows.length === 0 ? (
      <p className="text-sm text-muted-foreground">No recipes in surface state yet.</p>
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
      aria-label="Assistant tool output"
    >
      <div className="mx-auto flex w-full max-w-header flex-col gap-3 px-4 py-3">
        <div className="flex flex-col gap-2 border-b border-border/60 pb-3">
          <h2 className="font-heading font-semibold text-foreground">Assistant tools</h2>
          <p className="text-xs text-muted-foreground -mt-2">Updated {new Date(surface.generatedAtIso).toLocaleString()} (last call: {surface.lastCallId})</p>
          {surface.layout ? <p className="text-xs font-medium text-foreground">Layout: {surface.layout}</p> : null}
          {surface.backgroundColor ? <p className="text-xs font-medium text-foreground -mt-2">Layout test square: {surface.backgroundColor}</p> : null}
        </div>
        <AssistantLayoutRegions
          layout={surface.layout}
          squareColor={surface.backgroundColor}
          recipeBlock={recipeBlock}
        />
      </div>
    </section>
  );
}
