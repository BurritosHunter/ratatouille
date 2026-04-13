"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { IconTrash } from "@tabler/icons-react"

import { quickCreateIngredient } from "@/app/(main)/ingredients/actions"
import { SearchableMultiSelect } from "@/components/molecules/searchable-multi-select"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export type MealIngredientEditorLine = {
  ingredientId?: number
  name: string
  quantityNote: string
}

type Props = {
  catalog: { id: number; name: string }[]
  initialLines: MealIngredientEditorLine[]
  /** Called when the serialized ingredients payload changes (e.g. for autosave). */
  onIngredientsPayloadChange?: (payloadJson: string) => void
}

type InternalLine = MealIngredientEditorLine & { lineId: string }

function withIds(rows: MealIngredientEditorLine[]): InternalLine[] {
  let id = 0
  return rows.map((row) => ({ ...row, lineId: `ln-${id++}` }))
}

/** Unique pantry ids present on lines (first occurrence order), for the multi-select value. */
function pickIdsFromLines(lineList: InternalLine[]): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const line of lineList) {
    if (line.ingredientId === undefined) continue
    const idString = String(line.ingredientId)
    if (seen.has(idString)) continue
    seen.add(idString)
    ordered.push(idString)
  }
  return ordered
}

function removeLastLineWithIngredientIdFromLines(
  previousLines: InternalLine[],
  idString: string,
): InternalLine[] {
  const id = Number.parseInt(idString, 10)
  if (!Number.isFinite(id)) return previousLines
  for (let i = previousLines.length - 1; i >= 0; i--) {
    if (previousLines[i]!.ingredientId === id) {
      return previousLines.filter((_line, j) => j !== i)
    }
  }
  return previousLines
}

export function MealIngredientsEditor({
  catalog: catalogProp,
  initialLines,
  onIngredientsPayloadChange,
}: Props) {
  const [catalog, setCatalog] = useState(() =>
    [...catalogProp].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
    ),
  )
  const [lines, setLines] = useState<InternalLine[]>(() => withIds(initialLines))
  const nextLineId = useRef(initialLines.length)
  const skipNextPayloadNotificationReference = useRef(true)

  const pickIds = useMemo(() => pickIdsFromLines(lines), [lines])

  const payloadJson = useMemo(
    () =>
      JSON.stringify(
        lines.map(({ ingredientId, name, quantityNote }) => ({
          ingredientId,
          name,
          quantityNote,
        })),
      ),
    [lines],
  )

  useEffect(() => {
    if (skipNextPayloadNotificationReference.current) {
      skipNextPayloadNotificationReference.current = false
      return
    }
    onIngredientsPayloadChange?.(payloadJson)
  }, [payloadJson, onIngredientsPayloadChange])

  const pantryOptions = useMemo(
    () => catalog.map((entry) => ({ value: String(entry.id), label: entry.name })),
    [catalog],
  )

  function appendLine(row: MealIngredientEditorLine) {
    setLines((prev) => [...prev, { ...row, lineId: `ln-${nextLineId.current++}` }])
  }

  const handlePickIdsChange = useCallback(
    (nextPickIds: string[]) => {
      setLines((previousLines) => {
        const currentPickIds = pickIdsFromLines(previousLines)
        const previousSet = new Set(currentPickIds)
        const nextSet = new Set(nextPickIds)
        let nextLines = previousLines

        for (const idString of nextPickIds) {
          if (!previousSet.has(idString)) {
            const id = Number.parseInt(idString, 10)
            if (!Number.isFinite(id)) continue
            const row = catalog.find((entry) => entry.id === id)
            if (!row) continue
            nextLines = [
              ...nextLines,
              {
                ingredientId: row.id,
                name: row.name,
                quantityNote: "",
                lineId: `ln-${nextLineId.current++}`,
              },
            ]
          }
        }
        for (const idString of currentPickIds) {
          if (!nextSet.has(idString)) {
            nextLines = removeLastLineWithIngredientIdFromLines(nextLines, idString)
          }
        }
        return nextLines
      })
    },
    [catalog],
  )

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_line, i) => i !== index))
  }

  function moveLine(index: number, dir: -1 | 1) {
    setLines((prev) => {
      const next = index + dir
      if (next < 0 || next >= prev.length) return prev
      const copy = [...prev]
      const temp = copy[index]!
      copy[index] = copy[next]!
      copy[next] = temp
      return copy
    })
  }

  async function mergeNewIngredientIntoCatalog(
    rawName: string,
  ): Promise<{ id: number; name: string } | null> {
    const createResult = await quickCreateIngredient(rawName)
    if (!createResult.ok) return null
    setCatalog((prev) => {
      if (prev.some((existing) => existing.id === createResult.id)) return prev
      return [...prev, { id: createResult.id, name: createResult.name }].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      )
    })
    return { id: createResult.id, name: createResult.name }
  }

  async function createIngredientByName(name: string) {
    const created = await mergeNewIngredientIntoCatalog(name)
    if (!created) return
    appendLine({ ingredientId: created.id, name: created.name, quantityNote: "" })
  }

  return (
    <FieldGroup className="gap-4">
      <input type="hidden" name="ingredients_payload" value={payloadJson} />

      <Field className="*:w-auto">
        <SearchableMultiSelect
          className="max-w-[200px]"
          options={pantryOptions}
          value={pickIds}
          onChange={handlePickIdsChange}
          placeholder="Choose ingredient…"
          searchPlaceholder="Search pantry…"
          ariaLabel="Choose ingredient from pantry"
          onCreateOption={createIngredientByName}
        />
      </Field>
      {lines.length > 0 && (
        <ul className="flex flex-col gap-1">
            {lines.map((line, i) => (
              <li
                key={line.lineId}
                className="flex flex-col gap-2 rounded-md bg-muted ml-3 pl-3.5 pr-1 py-1 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <Field className="gap-1.5">
                    {/* <FieldLabel className="text-xs">Ingredient</FieldLabel> */}
                    <p className="flex min-h-9 items-center truncate text-sm">{line.name}</p>
                  </Field>
                  <Field className="gap-1.5">
                    {/* <FieldLabel className="text-xs">Amount / note (optional)</FieldLabel> */}
                    <Input
                      value={line.quantityNote}
                      onChange={(event) => {
                        const value = event.target.value
                        setLines((prev) =>
                          prev.map((line, j) => (j === i ? { ...line, quantityNote: value } : line))
                        )
                      }}
                      placeholder="e.g. 2 tbsp"
                    />
                  </Field>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  {/* <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move ingredient up"
                    onClick={() => moveLine(i, -1)}
                    disabled={i === 0}
                  >
                    <IconChevronUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move ingredient down"
                    onClick={() => moveLine(i, 1)}
                    disabled={i === lines.length - 1}
                  >
                    <IconChevronDown aria-hidden />
                  </Button> */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove ingredient"
                    onClick={() => removeLine(i)}
                  >
                    <IconTrash aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      )}
    </FieldGroup>
  )
}
