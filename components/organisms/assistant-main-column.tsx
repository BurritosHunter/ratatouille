"use client";

import type { ReactNode } from "react";

import { SiteHeader } from "@/components/organisms/site-header";

/**
 * Main column under the app shell: site header and route page. Generative assistant preview lives on
 * `app/(main)/assistant/page.tsx` only.
 */
export function AssistantMainColumn({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="shrink-0">
        <SiteHeader />
      </div>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</main>
    </>
  );
}
