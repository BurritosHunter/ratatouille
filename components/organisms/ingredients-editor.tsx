"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { saveIngredientsState } from "@/app/(main)/ingredients/actions"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { Ingredient } from "@/lib/models/ingredient"

type Line = { id?: number; name: string }

type InternalLine = Line & { lineId: string }

function linesFromServer(initial: Ingredient[]): InternalLine[] {
  return initial.map((row, i) => ({ ...row, lineId: `s-${row.id}-${i}` }))
}

function draftLineId(): string {
  return `d-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`
}

function linesToPayload(lines: InternalLine[]): Line[] {
  return lines.map(({ id, name }) => ({ id, name }))
}

function payloadSignature(payload: Line[]): string {
  return JSON.stringify(payload)
}

type Props = {
  initial: Ingredient[]
}

const BLUR_SAVE_DEBOUNCE_MS = 250

export function IngredientsEditor({ initial }: Props) {
  const router = useRouter()
  const [lines, setLines] = useState<InternalLine[]>(() => linesFromServer(initial))
  const [saving, setSaving] = useState(false)

  const linesRef = useRef(lines)
  linesRef.current = lines

  const lastSavedSigRef = useRef(payloadSignature(linesToPayload(linesFromServer(initial))))
  const savingLockRef = useRef(false)
  const pendingAgainRef = useRef(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runPersist = useCallback(async () => {
    const payload = linesToPayload(linesRef.current)
    const sig = payloadSignature(payload)
    if (sig === lastSavedSigRef.current) return

    if (savingLockRef.current) {
      pendingAgainRef.current = true
      return
    }
    savingLockRef.current = true
    setSaving(true)
    try {
      const r = await saveIngredientsState(payload)
      if (!r.ok) return
      const nextLines = linesRef.current.filter((l) => l.id !== undefined || l.name.trim() !== "")
      lastSavedSigRef.current = payloadSignature(linesToPayload(nextLines))
      linesRef.current = nextLines
      setLines(nextLines)
      router.refresh()
    } finally {
      savingLockRef.current = false
      setSaving(false)
      if (pendingAgainRef.current) {
        pendingAgainRef.current = false
        queueMicrotask(() => void persistNowRef.current())
      }
    }
  }, [router])

  const persistNowRef = useRef(runPersist)
  persistNowRef.current = runPersist

  function flushDebounce() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }

  function schedulePersistFromBlur() {
    flushDebounce()
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      void persistNowRef.current()
    }, BLUR_SAVE_DEBOUNCE_MS)
  }

  useEffect(() => {
    const persistOnLeave = () => {
      flushDebounce()
      void persistNowRef.current()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistOnLeave()
    }
    const onPageHide = () => persistOnLeave()

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("pagehide", onPageHide)

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("pagehide", onPageHide)
      persistOnLeave()
    }
  }, [])

  function addEmptyRow() {
    setLines((prev) => [...prev, { name: "", lineId: draftLineId() }])
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <FieldGroup className="gap-3">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ingredients yet. Add one below.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lines.map((line, index) => (
              <li key={line.lineId}>
                <Field className="gap-1.5">
                  <FieldLabel className="sr-only">Ingredient {index + 1}</FieldLabel>
                  <Input
                    value={line.name}
                    onChange={(e) => {
                      const v = e.target.value
                      setLines((prev) => prev.map((l, i) => (i === index ? { ...l, name: v } : l)))
                    }}
                    onBlur={schedulePersistFromBlur}
                    placeholder="Ingredient name"
                    autoComplete="off"
                    aria-label={`Ingredient ${index + 1}`}
                  />
                </Field>
              </li>
            ))}
          </ul>
        )}
      </FieldGroup>

      <div className="flex flex-col gap-2">
        <Button type="button" variant="link" className="h-auto p-0 text-muted-foreground underline-offset-4" onClick={addEmptyRow}>
          create a new ingredient
        </Button>
        {saving ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Saving…
          </p>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        Changes save when you leave a field, switch tab, or leave this page. Empty rows are not stored. Clear a name and
        leave the field to remove that ingredient.
      </p>
    </div>
  )
}
