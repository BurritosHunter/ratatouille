import Link from "next/link"
import { notFound } from "next/navigation"

import { updateRecipe } from "../../actions"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { requireUserId } from "@/lib/auth/auth-user"
import { getRecipeById } from "@/lib/data/recipes"
import { imageSrcFromStoredOrExternal } from "@/lib/helpers/image/stored-or-external-src"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditRecipePage({ params }: PageProps) {
  const { id: idParam } = await params
  const recipeId = Number.parseInt(idParam, 10)
  if (!Number.isFinite(recipeId)) notFound()

  const callbackPath = `/recipes/${recipeId}/edit`
  const userId = await requireUserId(callbackPath)
  const recipe = await getRecipeById(userId, recipeId)
  if (!recipe) notFound()

  const previewSrc = imageSrcFromStoredOrExternal({
    hasStored: recipe.hasStoredImage,
    storedSrc: `/api/recipes/${recipe.id}/image`,
    externalUrl: recipe.mainImageUrl,
  })

  return (
    <div className="flex min-h-svh flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-medium">Edit recipe</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/recipes/${recipe.id}`}>View recipe</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/recipes">All recipes</Link>
          </Button>
        </div>
      </div>

      <form action={updateRecipe} className="flex max-w-md flex-col gap-6">
        <input type="hidden" name="id" value={recipe.id} />
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Recipe name"
              defaultValue={recipe.title}
            />
          </Field>
          <Field>
            <FieldLabel>Current image</FieldLabel>
            {previewSrc ? (
              <img src={previewSrc} alt="" className="aspect-video max-h-40 w-full rounded-md border object-cover" />
            ) : (
              <p className="text-sm text-muted-foreground">No image yet.</p>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="main_image">Replace with file</FieldLabel>
            <Input id="main_image" name="main_image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
            <p className="text-sm text-muted-foreground">JPEG, PNG, WebP, or GIF, up to 2MB. Stored in the database.</p>
          </Field>
          <Field>
            <FieldLabel htmlFor="main_image_url">Or image URL</FieldLabel>
            <Input
              id="main_image_url"
              name="main_image_url"
              type="url"
              inputMode="url"
              placeholder="https://…"
              defaultValue={recipe.mainImageUrl ?? ""}
            />
            <p className="text-sm text-muted-foreground">
              External URL replaces a stored file. Leave empty to keep a stored upload; clear it to remove an external URL only.
            </p>
          </Field>
          <Field orientation="horizontal" className="items-center gap-2">
            <input
              id="remove_main_image"
              name="remove_main_image"
              type="checkbox"
              value="1"
              className="size-4 rounded border-input"
            />
            <FieldLabel htmlFor="remove_main_image" className="cursor-pointer font-normal">
              Remove main image completely
            </FieldLabel>
          </Field>
          <Field>
            <FieldLabel htmlFor="ingredients">Ingredients</FieldLabel>
            <Textarea
              id="ingredients"
              name="ingredients"
              required
              placeholder="List ingredients (one per line is fine)"
              className="min-h-28"
              defaultValue={recipe.ingredients}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="instructions">Instructions</FieldLabel>
            <Textarea
              id="instructions"
              name="instructions"
              required
              placeholder="Step-by-step instructions"
              className="min-h-40"
              defaultValue={recipe.instructions}
            />
          </Field>
        </FieldGroup>
        <Button type="submit">Save changes</Button>
      </form>
    </div>
  )
}
