import { anthropic } from "@ai-sdk/anthropic"
import { auth } from "@/auth"
import { recipesToToolRows } from "@/lib/ai/recipe-tool-rows"
import { listRecipes } from "@/lib/data/recipes"
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai"
import { z } from "zod"

export const maxDuration = 30

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }
  const userId = Number.parseInt(session.user.id, 10)
  if (!Number.isFinite(userId)) {
    return new Response("Unauthorized", { status: 401 })
  }

  let body: { messages: UIMessage[] }
  try {
    body = (await request.json()) as { messages: UIMessage[] }
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const { messages } = body
  if (!Array.isArray(messages)) {
    return new Response("Expected messages array", { status: 400 })
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are a helpful assistant for the Ratatouille recipe app. When the user asks what recipes they have, to list their recipes, or similar, call the listRecipesForUser tool and summarize the results helpfully.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      listRecipesForUser: {
        description:
          "List all recipes belonging to the signed-in user. Call this when the user asks about their recipes, wants to see what they have saved, or needs an overview of their recipe collection.",
        inputSchema: z.object({}),
        execute: async () => {
          const summaries = await listRecipes(userId)
          return { recipes: recipesToToolRows(summaries) }
        },
      },
    },
  })

  return result.toUIMessageStreamResponse()
}
