import { signIn } from "@/auth"
import {
  DEV_LOCALHOST_CREDENTIALS_ID,
  devLocalhostSafeCallbackUrl,
  requestUrlHostnameIsLocalhost,
} from "@/lib/dev-localhost-auto-login"

export async function GET(request: Request) {
  if (!requestUrlHostnameIsLocalhost(request)) return new Response("Not found", { status: 404 })
  const url = new URL(request.url)
  const callbackUrl = devLocalhostSafeCallbackUrl(url.searchParams.get("callbackUrl"))
  return signIn(DEV_LOCALHOST_CREDENTIALS_ID, { redirectTo: callbackUrl })
}
