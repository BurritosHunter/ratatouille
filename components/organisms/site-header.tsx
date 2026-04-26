"use client"

import Link from "next/link"
import { IconSearch, IconUser } from "@tabler/icons-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { useTranslation } from "react-i18next"

export function SiteHeader() {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col">
      <div className="flex gap-4 h-14 w-full max-w-screen-xl mx-auto px-4">
        <div className="flex min-w-0 flex-1 flex-row items-center gap-1">
          <Button asChild variant="ghost" className="shrink-0 font-heading text-base font-semibold -ml-2">
            <Link href="/">{t("common.appName")}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">{t("nav.explore")}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/recipes">{t("nav.recipes")}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/ingredients">{t("nav.ingredients")}</Link>
          </Button>
        </div>
        <div className="flex shrink-0 flex-row items-center gap-2">
          <InputGroup className="w-48 sm:w-64">
            <InputGroupAddon align="inline-start">
              <IconSearch aria-hidden />
            </InputGroupAddon>
            <InputGroupInput placeholder={t("common.search")} type="search" aria-label={t("common.search")} />
          </InputGroup>
          <ThemeToggle />
          <Button type="button" variant="outline" size="icon" aria-label={t("common.profileAria")}>
            <IconUser aria-hidden />
          </Button>
        </div>
      </div>
      <Separator />
    </header>
  )
}
