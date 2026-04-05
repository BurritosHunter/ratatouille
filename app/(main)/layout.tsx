import type { ReactNode } from "react"

import { SiteHeader } from "@/components/organisms/site-header"

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  )
}
