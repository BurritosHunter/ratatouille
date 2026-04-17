import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { devLocalhostRedirectIfNoSession } from "@/lib/auth/dev-localhost-auto-login"

export default async function Page() {
  const session = await auth()
  if (!session?.user) {
    await devLocalhostRedirectIfNoSession("/")
    redirect("/login")
  }

  return (
    <div className="max-w-header">
      <p className="text-sm">Signed in as {session.user.name ?? session.user.email ?? "you"}</p>
    </div>
  )
}
