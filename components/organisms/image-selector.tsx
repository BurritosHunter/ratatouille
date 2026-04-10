"use client"

import { useRef, useState } from "react"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/helpers/utils"

const defaultFileInputName = "main_image"
const defaultUrlInputName = "main_image_url"
const defaultRemoveInputName = "remove_main_image"
const fileAccept = "image/jpeg,image/png,image/webp,image/gif"
const previewZoneTitleClassName = "max-w-full rounded bg-background/90 px-2 py-1.5 text-center text-xs font-medium leading-tight text-foreground shadow-sm backdrop-blur-sm"

type ImageSelectorProps = {
  previewSrc: string | null
  defaultImageUrl: string
  fileInputName?: string
  urlInputName?: string
  removeInputName?: string
  selectorLabel?: string
  emptyPreviewText?: string
  replaceFileLabel?: string
  fileHelpText?: string
  removeCheckboxLabel?: string
  uploadZoneLabel?: string
  urlShowZoneLabel?: string
}

export function ImageSelector({
  previewSrc,
  defaultImageUrl,
  fileInputName = defaultFileInputName,
  urlInputName = defaultUrlInputName,
  removeInputName = defaultRemoveInputName,
  selectorLabel = "Current image",
  emptyPreviewText = "No image yet.",
  replaceFileLabel = "Replace with file",
  fileHelpText = "JPEG, PNG, WebP, or GIF, up to 2MB.",
  removeCheckboxLabel = "Remove image completely",
  uploadZoneLabel = "Replace image with a new file",
  urlShowZoneLabel = "Replace image with URL",
}: ImageSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [urlFieldVisible, setUrlFieldVisible] = useState(() => Boolean(defaultImageUrl.trim()))

  function onUploadZoneClick() {
    fileInputRef.current?.click()
  }

  function onUrlShowZoneClick() {
    setUrlFieldVisible(true)
  }

  return (
    <>
      <Field>
        <FieldLabel>{selectorLabel}</FieldLabel>
        {previewSrc ? (
          <div className="relative w-full max-h-40 overflow-hidden rounded-md border aspect-video">
            <img
              src={previewSrc}
              alt=""
              className="pointer-events-none h-full w-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 z-10 flex">
              <button
                type="button"
                className="flex h-full w-1/2 cursor-pointer flex-col items-center justify-end rounded-l-md p-1.5 hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={onUploadZoneClick}
              >
                <span className={previewZoneTitleClassName}>{uploadZoneLabel}</span>
              </button>
              <button
                type="button"
                className="flex h-full w-1/2 cursor-pointer flex-col items-center justify-end rounded-r-md p-1.5 hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-controls={urlInputName}
                onClick={onUrlShowZoneClick}
              >
                <span className={previewZoneTitleClassName}>{urlShowZoneLabel}</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              id={fileInputName}
              name={fileInputName}
              type="file"
              accept={fileAccept}
              tabIndex={-1}
              className="sr-only"
              aria-hidden
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyPreviewText}</p>
        )}
      </Field>

      {!previewSrc ? (
        <Field>
          <FieldLabel htmlFor={fileInputName}>{replaceFileLabel}</FieldLabel>
          <Input id={fileInputName} name={fileInputName} type="file" accept={fileAccept} />
          <p className="text-sm text-muted-foreground">{fileHelpText}</p>
        </Field>
      ) : (
        <p className="text-sm text-muted-foreground">{fileHelpText}</p>
      )}

      <Field className={cn(previewSrc && !urlFieldVisible && "hidden")}>
        <FieldLabel htmlFor={urlInputName} className="sr-only">
          Image URL
        </FieldLabel>
        <Input
          id={urlInputName}
          name={urlInputName}
          type="url"
          inputMode="url"
          placeholder="https://…"
          defaultValue={defaultImageUrl}
        />
      </Field>
      <Field orientation="horizontal" className="items-center gap-2">
        <input
          id={removeInputName}
          name={removeInputName}
          type="checkbox"
          value="1"
          className="size-4 rounded border-input"
        />
        <FieldLabel htmlFor={removeInputName} className="cursor-pointer font-normal">
          {removeCheckboxLabel}
        </FieldLabel>
      </Field>
    </>
  )
}
