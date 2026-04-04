import { auth } from "@/auth"
import { redirect } from "next/navigation"

/** Redirects to `/login` when there is no valid numeric user id in session. */
export async function requireUserId(): Promise<number> {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const id = Number.parseInt(session.user.id, 10)
  if (!Number.isFinite(id)) redirect("/login")
  return id
}
