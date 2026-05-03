"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import {
  addPantryInventoryLine,
  mealShortestShelfLifeExpiryDaysAction,
  removePantryInventoryLine,
  searchPantryCatalogAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input, inputVariants } from "@/components/ui/input";
import { cn } from "@/lib/helpers/utils";
import type { PantryCatalogHit, PantryInventoryRow, PantryStorageLocation } from "@/lib/models/pantry-inventory";
import {
  expirationDaysOffsetForShelfLifePreset,
  INGREDIENT_SHELF_LIFE_PRESETS,
  type IngredientShelfLifePreset,
} from "@/lib/models/ingredient";

type LocationFilter = "all" | PantryStorageLocation;

const STORAGE_LOCATIONS: readonly PantryStorageLocation[] = ["fridge", "pantry", "storage", "freezer"] as const;

type PantryExpiryQuickOption = { kind: "today" } | { kind: "preset"; preset: IngredientShelfLifePreset };

const PANTRY_EXPIRY_QUICK_OPTIONS: readonly PantryExpiryQuickOption[] = [
  { kind: "today" },
  ...INGREDIENT_SHELF_LIFE_PRESETS.map((preset) => ({ kind: "preset" as const, preset })),
];

function formatLocalCalendarDateForDateInput(calendarDate: Date): string {
  const year = calendarDate.getFullYear();
  const month = String(calendarDate.getMonth() + 1).padStart(2, "0");
  const day = String(calendarDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localCalendarDateWithDaysFromToday(daysFromToday: number): string {
  const today = new Date();
  const shifted = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysFromToday);
  return formatLocalCalendarDateForDateInput(shifted);
}

function parseIsoLocalDate(value: string): { year: number; monthIndex: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const dayNum = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(dayNum)) return null;
  const date = new Date(year, month - 1, dayNum);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== dayNum) return null;
  return { year, monthIndex: month - 1, day: dayNum };
}

/** Whole calendar days from local today to yyyy-mm-dd (negative = past). */
function calendarDayDiffFromToday(yyyyMmDd: string): number | null {
  const parsed = parseIsoLocalDate(yyyyMmDd);
  if (!parsed) return null;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const targetMidnight = new Date(parsed.year, parsed.monthIndex, parsed.day).getTime();
  return Math.round((targetMidnight - todayMidnight) / 86400000);
}

