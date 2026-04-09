"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"

import { quickCreateIngredient } from "@/app/(main)/ingredients/actions"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export type MealIngredientEditorLine = {
  ingredientId?: number
  name: string
  quantityNote: string
}

type Props = {
  catalog: { id: number; name: string }[]
  initialLines: MealIngredientEditorLine[]
}

type InternalLine = MealIngredientEditorLine & { lineId: string }

function withIds(rows: MealIngredientEditorLine[], nextId: { current: number }): InternalLine[] {
  return rows.map((row) => ({ ...row, lineId: `ln-${nextId.current++}` }))
}

export function MealIngredientsEditor({ catalog: catalogProp, initialLines }: Props) {
  const nextLineId = useRef(0)
  const [catalog, setCatalog] = useState(() =>
    [...catalogProp].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
    ),
  )
  const [lines, setLines] = useState<InternalLine[]>(() => withIds(initialLines, nextLineId))
  const [pickId, setPickId] = useState("")
  const [newName, setNewName] = useState("")
  const [pending, setPending] = useState(false)

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

  function appendLine(row: MealIngredientEditorLine) {
    setLines((prev) => [...prev, { ...row, lineId: `ln-${nextLineId.current++}` }])
  }

  function addFromCatalog() {
    const id = Number.parseInt(pickId, 10)
    if (!Number.isFinite(id)) return
    const row = catalog.find((entry) => entry.id === id)
    if (!row) return
    appendLine({ ingredientId: row.id, name: row.name, quantityNote: "" })
    setPickId("")
  }

  function addBlankLine() {
    appendLine({ name: "", quantityNote: "" })
  }

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

  async function createAndAdd() {
    const name = newName.trim()
    if (!name || pending) return
    setPending(true)
    try {
      const createResult = await quickCreateIngredient(name)
      if (createResult.ok) {
        setCatalog((prev) => {
          if (prev.some((existing) => existing.id === createResult.id)) return prev
          return [...prev, { id: createResult.id, name: createResult.name }].sort((left, right) =>
            left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
          )
        })
        appendLine({ ingredientId: createResult.id, name: createResult.name, quantityNote: "" })
        setNewName("")
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <FieldGroup className="gap-4">
      <input type="hidden" name="ingredients_payload" value={payloadJson} />

      <Field>
        <FieldLabel>Pantry (pick existing)</FieldLabel>
        <div className="flex flex-wrap items-end gap-2">
          <select
            className="border-input bg-background h-9 min-w-[12rem] flex-1 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={pickId}
            onChange={(event) => setPickId(event.target.value)}
            aria-label="Choose ingredient from pantry"
          >
            <option value="">Choose ingredient…</option>
            {catalog.map((entry) => (
              <option key={entry.id} value={String(entry.id)}>
                {entry.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="secondary" size="sm" onClick={addFromCatalog}>
            Add to recipe
          </Button>
        </div>
      </Field>

      <Field>
        <FieldLabel htmlFor="new_ingredient_name">New pantry item (create and add)</FieldLabel>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            id="new_ingredient_name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Sumac"
            className="max-w-xs flex-1"
          />
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={createAndAdd}>
            {pending ? "Saving…" : "Create and add"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Saves to your ingredient list and adds a line to this recipe. Manage all ingredients under{" "}
          <Link href="/ingredients" className="underline underline-offset-2">
            Ingredients
          </Link>
          .
        </p>
      </Field>

      <Field>
        <FieldLabel>Recipe lines</FieldLabel>
        <p className="text-sm text-muted-foreground mb-2">
          Set an optional amount or note per line (e.g. &quot;2 cups&quot;). Reorder with the arrows. At least one line is
          required to save.
        </p>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lines yet — pick from pantry, create new, or add a blank line.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lines.map((line, i) => (
              <li
                key={line.lineId}
                className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <Field className="gap-1.5">
                    <FieldLabel className="text-xs">Ingredient name</FieldLabel>
                    <Input
                      value={line.name}
                      onChange={(event) => {
                        const value = event.target.value
                        setLines((prev) =>
                          prev.map((line, j) =>
                            j === i ? { ...line, name: value, ingredientId: undefined } : line
                          ),
                        )
                      }}
                      placeholder="Ingredient"
                      required
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel className="text-xs">Amount / note (optional)</FieldLabel>
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
                  <Button type="button" variant="ghost" size="sm" onClick={() => moveLine(i, -1)} disabled={i === 0}>
                    Up
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveLine(i, 1)}
                    disabled={i === lines.length - 1}
                  >
                    Down
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addBlankLine}>
          Add blank line
        </Button>
      </Field>
    </FieldGroup>
  )
}
