import Link from "next/link"

import { addRecipe } from "../actions"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { requireUserId } from "@/lib/auth-user"

export const dynamic = "force-dynamic"

export default async function NewRecipePage() {
  await requireUserId("/recipes/new")

  return (
    <div className="flex min-h-svh flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-medium">New recipe</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/recipes">All recipes</Link>
        </Button>
      </div>

      <form action={addRecipe} className="flex max-w-md flex-col gap-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input id="title" name="title" type="text" required placeholder="Recipe name" />
          </Field>
          <Field>
            <FieldLabel htmlFor="ingredients">Ingredients</FieldLabel>
            <Textarea
              id="ingredients"
              name="ingredients"
              required
              placeholder="List ingredients (one per line is fine)"
              className="min-h-28"
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
            />
          </Field>
        </FieldGroup>
        <Button type="submit">Create recipe</Button>
      </form>
    </div>
  )
}
