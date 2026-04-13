"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { IconMinus, IconPlus } from "@tabler/icons-react"

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

export type SearchableMultiSelectProps = {
  options: SearchableMultiSelectOption[]
  value: string[]
  onChange: (nextValues: string[]) => void
  /** Trigger copy when nothing is selected. */
  placeholder?: string
  searchPlaceholder?: string
  /** Heading for the searchable list of items not yet selected. */
  sectionLabelAvailable?: string
  /** Heading for the list of selected items. */
  sectionLabelSelected?: string
  /** Shown when search matches nothing in the available list. */
  emptyMessage?: string
  /**
   * When set, an outline **Create** control is shown if the search is non-empty and
   * the available list is empty. Receives the trimmed search string as the new option name.
   */
  onCreateOption?: (name: string) => void | Promise<void>
  ariaLabel?: string
  className?: string
  disabled?: boolean
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
        : `${value.length} selected`

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
  /** Hide "Select more" while search has no matching available rows (empty / create-only view). */
  const showSelectedSection =
    selectedOptions.length > 0 &&
    !(isSearching && filteredAvailable.length === 0)
  const showAvailableSection =
    !isSearching ||
    filteredAvailable.length > 0 ||
    showCreateOption
  const showSearchFallback =
    isSearching && !showSelectedSection && !showAvailableSection
  /** Hide "Select option" heading when search has no matching rows (create-only or empty). */
  const showAvailableSectionHeading =
    !isSearching || filteredAvailable.length > 0

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
