"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  autosaveRecipeImage,
  autosaveRecipeIngredients,
  autosaveRecipeInstructions,
  autosaveRecipeTitle,
} from "../../actions"
import { EditableText } from "@/components/molecules/editable-text"
import { MealIngredientsEditor } from "@/app/(main)/recipes/_meal-ingredients-editor"
import type { MealIngredientEditorLine } from "@/app/(main)/recipes/_meal-ingredients-editor"
import { ImageSelector } from "@/components/organisms/image-selector"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

type EditRecipeFormProps = {
  recipeId: number
  initialTitle: string
  initialInstructions: string
  previewSrc: string | null
  defaultImageUrl: string
  catalog: { id: number; name: string }[]
  initialLines: MealIngredientEditorLine[]
}

export function EditRecipeForm({
  recipeId,
  initialTitle,
  initialInstructions,
  previewSrc,
  defaultImageUrl,
  catalog,
  initialLines,
}: EditRecipeFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [instructions, setInstructions] = useState(initialInstructions)
  const imageFormReference = useRef<HTMLFormElement>(null)
  const ingredientsDebounceReference = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const instructionsReference = useRef(initialInstructions)
  const lastSavedInstructionsReference = useRef(initialInstructions)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setTitle(initialTitle)
  }, [initialTitle])

  useEffect(() => {
    setInstructions(initialInstructions)
    lastSavedInstructionsReference.current = initialInstructions
    instructionsReference.current = initialInstructions
  }, [initialInstructions])

  useEffect(() => {
    return () => {
      clearTimeout(ingredientsDebounceReference.current)
    }
  }, [])

  const handleTitleCommit = useCallback(
    async (nextTitle: string) => {
      setTitle(nextTitle)
      const result = await autosaveRecipeTitle(recipeId, nextTitle)
      if (!result.ok) {
        toast.error("Could not save title")
        return
      }
      startTransition(() => router.refresh())
    },
    [recipeId, router],
  )

  const scheduleIngredientsAutosave = useCallback(
    (payloadJson: string) => {
      clearTimeout(ingredientsDebounceReference.current)
      ingredientsDebounceReference.current = setTimeout(async () => {
        const result = await autosaveRecipeIngredients(recipeId, payloadJson)
        if (!result.ok) {
          toast.error("Could not save ingredients")
          return
        }
        startTransition(() => router.refresh())
      }, 450)
    },
    [recipeId, router],
  )

  const persistImage = useCallback(() => {
    imageFormReference.current?.requestSubmit()
  }, [])

  const imageFormAction = useCallback(
    async (formData: FormData) => {
      const result = await autosaveRecipeImage(formData)
      if (!result.ok) {
        toast.error("Could not save image")
        return
      }
      startTransition(() => router.refresh())
    },
    [router],
  )

  const persistInstructionsIfDirty = useCallback(async () => {
    const text = instructionsReference.current
    if (text === lastSavedInstructionsReference.current) return
    const result = await autosaveRecipeInstructions(recipeId, text)
    if (!result.ok) {
      toast.error("Could not save instructions")
      return
    }
    lastSavedInstructionsReference.current = text
    startTransition(() => router.refresh())
  }, [recipeId, router])

  useEffect(() => {
    function flushInstructions() {
      const text = instructionsReference.current
      if (text === lastSavedInstructionsReference.current) return
      void autosaveRecipeInstructions(recipeId, text)
    }
    window.addEventListener("pagehide", flushInstructions)
    return () => {
      window.removeEventListener("pagehide", flushInstructions)
      flushInstructions()
    }
  }, [recipeId])

  return (
    <div className="container mx-auto flex max-w-lg flex-col gap-6">
      <FieldGroup>
        <EditableText
          key={recipeId}
          value={title}
          onCommit={handleTitleCommit}
          placeholder="Recipe name"
          ariaLabel="Edit recipe title"
          variant="h1"
          typoOverride="text-4xl"
          className="w-full justify-start"
        />

        <form ref={imageFormReference} action={imageFormAction} className="contents">
          <input type="hidden" name="id" value={String(recipeId)} />
          <ImageSelector
            key={`${previewSrc ?? ""}-${defaultImageUrl}`}
            previewSrc={previewSrc}
            defaultImageUrl={defaultImageUrl}
            onPersistRequest={persistImage}
          />
        </form>

        <Field>
          <FieldLabel>Ingredients</FieldLabel>
          <MealIngredientsEditor
            catalog={catalog}
            initialLines={initialLines}
            onIngredientsPayloadChange={scheduleIngredientsAutosave}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="instructions">Instructions</FieldLabel>
          <Textarea
            id="instructions"
            name="instructions"
            placeholder="Step-by-step instructions"
            className="min-h-40"
            value={instructions}
            onChange={(event) => {
              const value = event.target.value
              instructionsReference.current = value
              setInstructions(value)
            }}
            onBlur={() => void persistInstructionsIfDirty()}
          />
        </Field>
      </FieldGroup>
    </div>
  )
}
