import { auth } from "@/auth"
import { getRecipeImageBlob } from "@/lib/data/recipes"

type RouteContext = {
  params: Promise<{ id: string }>
}

/** Show recipe main image (from blob bytes) */
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 })

  const userId = Number.parseInt(session.user.id, 10)
  if (!Number.isFinite(userId)) return new Response("Unauthorized", { status: 401 })

  const { id: idParam } = await context.params
  const recipeId = Number.parseInt(idParam, 10)
  if (!Number.isFinite(recipeId)) return new Response("Bad request", { status: 400 })

  const blob = await getRecipeImageBlob(userId, recipeId)
  if (!blob) return new Response("Not found", { status: 404 })

  return new Response(new Uint8Array(blob.data), {
    status: 200,
    headers: {
      "Content-Type": blob.mime,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
