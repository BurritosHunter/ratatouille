import NextAuth from "next-auth"
import PostgresAdapter from "@auth/pg-adapter"
import { Pool } from "@neondatabase/serverless"
import Resend from "next-auth/providers/resend"
import { NextResponse } from "next/server"

import {
  devLocalhostCredentialsProvider,
  devLocalhostProxyUnauthorizedRedirect,
} from "@/lib/dev-localhost-auto-login"

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  return {
    // Neon serverless Pool is compatible with the adapter at runtime; types target `pg`.
    adapter: PostgresAdapter(pool as Parameters<typeof PostgresAdapter>[0]),
    session: { strategy: "jwt" },
    providers: [
      devLocalhostCredentialsProvider,
      Resend({
        from: process.env.AUTH_RESEND_FROM?.trim() || "Ratatouille <onboarding@resend.dev>",
      }),
    ],
    pages: { signIn: "/login" },
    trustHost: true,
    callbacks: {
      authorized({ request, auth }) {
        const path = request.nextUrl.pathname
        if (auth?.user && (path === "/login" || path === "/signup")) {
          return NextResponse.redirect(new URL("/", request.url))
        }
        const isPublic = path.startsWith("/api/auth") || path === "/login" || path === "/signup"
        const devLocal = devLocalhostProxyUnauthorizedRedirect(request, auth, path, isPublic)
        if (devLocal) return devLocal

        if (!auth?.user && !isPublic) {
          return NextResponse.redirect(new URL("/login", request.url))
        }

        return true
      },
      jwt({ token, user }) {
        if (user) token.id = user.id
        return token
      },
      session({ session, token }) {
        if (session.user && token.id != null) session.user.id = String(token.id)
        return session
      },
    },
  }
})
