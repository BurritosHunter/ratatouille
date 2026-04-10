"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/helpers/utils"

export type EditableTextProps = {
  value: string
  onCommit: (nextValue: string) => void
  onCancel?: () => void
  placeholder?: string
  disabled?: boolean
  /** Shown when `value` is empty in display mode. */
  emptyLabel?: string
  /** Accessible name for the control that enters edit mode (e.g. recipe title). */
  editLabel?: string
  className?: string
  displayClassName?: string
  inputClassName?: string
}

export function EditableText({
  value,
  onCommit,
  onCancel,
  placeholder,
  disabled = false,
  emptyLabel = "—",
  editLabel = "Edit text",
  className,
  displayClassName,
  inputClassName,
}: EditableTextProps) {
  const baseId = useId()
  const inputReference = useRef<HTMLInputElement>(null)
  /** Avoids firing `onCommit` twice when Enter triggers both keydown and blur. */
  const commitFromKeyboardReference = useRef(false)
  /** Avoids committing when Escape dismisses the input (blur still runs). */
  const cancelFromKeyboardReference = useRef(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!isEditing) setDraft(value)
  }, [value, isEditing])

  const enterEdit = useCallback(() => {
    if (disabled) return
    setDraft(value)
    setIsEditing(true)
  }, [disabled, value])

  useEffect(() => {
    if (!isEditing) return
    const input = inputReference.current
    if (!input) return
    input.focus()
    input.select()
  }, [isEditing])

  const commit = useCallback(() => {
    setIsEditing(false)
    onCommit(draft.trim())
  }, [draft, onCommit])

  const handleBlur = useCallback(() => {
    if (commitFromKeyboardReference.current) {
      commitFromKeyboardReference.current = false
      return
    }
    if (cancelFromKeyboardReference.current) {
      cancelFromKeyboardReference.current = false
      return
    }
    commit()
  }, [commit])

  const cancel = useCallback(() => {
    cancelFromKeyboardReference.current = true
    setDraft(value)
    setIsEditing(false)
    onCancel?.()
  }, [onCancel, value])

  if (isEditing) {
    return (
      <Input
        ref={inputReference}
        id={`${baseId}-input`}
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={editLabel}
        className={cn("h-auto min-h-9 py-1", className, inputClassName)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            commitFromKeyboardReference.current = true
            commit()
          }
          if (event.key === "Escape") {
            event.preventDefault()
            cancel()
          }
        }}
      />
    )
  }

  const displayText = value.trim() === "" ? emptyLabel : value

  return (
    <button
      type="button"
      id={`${baseId}-display`}
      disabled={disabled}
      aria-label={editLabel}
      className={cn(
        "inline-flex max-w-full min-w-0 cursor-text rounded-md px-1.5 py-0.5 text-left text-base outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
        value.trim() === "" && "text-muted-foreground",
        className,
        displayClassName
      )}
      onClick={enterEdit}
    >
      <span className="min-w-0 truncate">{displayText}</span>
    </button>
  )
}
