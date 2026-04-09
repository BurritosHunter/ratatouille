"use client"

import { IconPlus, IconTrash } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

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

function ingredientsSignature(items: Ingredient[]): string {
  return JSON.stringify(items.map((ingredient) => [ingredient.id, ingredient.name]))
}

function mergeIngredientsFromServer(server: Ingredient[], prev: InternalLine[]): InternalLine[] {
  const serverLines = linesFromServer(server)
  const suffix: InternalLine[] = []
  let i = prev.length - 1
  while (i >= 0 && prev[i].id === undefined) {
    suffix.unshift(prev[i])
    i--
  }
  let emptyRunStart = suffix.length
  while (emptyRunStart > 0 && suffix[emptyRunStart - 1].name.trim() === "") {
    emptyRunStart -= 1
  }
  const emptyTail = suffix.slice(emptyRunStart)
  const toMatch = suffix.slice(0, emptyRunStart)

  let u = toMatch.length - 1
  let s = serverLines.length - 1
  while (u >= 0 && s >= 0 && toMatch[u].name.trim() === serverLines[s].name.trim()) {
    u -= 1
    s -= 1
  }
  const unmatchedDrafts = toMatch.slice(0, u + 1)
  return [...serverLines, ...unmatchedDrafts, ...emptyTail]
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
  const initialSigRef = useRef(ingredientsSignature(initial))
  /** Draft row to clear after a successful Enter (confirm) save. */
  const enterConfirmLineIdRef = useRef<string | null>(null)

  const runPersist = useCallback(async () => {
    const payload = linesToPayload(linesRef.current)
    const sig = payloadSignature(payload)
    if (sig === lastSavedSigRef.current) {
      enterConfirmLineIdRef.current = null
      return
    }

    if (savingLockRef.current) {
      pendingAgainRef.current = true
      return
    }
    savingLockRef.current = true
    setSaving(true)
    try {
      const result = await saveIngredientsState(payload)
      const clearLineId = enterConfirmLineIdRef.current
      enterConfirmLineIdRef.current = null
      if (!result.ok) return
      if (clearLineId) {
        const next = linesRef.current.map((line) =>
          line.lineId === clearLineId && line.id === undefined ? { ...line, name: "" } : line
        )
        linesRef.current = next
        setLines(next)
      }
      lastSavedSigRef.current = payloadSignature(linesToPayload(linesRef.current))
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

  useLayoutEffect(() => {
    const sig = ingredientsSignature(initial)
    if (sig === initialSigRef.current) return
    initialSigRef.current = sig
    setLines((prev) => {
      const next = mergeIngredientsFromServer(initial, prev)
      lastSavedSigRef.current = payloadSignature(linesToPayload(next))
      return next
    })
  }, [initial])

  const addEmptyRow = useCallback(() => {
    setLines((prev) => [...prev, { name: "", lineId: draftLineId() }])
  }, [])

  function removeLine(index: number) {
    flushDebounce()
    setLines((prev) => {
      const next = prev.filter((_line, i) => i !== index)
      linesRef.current = next
      queueMicrotask(() => void persistNowRef.current())
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup className="gap-3">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ingredients yet. Add one below.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lines.map((line, i) => (
              <li key={line.lineId}>
                <Field className="gap-1.5">
                  <FieldLabel className="sr-only">Ingredient {i + 1}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      className="min-w-0 flex-1"
                      value={line.name}
                      onChange={(event) => {
                        const value = event.target.value
                        setLines((prev) =>
                          prev.map((line, j) => (j === i ? { ...line, name: value } : line))
                        )
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" || event.nativeEvent.isComposing) return
                        event.preventDefault()
                        flushDebounce()
                        if (line.id === undefined && line.name.trim() !== "") enterConfirmLineIdRef.current = line.lineId
                        void persistNowRef.current()
                      }}
                      onBlur={schedulePersistFromBlur}
                      placeholder="Ingredient name"
                      autoComplete="off"
                      aria-label={`Ingredient ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ingredient ${i + 1}`}
                      onClick={() => removeLine(i)}
                    >
                      <IconTrash className="size-4" aria-hidden />
                    </Button>
                  </div>
                </Field>
              </li>
            ))}
          </ul>
        )}
      </FieldGroup>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="ghost"
          className="self-start justify-start text-muted-foreground"
          onClick={addEmptyRow}
        >
          <IconPlus className="size-4 shrink-0" aria-hidden />
          Create a new ingredient
        </Button>
        {saving ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Saving…
          </p>
        ) : null}
      </div>

    </div>
  )
}