function formatMediumIsoLocalDate(yyyyMmDd: string, locale: string): string | null {
  const parsed = parseIsoLocalDate(yyyyMmDd);
  if (!parsed) return null;
  const date = new Date(parsed.year, parsed.monthIndex, parsed.day);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function pantryExpiryRelativeLabel(t: TFunction<"translation">, dayDiff: number): string {
  if (dayDiff === 0) return t("pantry.expiresRelativeToday");
  if (dayDiff === 1) return t("pantry.expiresRelativeTomorrow");
  if (dayDiff === -1) return t("pantry.expiresRelativeYesterday");
  if (dayDiff > 1) return t("pantry.expiresRelativeInDays", { count: dayDiff });
  return t("pantry.expiresRelativeDaysAgo", { count: -dayDiff });
}

type AddPhase = "search" | "details";
type Props = { initialRows: PantryInventoryRow[] };

function rowsSignature(rows: PantryInventoryRow[]): string {
  return JSON.stringify(rows.map((row) => [row.id, row.storageLocation, row.itemKind, row.ingredientId, row.recipeId, row.customLabel, row.quantity, row.expiresOn]));
}

export function PantryBoard({ initialRows }: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [rows, setRows] = useState<PantryInventoryRow[]>(initialRows);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [addPhase, setAddPhase] = useState<AddPhase>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<PantryCatalogHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedHit, setSelectedHit] = useState<PantryCatalogHit | null>(null);
  const [addMode, setAddMode] = useState<"catalog" | "custom" | "newIngredient">("catalog");
  const [customLabel, setCustomLabel] = useState("");
  const [newIngredientName, setNewIngredientName] = useState("");
  const [detailStorage, setDetailStorage] = useState<PantryStorageLocation>("fridge");
  const [detailQuantity, setDetailQuantity] = useState("");
  const [detailExpires, setDetailExpires] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const lastServerRowsSignatureRef = useRef(rowsSignature(initialRows));
  const mealExpiryLoadGenerationReference = useRef(0);
  const expiryDateInputReference = useRef<HTMLInputElement | null>(null);

  const activateExpiryDatePicker = useCallback(() => {
    const input = expiryDateInputReference.current;
    if (!input) return;
    try {
      const showPicker = input.showPicker;
      if (typeof showPicker === "function") showPicker.call(input);
      else input.focus();
    } catch {
      input.focus();
    }
  }, []);

  useLayoutEffect(() => {
    const nextSignature = rowsSignature(initialRows);
    if (nextSignature === lastServerRowsSignatureRef.current) return;

    lastServerRowsSignatureRef.current = nextSignature;
    setRows(initialRows);
  }, [initialRows]);

  const filteredRows = useMemo(() => {
    if (locationFilter === "all") return rows;

    return rows.filter((row) => row.storageLocation === locationFilter);
  }, [rows, locationFilter]);

  const expiryDateFieldSummary = useMemo(() => {
    const trimmed = detailExpires.trim();
    if (trimmed === "") return null;
    const dayDiff = calendarDayDiffFromToday(trimmed);
    const formattedDate = formatMediumIsoLocalDate(trimmed, i18n.language);
    if (dayDiff === null || formattedDate === null) return null;
    return { formattedDate, relativeLabel: pantryExpiryRelativeLabel(t, dayDiff) };
  }, [detailExpires, i18n.language, t]);

  const runSearch = useCallback(async (query: string) => {
    setSearching(true);
    setFormError(null);
    try {
      const result = await searchPantryCatalogAction(query);
      if (result.ok) {
        setSearchHits(result.hits);
      } else {
        setSearchHits([]);
      }
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!addOpen || addPhase !== "search") return;

    const trimmedSearchQuery = searchQuery.trim();
    if (trimmedSearchQuery.length === 0) {
      setSearchHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      void runSearch(trimmedSearchQuery);
    }, 280);
    return () => clearTimeout(handle);
  }, [addOpen, addPhase, searchQuery, runSearch]);

  function openAddDialog() {
    setAddOpen(true);
    setAddPhase("search");
    setSearchQuery("");
    setSearchHits([]);
    setSelectedHit(null);
    setAddMode("catalog");
    setCustomLabel("");
    setNewIngredientName("");
    setDetailStorage("fridge");
    setDetailQuantity("");
    setDetailExpires("");
    setFormError(null);
  }

  function closeAddDialog() {
    setAddOpen(false);
  }

  async function selectCatalogHit(hit: PantryCatalogHit) {
    const loadGeneration = (mealExpiryLoadGenerationReference.current += 1);
    setSelectedHit(hit);
    setAddMode("catalog");
    setAddPhase("details");
    setFormError(null);
    if (hit.kind === "ingredient") {
      const daysFromToday = expirationDaysOffsetForShelfLifePreset(hit.shelfLifePreset);
      setDetailExpires(localCalendarDateWithDaysFromToday(daysFromToday));
      return;
    }
    setDetailExpires("");
    const result = await mealShortestShelfLifeExpiryDaysAction(hit.id);
    if (loadGeneration !== mealExpiryLoadGenerationReference.current) return;
    if (result.ok && result.daysFromToday !== null) {
      setDetailExpires(localCalendarDateWithDaysFromToday(result.daysFromToday));
    }
  }

  function goToCustomFromSearch() {
    setSelectedHit(null);
    setAddMode("custom");
    setCustomLabel(searchQuery.trim());
    setAddPhase("details");
    setFormError(null);
  }

  function goToNewIngredientFromSearch() {
    setSelectedHit(null);
    setAddMode("newIngredient");
    setNewIngredientName(searchQuery.trim());
    setAddPhase("details");
    setFormError(null);
  }

  async function submitDetails() {
    setFormError(null);
    setSubmitting(true);
    try {
      let payload: Record<string, unknown>;
      if (addMode === "catalog" && selectedHit) {
        payload = {
          mode: "catalog",
          itemKind: selectedHit.kind,
          catalogId: selectedHit.id,
          storageLocation: detailStorage,
          quantity: detailQuantity,
          expiresOn: detailExpires,
        };
      } else if (addMode === "custom") {
        payload = {
          mode: "custom",
          customLabel,
          storageLocation: detailStorage,
          quantity: detailQuantity,
          expiresOn: detailExpires,
        };
      } else if (addMode === "newIngredient") {
        payload = {
          mode: "newIngredient",
          ingredientName: newIngredientName,
          storageLocation: detailStorage,
          quantity: detailQuantity,
          expiresOn: detailExpires,
        };
      } else {
        setFormError(t("pantry.errors.generic"));
        return;
      }

      const result = await addPantryInventoryLine(payload);
      if (!result.ok) {
        setFormError(result.reason === "validation" ? t("pantry.errors.validation") : t("pantry.errors.generic"));
        return;
      }
      closeAddDialog();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(rowId: number) {
    const result = await removePantryInventoryLine(rowId);
    if (result.ok) router.refresh();
  }

  const trimmedSearch = searchQuery.trim();
  const showNoResultsActions = addPhase === "search" && trimmedSearch.length > 0 && !searching && searchHits.length === 0;

  const catalogIngredientHits = useMemo(() => searchHits.filter((hit) => hit.kind === "ingredient"), [searchHits]);
  const catalogMealHits = useMemo(() => searchHits.filter((hit) => hit.kind === "meal"), [searchHits]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("pantry.filterAria")}>
          <Button type="button" size="sm" variant={locationFilter === "all" ? "secondary" : "outline"} onClick={() => setLocationFilter("all")}>
            {t("pantry.filterAll")}
          </Button>
          {STORAGE_LOCATIONS.map((location) => (
            <Button key={location} type="button" size="sm" variant={locationFilter === location ? "secondary" : "outline"} onClick={() => setLocationFilter(location)}>
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
        <ul className="flex flex-col gap-2 divide-y divide-border rounded-md border border-border">
          {filteredRows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{row.displayName}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-muted-foreground">
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
              <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground hover:text-destructive" aria-label={t("pantry.removeAria", { name: row.displayName })} onClick={() => void handleRemove(row.id)}>
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
            if (event.target === event.currentTarget) closeAddDialog();
          }}
        >
          <div className="flex max-h-[min(90vh,640px)] min-h-[500px] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-background p-4 shadow-lg" role="dialog" aria-modal="true" aria-labelledby="pantry-add-title">
            <h2 id="pantry-add-title" className="mb-4 shrink-0 font-heading text-base font-semibold">
              {t("pantry.addDialogTitle")}
            </h2>

            {addPhase === "search" ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <FieldGroup className="min-h-0 flex-1 gap-4 overflow-y-auto">
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pantry-search">{t("pantry.searchLabel")}</FieldLabel>
                    <Input id="pantry-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t("pantry.searchPlaceholder")} autoComplete="off" autoFocus />
                  </Field>
                  {searching ? <p className="text-sm text-muted-foreground">{t("pantry.searching")}</p> : null}
                  {!searching && searchHits.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                      <div className="grid grid-cols-2 divide-x divide-border">
                        <div className="flex min-h-0 min-w-0 flex-col gap-1 p-2">
                          <p className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("pantry.kind.ingredient")}</p>
                          <ul className="flex flex-col gap-0.5">
                            {catalogIngredientHits.map((hit) => (
                              <li key={`${hit.kind}-${hit.id}`}>
                                <button type="button" className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted" onClick={() => void selectCatalogHit(hit)}>
                                  <span className="font-medium">{hit.name}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex min-h-0 min-w-0 flex-col gap-1 p-2">
                          <p className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("pantry.kind.meal")}</p>
                          <ul className="flex flex-col gap-0.5">
                            {catalogMealHits.map((hit) => (
                              <li key={`${hit.kind}-${hit.id}`}>
                                <button type="button" className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted" onClick={() => void selectCatalogHit(hit)}>
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
                <FieldGroup className="min-h-0 flex-1 gap-6 overflow-y-auto">
                  {addMode === "catalog" && selectedHit ? (
                    <button
                      type="button"
                      className="grid w-full cursor-pointer grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-md border border-transparent px-2 py-2 text-left text-sm transition-colors hover:border-border hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                      onClick={() => {
                        setAddPhase("search");
                        setFormError(null);
                      }}
                      aria-label={t("pantry.changeCatalogSelectionAria")}
                    >
                      <span className="min-w-0 font-medium">{selectedHit.name}</span>
                      <span className="text-right text-muted-foreground">{t(`pantry.kind.${selectedHit.kind === "ingredient" ? "ingredient" : "meal"}`)}</span>
                    </button>
                  ) : null}
                  {addMode === "custom" ? (
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="pantry-custom-label">{t("pantry.customLabel")}</FieldLabel>
                      <Input id="pantry-custom-label" value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} autoComplete="off" />
                      <p className="text-xs text-muted-foreground">{t("pantry.customHint")}</p>
                    </Field>
                  ) : null}
                  {addMode === "newIngredient" ? (
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="pantry-new-ingredient">{t("pantry.newIngredientName")}</FieldLabel>
                      <Input id="pantry-new-ingredient" value={newIngredientName} onChange={(event) => setNewIngredientName(event.target.value)} autoComplete="off" />
                    </Field>
                  ) : null}

                  <Field className="gap-1.5">
                    <FieldLabel>{t("pantry.storageLabel")}</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {STORAGE_LOCATIONS.map((location) => (
                        <Button key={location} type="button" size="sm" variant={detailStorage === location ? "secondary" : "outline"} onClick={() => setDetailStorage(location)}>
                          {t(`pantry.storage.${location}`)}
                        </Button>
                      ))}
                    </div>
                  </Field>

                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pantry-exp">{t("pantry.expiresField")}</FieldLabel>
                    <div className="flex min-w-0 flex-col gap-2">
                      <div
                        role="presentation"
                        className={cn(
                          inputVariants({ variant: "default" }),
                          "relative flex min-h-9 h-auto w-full min-w-0 cursor-pointer items-center py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:focus-within:border-ring dark:focus-within:ring-ring/50",
                        )}
                        onClick={activateExpiryDatePicker}
                      >
                        <div className="relative z-0 flex min-h-9 w-full min-w-0 flex-wrap items-center gap-x-1 text-base md:text-sm">
                          {expiryDateFieldSummary ? (
                            <>
                              <span className="text-foreground">{expiryDateFieldSummary.relativeLabel}</span>
                              <span className="text-muted-foreground" aria-hidden>
                                ·
                              </span>
                              <span className="text-muted-foreground">{expiryDateFieldSummary.formattedDate}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">{t("pantry.expiresDatePlaceholder")}</span>
                          )}
                        </div>
                        <input
                          ref={expiryDateInputReference}
                          id="pantry-exp"
                          type="date"
                          value={detailExpires}
                          onChange={(event) => setDetailExpires(event.target.value)}
                          className="sr-only [color-scheme:inherit]"
                        />
                      </div>
                      <div className="flex min-h-0 min-w-0 w-full flex-wrap content-start gap-2">
                        {PANTRY_EXPIRY_QUICK_OPTIONS.map((option) => {
                          const daysFromToday =
                            option.kind === "today" ? 0 : expirationDaysOffsetForShelfLifePreset(option.preset);
                          const presetDate = localCalendarDateWithDaysFromToday(daysFromToday);
                          const label =
                            option.kind === "today"
                              ? t("pantry.expiresPresetToday")
                              : t(`ingredients.shelfLife.${option.preset}`);
                          return (
                            <Button
                              key={option.kind === "today" ? "today" : option.preset}
                              type="button"
                              size="sm"
                              variant={detailExpires === presetDate ? "secondary" : "outline"}
                              onClick={() => setDetailExpires(presetDate)}
                            >
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </Field>

                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="pantry-qty">{t("pantry.quantityField")}</FieldLabel>
                    <Input id="pantry-qty" type="number" inputMode="decimal" min={0.0001} step="any" value={detailQuantity} onChange={(event) => setDetailQuantity(event.target.value)} />
                  </Field>

                  {formError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {formError}
                    </p>
                  ) : null}
                </FieldGroup>
                <div className={addMode === "catalog" ? "flex shrink-0 flex-wrap justify-end gap-2 border-t border-border pt-4" : "flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-4"}>
                  {addMode !== "catalog" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setAddPhase("search");
                        setFormError(null);
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
  );
}
