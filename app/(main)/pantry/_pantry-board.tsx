"use client"

import { IconPlus, IconTrash } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  addPantryInventoryLine,
  removePantryInventoryLine,
  searchPantryCatalogAction,
} from "./actions"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { PantryCatalogHit, PantryInventoryRow, PantryStorageLocation } from "@/lib/models/pantry-inventory"

type LocationFilter = "all" | PantryStorageLocation

const STORAGE_LOCATIONS: readonly PantryStorageLocation[] = [
  "fridge",
  "pantry",
  "storage",
  "freezer",
] as const

type AddPhase = "search" | "details"

type Props = {
  initialRows: PantryInventoryRow[]
}

function rowsSignature(rows: PantryInventoryRow[]): string {
  return JSON.stringify(
    rows.map((row) => [
      row.id,
      row.storageLocation,
      row.itemKind,
      row.ingredientId,
      row.recipeId,
      row.customLabel,
      row.quantity,
      row.expiresOn,
    ]),
  )
}

export function PantryBoard({ initialRows }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [rows, setRows] = useState<PantryInventoryRow[]>(initialRows)
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all")
  const [addOpen, setAddOpen] = useState(false)
  const [addPhase, setAddPhase] = useState<AddPhase>("search")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchHits, setSearchHits] = useState<PantryCatalogHit[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedHit, setSelectedHit] = useState<PantryCatalogHit | null>(null)
  const [addMode, setAddMode] = useState<"catalog" | "custom" | "newIngredient">("catalog")
  const [customLabel, setCustomLabel] = useState("")
  const [newIngredientName, setNewIngredientName] = useState("")
  const [detailStorage, setDetailStorage] = useState<PantryStorageLocation>("fridge")
  const [detailQuantity, setDetailQuantity] = useState("")
  const [detailExpires, setDetailExpires] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const lastServerRowsSignatureRef = useRef(rowsSignature(initialRows))

  useLayoutEffect(() => {
    const nextSignature = rowsSignature(initialRows)
    if (nextSignature === lastServerRowsSignatureRef.current) return
    lastServerRowsSignatureRef.current = nextSignature
    setRows(initialRows)
  }, [initialRows])

  const filteredRows = useMemo(() => {
    if (locationFilter === "all") return rows
    return rows.filter((row) => row.storageLocation === locationFilter)
  }, [rows, locationFilter])

  const runSearch = useCallback(async (query: string) => {
    setSearching(true)
    setFormError(null)
    try {
      const result = await searchPantryCatalogAction(query)
      if (result.ok) setSearchHits(result.hits)
      else setSearchHits([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (!addOpen || addPhase !== "search") return
    const trimmed = searchQuery.trim()
    if (trimmed.length === 0) {
      setSearchHits([])
      setSearching(false)
      return
    }
    setSearching(true)
    const handle = setTimeout(() => {
      void runSearch(trimmed)
    }, 280)
    return () => clearTimeout(handle)
  }, [addOpen, addPhase, searchQuery, runSearch])

  function openAddDialog() {
    setAddOpen(true)
    setAddPhase("search")
    setSearchQuery("")
    setSearchHits([])
    setSelectedHit(null)
    setAddMode("catalog")
    setCustomLabel("")
    setNewIngredientName("")
    setDetailStorage("fridge")
    setDetailQuantity("")
    setDetailExpires("")
    setFormError(null)
  }

  function closeAddDialog() {
    setAddOpen(false)
  }

  function selectCatalogHit(hit: PantryCatalogHit) {
    setSelectedHit(hit)
    setAddMode("catalog")
    setAddPhase("details")
    setFormError(null)
  }

  function goToCustomFromSearch() {
    setSelectedHit(null)
    setAddMode("custom")
    setCustomLabel(searchQuery.trim())
    setAddPhase("details")
    setFormError(null)
  }

  function goToNewIngredientFromSearch() {
    setSelectedHit(null)
    setAddMode("newIngredient")
    setNewIngredientName(searchQuery.trim())
    setAddPhase("details")
    setFormError(null)
  }

  async function submitDetails() {
    setFormError(null)
    if (!detailExpires.trim()) {
      setFormError(t("pantry.errors.validation"))
      return
    }
    setSubmitting(true)
    try {
      let payload: Record<string, unknown>
      if (addMode === "catalog" && selectedHit) {
        payload = {
          mode: "catalog",
          itemKind: selectedHit.kind,
          catalogId: selectedHit.id,
          storageLocation: detailStorage,
          quantity: detailQuantity,
          expiresOn: detailExpires,
        }
      } else if (addMode === "custom") {
        payload = {
          mode: "custom",
          customLabel,
          storageLocation: detailStorage,
          quantity: detailQuantity,
          expiresOn: detailExpires,
        }
      } else if (addMode === "newIngredient") {
        payload = {
          mode: "newIngredient",
          ingredientName: newIngredientName,
          storageLocation: detailStorage,
          quantity: detailQuantity,
          expiresOn: detailExpires,
        }
      } else {
        setFormError(t("pantry.errors.generic"))
        return
      }

      const result = await addPantryInventoryLine(payload)
      if (!result.ok) {
        setFormError(
          result.reason === "validation" ? t("pantry.errors.validation") : t("pantry.errors.generic"),
        )
        return
      }
      closeAddDialog()
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(rowId: number) {
    const result = await removePantryInventoryLine(rowId)
    if (result.ok) router.refresh()
  }

  const trimmedSearch = searchQuery.trim()
  const showNoResultsActions = addPhase === "search" && trimmedSearch.length > 0 && !searching && searchHits.length === 0

  const catalogIngredientHits = useMemo(
    () => searchHits.filter((hit) => hit.kind === "ingredient"),
    [searchHits],
  )
  const catalogMealHits = useMemo(() => searchHits.filter((hit) => hit.kind === "meal"), [searchHits])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("pantry.filterAria")}>
          <Button
            type="button"
            size="sm"
            variant={locationFilter === "all" ? "secondary" : "outline"}
            onClick={() => setLocationFilter("all")}
          >
            {t("pantry.filterAll")}
          </Button>
          {STORAGE_LOCATIONS.map((location) => (
            <Button
              key={location}
              type="button"
              size="sm"
              variant={locationFilter === location ? "secondary" : "outline"}
              onClick={() => setLocationFilter(location)}
            >
              {t(`pantry.storage.${location}`)}
            </Button>
          ))}
        </div>
        <Button type="button" onClick={openAddDialog}>
          <IconPlus className="size-4" aria-hidden />
          {t("pantry.add")}
        </Button>
      </div>

      {filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("pantry.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2 rounded-md border border-border divide-y divide-border">
          {filteredRows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{row.displayName}</div>
                <div className="text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                  <span>{t(`pantry.kind.${row.itemKind}`)}</span>
                  <span aria-hidden>·</span>
                  <span>{t(`pantry.storage.${row.storageLocation}`)}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {t("pantry.quantityLabel")}: {row.quantity}
                  </span>
                  {row.expiresOn ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        {t("pantry.expiresLabel")}: {row.expiresOn}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={t("pantry.removeAria", { name: row.displayName })}
                onClick={() => void handleRemove(row.id)}
              >
                <IconTrash className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAddDialog()
          }}
        >
          <div
            className="flex w-full max-w-2xl min-h-[500px] max-h-[min(90vh,640px)] flex-col overflow-hidden rounded-lg border border-border bg-background p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pantry-add-title"
          >
            <h2 id="pantry-add-title" className="mb-4 shrink-0 font-heading text-base font-semibold">
              {t("pantry.addDialogTitle")}
            </h2>

            {addPhase === "search" ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <FieldGroup className="min-h-0 flex-1 gap-4 overflow-y-auto">
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pantry-search">{t("pantry.searchLabel")}</FieldLabel>
                    <Input
                      id="pantry-search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={t("pantry.searchPlaceholder")}
                      autoComplete="off"
                      autoFocus
                    />
                  </Field>
                  {searching ? (
                    <p className="text-sm text-muted-foreground">{t("pantry.searching")}</p>
                  ) : null}
                  {!searching && searchHits.length > 0 ? (
                    <div className="rounded-md border border-border max-h-72 overflow-y-auto">
                      <div className="grid grid-cols-2 divide-x divide-border">
                        <div className="flex min-h-0 min-w-0 flex-col gap-1 p-2">
                          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {t("pantry.kind.ingredient")}
                          </p>
                          <ul className="flex flex-col gap-0.5">
                            {catalogIngredientHits.map((hit) => (
                              <li key={`${hit.kind}-${hit.id}`}>
                                <button
                                  type="button"
                                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => selectCatalogHit(hit)}
                                >
                                  <span className="font-medium">{hit.name}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex min-h-0 min-w-0 flex-col gap-1 p-2">
                          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {t("pantry.kind.meal")}
                          </p>
                          <ul className="flex flex-col gap-0.5">
                            {catalogMealHits.map((hit) => (
                              <li key={`${hit.kind}-${hit.id}`}>
                                <button
                                  type="button"
                                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => selectCatalogHit(hit)}
                                >
                                  <span className="font-medium">{hit.name}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {showNoResultsActions ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground">{t("pantry.noResults")}</p>
                      <Button type="button" variant="outline" onClick={goToNewIngredientFromSearch}>
                        {t("pantry.createIngredient")}
                      </Button>
                      <Button type="button" variant="outline" onClick={goToCustomFromSearch}>
                        {t("pantry.saveCustomOnly")}
                      </Button>
                    </div>
                  ) : null}
                </FieldGroup>
                <div className="flex shrink-0 justify-end gap-2 border-t border-border pt-4">
                  <Button type="button" variant="ghost" onClick={closeAddDialog}>
                    {t("pantry.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <FieldGroup className="min-h-0 flex-1 gap-4 overflow-y-auto">
                  {addMode === "catalog" && selectedHit ? (
                    <button
                      type="button"
                      className="grid w-full cursor-pointer grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-md border border-transparent px-2 py-2 text-left text-sm transition-colors hover:border-border hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                      onClick={() => {
                        setAddPhase("search")
                        setFormError(null)
                      }}
                      aria-label={t("pantry.changeCatalogSelectionAria")}
                    >
                      <span className="min-w-0 font-medium">{selectedHit.name}</span>
                      <span className="text-right text-muted-foreground">
                        {t(`pantry.kind.${selectedHit.kind === "ingredient" ? "ingredient" : "meal"}`)}
                      </span>
                    </button>
                  ) : null}
                  {addMode === "custom" ? (
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="pantry-custom-label">{t("pantry.customLabel")}</FieldLabel>
                      <Input
                        id="pantry-custom-label"
                        value={customLabel}
                        onChange={(event) => setCustomLabel(event.target.value)}
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">{t("pantry.customHint")}</p>
                    </Field>
                  ) : null}
                  {addMode === "newIngredient" ? (
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="pantry-new-ingredient">{t("pantry.newIngredientName")}</FieldLabel>
                      <Input
                        id="pantry-new-ingredient"
                        value={newIngredientName}
                        onChange={(event) => setNewIngredientName(event.target.value)}
                        autoComplete="off"
                      />
                    </Field>
                  ) : null}

                  <Field className="gap-1.5">
                    <FieldLabel>{t("pantry.storageLabel")}</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {STORAGE_LOCATIONS.map((location) => (
                        <Button
                          key={location}
                          type="button"
                          size="sm"
                          variant={detailStorage === location ? "secondary" : "outline"}
                          onClick={() => setDetailStorage(location)}
                        >
                          {t(`pantry.storage.${location}`)}
                        </Button>
                      ))}
                    </div>
                  </Field>

                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pantry-qty">{t("pantry.quantityField")}</FieldLabel>
                    <Input
                      id="pantry-qty"
                      type="number"
                      inputMode="decimal"
                      min={0.0001}
                      step="any"
                      value={detailQuantity}
                      onChange={(event) => setDetailQuantity(event.target.value)}
                    />
                  </Field>

                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pantry-exp">{t("pantry.expiresField")}</FieldLabel>
                    <Input
                      id="pantry-exp"
                      type="date"
                      required
                      value={detailExpires}
                      onChange={(event) => setDetailExpires(event.target.value)}
                    />
                  </Field>

                  {formError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {formError}
                    </p>
                  ) : null}
                </FieldGroup>
                <div
                  className={
                    addMode === "catalog"
                      ? "flex shrink-0 flex-wrap justify-end gap-2 border-t border-border pt-4"
                      : "flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-4"
                  }
                >
                  {addMode !== "catalog" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setAddPhase("search")
                        setFormError(null)
                      }}
                    >
                      {t("pantry.backToSearch")}
                    </Button>
                  ) : null}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={closeAddDialog}>
                      {t("pantry.cancel")}
                    </Button>
                    <Button type="button" disabled={submitting} onClick={() => void submitDetails()}>
                      {submitting ? t("pantry.saving") : t("pantry.confirmAdd")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
