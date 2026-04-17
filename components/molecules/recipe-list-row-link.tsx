import Link from "next/link"

type RecipeListRowLinkProps = {
  recipeId: number
  title: string
  thumbSrc: string | null
}

export function RecipeListRowLink({ recipeId, title, thumbSrc }: RecipeListRowLinkProps) {
  return (
    <Link
      href={`/recipes/${recipeId}`}
      className="flex w-full items-center gap-3 rounded-md border p-2 transition-colors hover:bg-muted/50"
    >
      {thumbSrc ? (
        <img src={thumbSrc} alt="" className="size-14 shrink-0 rounded-md border object-cover" />
      ) : (
        <div className="bg-muted text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-md border text-xs">
          No image
        </div>
      )}
      <span className="min-w-0 text-sm font-medium">{title}</span>
    </Link>
  )
}
