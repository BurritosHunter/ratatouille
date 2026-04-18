import type { ReactNode } from "react"

import { AssistantChatShell } from "@/components/organisms/assistant-chat-shell"
import { AssistantMainColumn } from "@/components/organisms/assistant-main-column"

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AssistantChatShell>
      <AssistantMainColumn>{children}</AssistantMainColumn>
    </AssistantChatShell>
  )
}
