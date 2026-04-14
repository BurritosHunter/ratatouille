"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { IconCheck, IconMinus, IconPlus } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/helpers/utils"

export type SearchableMultiSelectOption = {
  value: string
  label: string
}

export type SearchableMultiSelectListMode =
  | "split"  /** Selected block, then remaining options (current behavior). */
  | "inline" /** One list in `options` order; selected rows show a check. */
  | "hideSelected" /** Only options not yet selected (selected values are omitted from the list). */

export type SearchableMultiSelectProps = {
  options: SearchableMultiSelectOption[]
  value: string[]
  onChange: (nextValues: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  sectionLabelAvailable?: string /** Heading for the searchable list of items not yet selected. */
  sectionLabelSelected?: string /** Heading for the list of selected items. */
  emptyMessage?: string /** Shown when search matches nothing in the available list. */
  /**
   * When set, an outline **Create** control is shown if the search is non-empty and
   * the available list is empty. Receives the trimmed search string as the new option name.
   */
  onCreateOption?: (name: string) => void | Promise<void>
  ariaLabel?: string
  className?: string
  disabled?: boolean
  triggerLabel?: string
  listMode?: SearchableMultiSelectListMode
}

function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase()
}

function compareOptionLabels(
  left: SearchableMultiSelectOption,
  right: SearchableMultiSelectOption,
): number {
  return left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
}

const rowButtonClassName = cn(
  "group flex h-9 w-full shrink-0 items-center gap-2 rounded-sm px-2 text-left text-sm outline-none transition-colors",
  "hover:bg-accent hover:text-accent-foreground",
  "focus-visible:bg-accent focus-visible:text-accent-foreground"
)

