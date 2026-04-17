import type { ReactNode } from "react"

import { ThemeToggle } from "@/components/theme-toggle"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full min-h-0 overflow-y-auto">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      {children}
    </div>
  )
}
