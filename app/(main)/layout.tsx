import type { ReactNode } from "react"

import { AssistantChatShell } from "@/components/organisms/assistant-chat-shell"
import { SiteHeader } from "@/components/organisms/site-header"

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <AssistantChatShell />
    </>
  )
}
