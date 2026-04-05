import { auth } from "@/auth"
import { devLocalhostRedirectIfNoSession } from "./dev-localhost-auto-login"
import { redirect } from "next/navigation"

/** Redirects to `/login` when there is no valid numeric user id in session. */
export async function requireUserId(callbackUrl: string = "/"): Promise<number> {
  const session = await auth()
  if (session?.user?.id) {
    const id = Number.parseInt(session.user.id, 10)
    if (Number.isFinite(id)) return id
  }

  await devLocalhostRedirectIfNoSession(callbackUrl)
  redirect("/login")
}
