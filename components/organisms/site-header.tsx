"use client"

import Link from "next/link"
import { IconSearch, IconUser } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"

export function SiteHeader() {
  return (
    <header className="flex flex-col">
      <div className="flex h-14 w-full items-center gap-4 px-4">
        <div className="flex min-w-0 flex-1 flex-row items-center gap-1">
          <Button asChild variant="ghost" className="shrink-0 font-heading text-base font-semibold">
            <Link href="/">Ratatouille</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Explore</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/tasks">Tasks</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/recipes">Recipes</Link>
          </Button>
        </div>
        <div className="flex shrink-0 flex-row items-center gap-2">
          <InputGroup className="w-48 sm:w-64">
            <InputGroupAddon align="inline-start">
              <IconSearch aria-hidden />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search" type="search" aria-label="Search" />
          </InputGroup>
          <Button type="button" variant="outline" size="icon" aria-label="Profile">
            <IconUser aria-hidden />
          </Button>
        </div>
      </div>
      <Separator />
    </header>
  )
}
