"use client"

import { IconLink, IconTrash, IconUpload } from "@tabler/icons-react"
import { useEffect, useRef, useState } from "react"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/helpers/utils"

const fileAccept = "image/jpeg,image/png,image/webp,image/gif"
const previewZoneIconClassName = "size-8 shrink-0 text-foreground"
const previewZoneTitleClassName = "flex flex-col flex-1 justify-start gap-3 rounded bg-background/60 p-4 text-left text-base font-semibold transition-colors duration-150 group-hover:bg-background/86 group-focus-within:bg-background/86"
const previewZoneGrowSectionClassName = "group flex flex-col h-full min-w-0 flex-1 cursor-pointer items-stretch justify-stretch p-1.5 rounded-md focus-visible:outline-none "
const previewZoneDeleteSectionClassName = "group flex flex-col h-full w-fit shrink-0 cursor-pointer items-stretch justify-stretch p-1.5 rounded-md focus-visible:outline-none"
const removeImageActionLabel = "Remove image completely"
const uploadZoneLabelAdd = "Add image with a file"
const urlShowZoneLabelAdd = "Add image with URL"
const fileFormatHelpText = "JPEG, PNG, or GIF\n(up to 2MB)"

type ImageSelectorProps = {
  previewSrc: string | null
  defaultImageUrl: string
  fileInputName?: string
  urlInputName?: string
  removeInputName?: string
  selectorLabel?: string
  uploadZoneLabel?: string
  urlShowZoneLabel?: string
}

export function ImageSelector({
  previewSrc,
  defaultImageUrl,
  fileInputName = "main_image",
  urlInputName = "main_image_url",
  removeInputName = "remove_main_image",
  selectorLabel = "Current image",
  uploadZoneLabel = "Replace image with a file",
  urlShowZoneLabel = "Replace image with URL",
}: ImageSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [removeImageRequested, setRemoveImageRequested] = useState(false)

  useEffect(() => {
    if (!previewSrc) setRemoveImageRequested(false)
  }, [previewSrc])

  function onUploadZoneClick() {
    fileInputRef.current?.click()
  }

  return (
    <>
      <Field>
        <FieldLabel>{selectorLabel}</FieldLabel>
        <div className="relative w-full max-h-40 overflow-hidden rounded-md border aspect-video">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt=""
              className="pointer-events-none h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="pointer-events-none h-full w-full bg-muted" aria-hidden />
          )}
          <div className="absolute inset-0 z-10 flex min-h-0">
            <button
              type="button"
              className={previewZoneGrowSectionClassName}
              onClick={onUploadZoneClick}
            >
              <span className={previewZoneTitleClassName}>
                <IconUpload className={previewZoneIconClassName} aria-hidden />
                <span>
                  <span>{previewSrc ? uploadZoneLabel : uploadZoneLabelAdd}</span>
                  <p className="whitespace-pre-line text-sm font-normal text-muted-foreground">{fileFormatHelpText}</p>
                </span>
              </span>
            </button>
            <label
              className={previewZoneGrowSectionClassName}
            >
              <span className={previewZoneTitleClassName}>
                <IconLink className={previewZoneIconClassName} aria-hidden />
                <span>
                  <span>{previewSrc ? urlShowZoneLabel : urlShowZoneLabelAdd}</span>
                  <Input
                    id={urlInputName}
                    name={urlInputName}
                    type="url"
                    inputMode="url"
                    placeholder="https://…"
                    defaultValue={defaultImageUrl}
                    className={"mt-2"}
                    variant="small"
                    background="transparent"
                  />
                </span>
              </span>
            </label>
            {previewSrc ? (
              <button
                type="button"
                className={previewZoneDeleteSectionClassName}
                aria-label={removeImageActionLabel}
                aria-pressed={removeImageRequested}
                onClick={() => setRemoveImageRequested((previous) => !previous)}
              >
                <span
                  className={cn(
                    "rounded bg-background/60 p-1 transition-colors duration-150 group-hover:bg-background/86 group-focus-within:bg-background/86",
                    removeImageRequested && "bg-destructive/20 group-hover:bg-destructive/25",
                  )}
                >
                  <IconTrash
                    className={cn(
                      "size-6 shrink-0",
                      removeImageRequested ? "text-destructive" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                </span>
              </button>
            ) : null}
          </div>
          {previewSrc && removeImageRequested ? (
            <input type="hidden" name={removeInputName} value="1" />
          ) : null}
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
      </Field>
    </>
  )
}
