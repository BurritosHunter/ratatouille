/**
 * Local-only convenience: when the app is reached as localhost (or loopback), unauthenticated
 * visitors are redirected through `/api/auth/dev-auto` and signed in as user id "1" (Credentials).
 *
 * ---------------------------------------------------------------------------------------------
 * To remove this feature: delete this file, delete `app/api/auth/dev-auto/`, and remove the
 * `devLocalhost*` imports / spread from `auth.ts`, `app/page.tsx`, and `lib/auth/auth-user.ts`.
 * ---------------------------------------------------------------------------------------------
 *
 * Security (read before deploying):
 * - Loopback detection uses `Host` / `X-Forwarded-Host` in RSC and the request URL in the proxy.
 *   A reverse proxy must not pass client-controlled `Host`/`X-Forwarded-Host` through to the app
 *   as real hostnames, or an attacker could spoof "localhost" and obtain user 1’s session.
 * - The Credentials `authorize` callback only succeeds when Auth.js passes a request whose URL
 *   host is loopback—defense in depth if the route is ever reachable with a wrong Host header.
 * - Anyone who completes this flow becomes user id 1; never expose that on the public internet.
 */
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import Credentials from "next-auth/providers/credentials"

export const DEV_LOCALHOST_CREDENTIALS_ID = "dev-user" as const

export const DEV_LOCALHOST_SIGNIN_PATH = "/api/auth/dev-auto" as const

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"])

export function hostnameIsLocalhost(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname.toLowerCase())
}

function hostnameFromHostHeader(host: string): string {
  if (host.startsWith("[")) {
    const end = host.indexOf("]")
    if (end > 0) return host.slice(1, end)
  }
  const idx = host.lastIndexOf(":")
  if (idx > 0 && /^\d+$/.test(host.slice(idx + 1))) return host.slice(0, idx)
  return host
}

export function requestUrlHostnameIsLocalhost(request: Request): boolean {
  return hostnameIsLocalhost(new URL(request.url).hostname)
}

/**
 * For RSC: treat as localhost only when Host is loopback. We intentionally do not trust
 * `X-Forwarded-Host` here—spoofed values could otherwise trigger dev sign-in on a shared host.
 */
export async function serverComponentRequestIsLocalhost(): Promise<boolean> {
  const h = await headers()
  const host = h.get("host")
  if (!host) return false
  return hostnameIsLocalhost(hostnameFromHostHeader(host))
}

export function devLocalhostSafeCallbackUrl(raw: string | null): string {
  if (raw == null || raw === "") return "/"
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/"
  return raw
}

export function redirectToDevLocalhostSignIn(callbackUrl: string = "/"): never {
  const safe = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/"
  redirect(`${DEV_LOCALHOST_SIGNIN_PATH}?callbackUrl=${encodeURIComponent(safe)}`)
}

/** NextAuth Credentials provider (localhost-gated inside `authorize`). */
export const devLocalhostCredentialsProvider = Credentials({
  id: DEV_LOCALHOST_CREDENTIALS_ID,
  name: "Dev User",
  credentials: {},
  authorize(_credentials, request) {
    if (!request || !requestUrlHostnameIsLocalhost(request)) return null
    return { id: "1", email: "dev@localhost", name: "Dev User" }
  },
})

/**
 * Proxy `authorized` helper: if unauthenticated on a non-public route and hostname is loopback,
 * send the browser to the dev sign-in route.
 */
export function devLocalhostProxyUnauthorizedRedirect(
  request: NextRequest,
  auth: { user?: unknown } | null | undefined,
  pathname: string,
  isPublic: boolean,
): NextResponse | null {
  if (auth?.user || isPublic) return null
  if (!hostnameIsLocalhost(request.nextUrl.hostname)) return null
  const dest = new URL(DEV_LOCALHOST_SIGNIN_PATH, request.url)
  dest.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(dest)
}

/** After `auth()` in a server component: localhost + no session → dev sign-in, else fall through. */
export async function devLocalhostRedirectIfNoSession(callbackUrl: string): Promise<void> {
  if (await serverComponentRequestIsLocalhost()) redirectToDevLocalhostSignIn(callbackUrl)
}
