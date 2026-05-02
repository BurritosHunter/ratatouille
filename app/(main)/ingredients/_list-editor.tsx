"use client"

import { IconPlus, IconTrash } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { saveIngredientsState } from "./actions"
import type { CategoryShelfLifeDefaultsMap } from "@/lib/data/ingredient-category-shelf-defaults"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input, inputVariants } from "@/components/ui/input"
import { cn } from "@/lib/helpers/utils"
import type { Ingredient, IngredientCategory, IngredientShelfLifePreset } from "@/lib/models/ingredient"
import {
  DEFAULT_SHELF_LIFE_PRESET,
  INGREDIENT_CATEGORIES,
  INGREDIENT_SHELF_LIFE_PRESETS,
  parseIngredientCategory,
  resolveShelfLifePreset,
} from "@/lib/models/ingredient"

type Line = {
  id?: number
  name: string
  shelfLifePreset: IngredientShelfLifePreset
  category: IngredientCategory
}

type InternalLine = Line & { lineId: string }

export type IngredientsSortMode = "name_az" | "category"

function sortIngredientLines(rows: InternalLine[], mode: IngredientsSortMode): InternalLine[] {
  const copy = [...rows]
  const compareNameTrimmed = (left: InternalLine, right: InternalLine) =>
    left.name.trim().localeCompare(right.name.trim(), undefined, { sensitivity: "base" })
  const putBlankNamesLast = (left: InternalLine, right: InternalLine) => {
    const blankLeft = left.name.trim() === ""
    const blankRight = right.name.trim() === ""
    if (blankLeft && blankRight) return 0
    if (blankLeft) return 1
    if (blankRight) return -1
    return 0
  }
  if (mode === "name_az") {
    copy.sort((left, right) => {
      const blankOrder = putBlankNamesLast(left, right)
      if (blankOrder !== 0) return blankOrder
      return compareNameTrimmed(left, right)
    })
    return copy
  }
  const categoryRank = new Map(INGREDIENT_CATEGORIES.map((categoryKey, i) => [categoryKey, i]))
  copy.sort((left, right) => {
    const rankLeft = categoryRank.get(left.category) ?? 999
    const rankRight = categoryRank.get(right.category) ?? 999
    if (rankLeft !== rankRight) return rankLeft - rankRight
    const blankOrder = putBlankNamesLast(left, right)
    if (blankOrder !== 0) return blankOrder
    return compareNameTrimmed(left, right)
  })
  return copy
}

function linesFromServer(initial: Ingredient[]): InternalLine[] {
  return initial.map((row, i) => ({ ...row, lineId: `s-${row.id}-${i}` }))
}

function draftLineId(): string {
  return `d-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`
}

function linesToPayload(lines: InternalLine[]): Line[] {
  return lines.map(({ id, name, shelfLifePreset, category }) => ({
    id,
    name,
    shelfLifePreset,
    category,
  }))
}

function payloadSignature(payload: Line[]): string {
  return JSON.stringify(payload)
}

function ingredientsSignature(items: Ingredient[]): string {
  return JSON.stringify(
    items.map((ingredient) => [
      ingredient.id,
      ingredient.name,
      ingredient.shelfLifePreset,
      ingredient.category,
    ]),
  )
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
  categoryShelfDefaults: CategoryShelfLifeDefaultsMap
  sortMode: IngredientsSortMode
}

const BLUR_SAVE_DEBOUNCE_MS = 250

export function IngredientsEditor({ initial, categoryShelfDefaults, sortMode }: Props) {
  const { t } = useTranslation()
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
    setLines((prev) => [
      ...prev,
      {
        name: "",
        shelfLifePreset: categoryShelfDefaults.miscellaneous,
        category: "miscellaneous",
        lineId: draftLineId(),
      },
    ])
  }, [categoryShelfDefaults])

  const orderedLines = useMemo(
    () => sortIngredientLines(lines, sortMode),
    [lines, sortMode],
  )

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
          <p className="text-sm text-muted-foreground">{t("ingredients.emptyCatalog")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {orderedLines.map((line, displayPosition) => {
              const stableIndex = lines.findIndex((candidate) => candidate.lineId === line.lineId)
              if (stableIndex < 0) return null
              const rowAriaIndex = displayPosition + 1
              return (
                <li key={line.lineId}>
                  <Field className="gap-1.5">
                    <FieldLabel className="sr-only">
                      {t("ingredients.rowLabel", { index: rowAriaIndex })}
                    </FieldLabel>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <Input
                        className="min-w-0 w-full sm:flex-1 sm:min-w-[10rem]"
                        value={line.name}
                        onChange={(event) => {
                          const value = event.target.value
                          setLines((prev) =>
                            prev.map((line, j) => (j === stableIndex ? { ...line, name: value } : line))
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
                        placeholder={t("ingredients.namePlaceholder")}
                        autoComplete="off"
                        aria-label={t("ingredients.nameAria", { index: rowAriaIndex })}
                      />

                      <select
                        className={cn(inputVariants({ variant: "default" }), "w-full min-w-0 sm:min-w-[9rem] sm:w-auto shrink-0")}
                        value={line.category}
                        onChange={(event) => {
                          const categoryNext = parseIngredientCategory(event.target.value)
                          const shelfDefault =
                            categoryShelfDefaults[categoryNext] ?? DEFAULT_SHELF_LIFE_PRESET
                          setLines((prev) =>
                            prev.map((line, j) =>
                              j === stableIndex
                                ? {
                                    ...line,
                                    category: categoryNext,
                                    shelfLifePreset: shelfDefault,
                                  }
                                : line,
                            ),
                          )
                        }}
                        onBlur={schedulePersistFromBlur}
                        aria-label={t("ingredients.categoryAria", { index: rowAriaIndex })}
                      >
                        {INGREDIENT_CATEGORIES.map((categoryKey) => (
                          <option key={categoryKey} value={categoryKey}>
                            {t(`ingredients.category.${categoryKey}`)}
                          </option>
                        ))}
                      </select>

                      <select
                        className={cn(
                          inputVariants({ variant: "default" }),
                          "w-full min-w-0 sm:min-w-[12rem] sm:w-auto shrink-0",
                        )}
                        value={line.shelfLifePreset}
                        onChange={(event) => {
                          const preset = resolveShelfLifePreset(event.target.value)
                          setLines((prev) =>
                            prev.map((line, j) =>
                              j === stableIndex ? { ...line, shelfLifePreset: preset } : line,
                            ),
                          )
                        }}
                        onBlur={schedulePersistFromBlur}
                        aria-label={t("ingredients.shelfLife.aria", { index: rowAriaIndex })}
                      >
                        {INGREDIENT_SHELF_LIFE_PRESETS.map((presetKey) => (
                          <option key={presetKey} value={presetKey}>
                            {t(`ingredients.shelfLife.${presetKey}`)}
                          </option>
                        ))}
                      </select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive self-start sm:self-center"
                        aria-label={t("ingredients.removeAria", { index: rowAriaIndex })}
                        onClick={() => removeLine(stableIndex)}
                      >
                        <IconTrash className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </Field>
                </li>
              )
            })}
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
          {t("ingredients.createNew")}
        </Button>
        {saving ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("ingredients.saving")}
          </p>
        ) : null}
      </div>
    </div>
  )
}
