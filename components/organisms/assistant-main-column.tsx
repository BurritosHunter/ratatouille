"use client";

import type { ReactNode } from "react";

import { AssistantSurfacePreviewPanel } from "@/components/organisms/assistant-surface-preview";
import { SiteHeader } from "@/components/organisms/site-header";
import { useAssistantSurface } from "@/contexts/assistant-surface-context";
import { cn } from "@/lib/helpers/utils";

/**
 * Main column under the app shell: site header, optional full-height assistant surface, then the route page.
 * When generative UI is active, the surface fills the viewport below the header and the page body is hidden.
 */
export function AssistantMainColumn({ children }: { children: ReactNode }) {
  const { surface } = useAssistantSurface();

  return (
    <>
      <div className="shrink-0">
        <SiteHeader />
      </div>
      <AssistantSurfacePreviewPanel />
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden",
          surface && "hidden"
        )}
        aria-hidden={surface ? true : undefined}
      >
        {children}
      </main>
    </>
  );
}