const iconSlotClassName = cn(
  "flex size-8 shrink-0 items-center justify-center text-muted-foreground",
  "group-hover:text-foreground"
)

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select items",
  searchPlaceholder = "Search…",
  sectionLabelAvailable = "Select option",
  sectionLabelSelected = "Select more",
  emptyMessage = "No matches.",
  onCreateOption,
  ariaLabel = "Open multi-select",
  className,
  disabled = false,
  triggerLabel: triggerLabelOverride,
  listMode = "split",
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [createPending, setCreatePending] = useState(false)
  const searchInputReference = useRef<HTMLInputElement>(null)
  /** Single scroll container for both sections (they scroll together). */
  const listScrollReference = useRef<HTMLDivElement>(null)
  /** Scroll position to restore after moving an item (avoids jump). */
  const scrollSnapshotReference = useRef<number | null>(null)

  const selectedSet = useMemo(() => new Set(value), [value])

  const optionByValue = useMemo(() => {
    const map = new Map<string, SearchableMultiSelectOption>()
    for (const option of options) {
      map.set(option.value, option)
    }
    return map
  }, [options])

  const filteredAvailable = useMemo(() => {
    const normalized = normalizeQuery(searchQuery)
    const base = options.filter((option) => !selectedSet.has(option.value))
    const filtered =
      normalized === ""
        ? base
        : base.filter((option) =>
            option.label.toLowerCase().includes(normalized)
          )
    return [...filtered].sort(compareOptionLabels)
  }, [options, searchQuery, selectedSet])

  const filteredInlineOptions = useMemo(() => {
    const normalized = normalizeQuery(searchQuery)
    if (normalized === "") return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized),
    )
  }, [options, searchQuery])

  const selectedOptions = useMemo(() => {
    const list: SearchableMultiSelectOption[] = []
    for (const id of value) {
      const found = optionByValue.get(id)
      if (found) list.push(found)
    }
    return [...list].sort(compareOptionLabels)
  }, [value, optionByValue])

  function captureScrollSnapshot() {
    scrollSnapshotReference.current = listScrollReference.current?.scrollTop ?? 0
  }

  function addValue(optionValue: string) {
    if (disabled || selectedSet.has(optionValue)) return
    captureScrollSnapshot()
    onChange([...value, optionValue])
  }

  function removeValue(optionValue: string) {
    if (disabled) return
    captureScrollSnapshot()
    onChange(value.filter((item) => item !== optionValue))
  }

  function toggleValue(optionValue: string) {
    if (disabled) return
    captureScrollSnapshot()
    if (selectedSet.has(optionValue)) {
      onChange(value.filter((item) => item !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  useLayoutEffect(() => {
    const snapshot = scrollSnapshotReference.current
    if (snapshot === null) return
    const listNode = listScrollReference.current
    if (listNode) listNode.scrollTop = snapshot
    scrollSnapshotReference.current = null
  }, [value])

  const triggerLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? options.find((option) => option.value === value[0])?.label ??
          `${value.length} selected`
        : (triggerLabelOverride ?? `${value.length} selected`)

  const availableHeadingId = "searchable-multi-select-available-heading"
  const selectedHeadingId = "searchable-multi-select-selected-heading"

  const trimmedSearch = searchQuery.trim()
  const showCreateOption =
    onCreateOption != null &&
    trimmedSearch !== "" &&
    filteredAvailable.length === 0

  async function handleCreateOption() {
    if (!onCreateOption || trimmedSearch === "" || disabled || createPending) return
    setCreatePending(true)
    try {
      await Promise.resolve(onCreateOption(trimmedSearch))
      setSearchQuery("")
    } finally {
      setCreatePending(false)
    }
  }

  const isSearching = trimmedSearch !== ""
  const isSplitStyle = listMode === "split" || listMode === "hideSelected"
  /** Hide "Select more" while search has no matching available rows (empty / create-only view). */
  const showSelectedSection =
    listMode === "split" &&
    selectedOptions.length > 0 &&
    !(isSearching && filteredAvailable.length === 0)
  const showAvailableSection =
    isSplitStyle &&
    (!isSearching ||
      filteredAvailable.length > 0 ||
      showCreateOption)
  const showSearchFallback =
    isSplitStyle &&
    isSearching &&
    !showSelectedSection &&
    !showAvailableSection
  /** Hide "Select option" heading when search has no matching rows (create-only or empty). */
  const showAvailableSectionHeading =
    !isSearching || filteredAvailable.length > 0

  const showInlineSection =
    listMode === "inline" &&
    (!isSearching ||
      filteredInlineOptions.length > 0 ||
      showCreateOption)
  const showInlineSearchFallback =
    listMode === "inline" &&
    isSearching &&
    filteredInlineOptions.length === 0 &&
    !showCreateOption
  const showInlineSectionHeading = !isSearching || filteredInlineOptions.length > 0

  return (
    <Popover
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearchQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-auto min-h-9 justify-start gap-2 px-2.5 py-1.5 font-normal",
            value.length === 0 && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          aria-label={ariaLabel}
        >
          <span className="min-w-0 flex-1 truncate text-left">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "flex h-[min(28rem,70vh)] w-[var(--radix-popover-trigger-width)] min-w-0 flex-col gap-0 overflow-hidden p-0"
        )}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          searchInputReference.current?.focus()
        }}
      >
        <div className="shrink-0 border-b border-border p-2">
          <Input
            ref={searchInputReference}
            type="search"
            value={searchQuery}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div
          ref={listScrollReference}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="flex flex-col divide-y divide-border">
            {showInlineSection ? (
              <section
                aria-labelledby={
                  showInlineSectionHeading ? availableHeadingId : undefined
                }
                aria-label={
                  showInlineSectionHeading ? undefined : sectionLabelAvailable
                }
              >
                {showInlineSectionHeading ? (
                  <h3
                    id={availableHeadingId}
                    className="sticky top-0 z-10 border-b border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {sectionLabelAvailable}
                  </h3>
                ) : null}
                <div role="listbox" aria-multiselectable className="p-1">
                  {filteredInlineOptions.length === 0 ? (
                    <div className="flex flex-col gap-2 px-2 py-3">
                      <p className="text-center text-sm text-muted-foreground">
                        {emptyMessage}
                      </p>
                      {showCreateOption ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={disabled || createPending}
                          aria-label={`Create new option ${trimmedSearch}`}
                          onClick={() => void handleCreateOption()}
                        >
                          {createPending ? "Creating…" : `Create “${trimmedSearch}”`}
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-0">
                      {filteredInlineOptions.map((option) => {
                        const isSelected = selectedSet.has(option.value)
                        return (
                          <li key={option.value} role="presentation">
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              disabled={disabled}
                              className={rowButtonClassName}
                              onClick={() => toggleValue(option.value)}
                            >
                              <span
                                className={cn(iconSlotClassName, "opacity-100")}
                                aria-hidden
                              >
                                {isSelected ? (
                                  <IconCheck className="size-4" />
                                ) : (
                                  <span className="inline-block size-4 rounded border border-border" />
                                )}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-left">
                                {option.label}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </section>
            ) : null}

            {showInlineSearchFallback ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            ) : null}

            {showSelectedSection ? (
              <section aria-labelledby={selectedHeadingId}>
                <h3
                  id={selectedHeadingId}
                  className="sticky top-0 z-10 border-b border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {sectionLabelSelected}
                </h3>
                <div role="listbox" aria-multiselectable className="p-1">
                  <ul className="flex flex-col gap-0">
                    {selectedOptions.map((option) => (
                      <li key={option.value} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected
                          disabled={disabled}
                          className={rowButtonClassName}
                          onClick={() => removeValue(option.value)}
                        >
                          <span className="min-w-0 flex-1 truncate">{option.label}</span>
                          <span
                            className={cn(
                              iconSlotClassName,
                              "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                            )}
                            aria-hidden
                          >
                            <IconMinus />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}

            {showAvailableSection ? (
              <section
                aria-labelledby={
                  showAvailableSectionHeading ? availableHeadingId : undefined
                }
                aria-label={
                  showAvailableSectionHeading ? undefined : sectionLabelAvailable
                }
              >
                {showAvailableSectionHeading ? (
                  <h3
                    id={availableHeadingId}
                    className="sticky top-0 z-10 border-b border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {sectionLabelAvailable}
                  </h3>
                ) : null}
                <div role="listbox" aria-multiselectable className="p-1">
                  {filteredAvailable.length === 0 ? (
                    <div className="flex flex-col gap-2 px-2 py-3">
                      <p className="text-center text-sm text-muted-foreground">
                        {emptyMessage}
                      </p>
                      {showCreateOption ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={disabled || createPending}
                          aria-label={`Create new option ${trimmedSearch}`}
                          onClick={() => void handleCreateOption()}
                        >
                          {createPending ? "Creating…" : `Create “${trimmedSearch}”`}
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-0">
                      {filteredAvailable.map((option) => (
                        <li key={option.value} role="presentation">
                          <button
                            type="button"
                            role="option"
                            aria-selected={false}
                            disabled={disabled}
                            className={rowButtonClassName}
                            onClick={() => addValue(option.value)}
                          >
                            <span className="min-w-0 flex-1 truncate">{option.label}</span>
                            <span
                              className={cn(
                                iconSlotClassName,
                                "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                              )}
                              aria-hidden
                            >
                              <IconPlus />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ) : null}

            {showSearchFallback ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
