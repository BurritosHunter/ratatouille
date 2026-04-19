import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { devLocalhostRedirectIfNoSession } from "@/lib/auth/dev-localhost-auto-login"
import { getServerT } from "@/lib/i18n/server"

export default async function Page() {
  const t = getServerT()
  const session = await auth()
  if (!session?.user) {
    await devLocalhostRedirectIfNoSession("/")
    redirect("/login")
  }

  return (
    <div className="max-w-header">
      <p className="text-sm">
        {t("home.signedInAs", {
          displayName: session.user.name ?? session.user.email ?? t("common.you"),
        })}
      </p>
    </div>
  )
}
