"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const RESEND_PROVIDER_ID = "resend";
const subscribeToNoopStore = () => () => {};

function browserIsLocalhost() {
  if (typeof window === "undefined") return false;
  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function LoginForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const showDevLink = useSyncExternalStore(
    subscribeToNoopStore,
    browserIsLocalhost,
    () => false
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMessage("");
    const result = await signIn(RESEND_PROVIDER_ID, {
      email: email.trim(),
      redirect: false,
    });
    if (result?.error) {
      setStatus("error");
      setErrorMessage(t("auth.errorSendEmail"));
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">{t("auth.signIn")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("auth.magicLinkBlurb")}
        </p>
      </div>

      {status === "sent" ? (
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.checkEmailBefore")}{" "}
          <span className="font-medium text-foreground">{email}</span>{" "}
          {t("auth.checkEmailAfter")}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="login-email">{t("auth.emailLabel")}</FieldLabel>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder={t("auth.emailPlaceholder")}
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
            {status === "loading" ? t("auth.sending") : t("auth.sendMagicLink")}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.signUpPrompt")}{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("auth.signUp")}
        </Link>
      </p>

      {showDevLink ? (
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.devLocal")}{" "}
          <Link
            href="/api/auth/dev-auto?callbackUrl=%2F"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t("auth.signInAsDev")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
