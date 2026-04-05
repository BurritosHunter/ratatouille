"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

export type UndoDeleteToastProps = {
  /** Numeric id from the URL (e.g. search param); when set, shows toast once and clears the param. */
  deletedId?: number
  /** Path to `router.replace` after reading the param (no query string). */
  replacePath: string
  /** Short scope string so sessionStorage and toast ids don’t collide across features (e.g. `recipe`). */
  scope: string
  message: string
  onUndo: (id: number) => Promise<void>
  undoLabel?: string
  restoredMessage?: string
}

export function UndoDeleteToast({
  deletedId,
  replacePath,
  scope,
  message,
  onUndo,
  undoLabel = "Undo",
  restoredMessage = "Restored",
}: UndoDeleteToastProps) {
  const router = useRouter()
  const handledRef = useRef(false)

  useEffect(() => {
    if (deletedId == null || handledRef.current) return

    const dedupeKey = `undo-delete-toast-${scope}-${deletedId}`
    if (typeof window !== "undefined" && sessionStorage.getItem(dedupeKey)) {
      router.replace(replacePath, { scroll: false })
      return
    }

    if (typeof window !== "undefined") sessionStorage.setItem(dedupeKey, "1")

    handledRef.current = true
    router.replace(replacePath, { scroll: false })

    const clearDedupe = () => {
      if (typeof window !== "undefined") sessionStorage.removeItem(dedupeKey)
    }

    toast(message, {
      id: `undo-delete-${scope}-${deletedId}`,
      duration: 8000,
      onDismiss: clearDedupe,
      onAutoClose: clearDedupe,
      action: {
        label: undoLabel,
        onClick: () => {
          clearDedupe()
          void onUndo(deletedId).then(() => {
            router.refresh()
            toast.success(restoredMessage, { id: `undo-restored-${scope}-${deletedId}` })
          })
        },
      },
    })
  }, [deletedId, message, onUndo, replacePath, restoredMessage, router, scope, undoLabel])

  return null
}
