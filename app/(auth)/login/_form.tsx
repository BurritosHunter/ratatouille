"use client"

import Link from "next/link"
import { signIn } from "next-auth/react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const RESEND_PROVIDER_ID = "resend"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [showDevLink, setShowDevLink] = useState(false)

  useEffect(() => {
    const hostname = window.location.hostname
    if (hostname === "localhost" || hostname === "127.0.0.1") setShowDevLink(true)
  }, [])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim()) return
    setStatus("loading")
    setErrorMessage("")
    const result = await signIn(RESEND_PROVIDER_ID, {
      email: email.trim(),
      redirect: false,
    })
    if (result?.error) {
      setStatus("error")
      setErrorMessage("Could not send sign-in email. Check the address and try again.")
      return
    }
    setStatus("sent")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">We&apos;ll email you a magic link.</p>
      </div>

      {status === "sent" ? (
        <p className="text-center text-sm text-muted-foreground">
          Check <span className="font-medium text-foreground">{email}</span> for a sign-in link.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="you@example.com"
                disabled={status === "loading"}
              />
            </Field>
          </FieldGroup>
          {status === "error" && errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Sending…" : "Send magic link"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>

      {showDevLink ? (
        <p className="text-center text-sm text-muted-foreground">
          Local dev:{" "}
          <Link
            href="/api/auth/dev-auto?callbackUrl=%2F"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in as dev user
          </Link>
        </p>
      ) : null}
    </div>
  )
}
