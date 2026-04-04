"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { IconLayoutRows } from "@tabler/icons-react"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus("sending")
    try {
      const result = await signIn("resend", {
        email: email.trim(),
        callbackUrl: "/",
        redirect: false,
      })
      if (result?.error) setStatus("error")
      else if (result?.ok) setStatus("sent")
      else setStatus("error")
    } catch {
      setStatus("error")
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md">
                <IconLayoutRows className="size-6" />
              </div>
              <span className="sr-only">Ratatouille</span>
            </Link>
            <h1 className="text-xl font-bold">Create an account</h1>
            <FieldDescription>
              Already have an account? <Link href="/login">Sign in</Link>
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="signup-email">Email</FieldLabel>
            <Input
              id="signup-email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field>
            <Button type="submit" disabled={status === "sending" || status === "sent"}>
              {status === "sending" ? "Sending link…" : "Email sign-in link"}
            </Button>
          </Field>
          {status === "sent" ? (
            <FieldDescription>Check your email for a sign-in link.</FieldDescription>
          ) : null}
          {status === "error" ? (
            <FieldDescription className="text-destructive">
              Could not send the sign-in email. Check your address and try again.
            </FieldDescription>
          ) : null}
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and{" "}
        <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
