import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { devLocalhostRedirectIfNoSession } from "@/lib/auth/dev-localhost-auto-login"

export default async function Page() {
  const session = await auth()
  if (!session?.user) {
    await devLocalhostRedirectIfNoSession("/")
    redirect("/login")
  }

  return (
    <div className="flex min-h-svh p-6 max-w-screen-xl mx-auto">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <p>Signed in as {session.user.email ?? session.user.name ?? "you"}</p>
      </div>
    </div>
  )
}
