import type { ReactNode } from "react"

import { AssistantChatShell } from "@/components/organisms/assistant-chat-shell"
import { SiteHeader } from "@/components/organisms/site-header";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AssistantChatShell>
      <div className="shrink-0"><SiteHeader /></div>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</main>
    </AssistantChatShell>
  )
}
