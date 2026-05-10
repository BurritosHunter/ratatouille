"use client";

import Link from "next/link";
import { IconUser } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="flex flex-col">
      <div className="mx-auto flex h-14 w-full max-w-screen-xl gap-4 px-4">
        <div className="flex min-w-0 flex-1 flex-row items-center gap-1">
          <Button asChild variant="ghost" className="-ml-2 shrink-0 font-heading text-base font-semibold">
            <Link href="/">{t("common.appName")}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/recipes">{t("nav.recipes")}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/pantry">{t("nav.pantry")}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/ingredients">{t("nav.ingredients")}</Link>
          </Button>
        </div>
        <div className="flex shrink-0 flex-row items-center gap-2">
          <Button asChild variant="outline" size="icon" aria-label={t("common.profileAria")}>
            <Link href="/profile">
              <IconUser aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
      <Separator />
    </header>
  );
}
