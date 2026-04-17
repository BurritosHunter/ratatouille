import { anthropic } from "@ai-sdk/anthropic"
import { auth } from "@/auth"
import { recipesToToolRows } from "@/lib/ai/recipe-tool-rows"
import {
  createRatatouilleMockLanguageModel,
  hasUsableAnthropicApiKey,
  shouldUseRatatouilleMockAi,
} from "@/lib/ai/ratatouille-mock-language-model"
import { listRecipes } from "@/lib/data/recipes"
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai"
import { z } from "zod"

export const maxDuration = 30

const SYSTEM_PROMPT = `You are a helpful assistant for the Ratatouille recipe app. When the user asks what recipes they have, to list their recipes, or similar, call the listRecipesForUser tool and summarize the results helpfully.`

const LIST_RECIPES_TOOL_DESCRIPTION =
  "List all recipes belonging to the signed-in user. Call this when the user asks about their recipes, wants to see what they have saved, or needs an overview of their recipe collection."

/** Set `RATATOUILLE_AI_DEBUG=true` or `=1` in `.env.local` to log prompts, tools, and SDK steps (dev only; includes user message text). */
function isAiDebugEnabled(): boolean {
  const raw = process.env.RATATOUILLE_AI_DEBUG
  return raw === "1" || raw === "true"
}

function jsonSerializationReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString()
  }
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  return value
}

function logAiDebugJson(label: string, data: unknown): void {
  if (!isAiDebugEnabled()) {
    return
  }
  try {
    console.log(`[ratatouille-ai] ${label}\n${JSON.stringify(data, jsonSerializationReplacer, 2)}`)
  } catch (error) {
    console.error(`[ratatouille-ai] ${label} (serialize failed)`, error)
  }
}

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

  const tools = {
    listRecipesForUser: {
      description: LIST_RECIPES_TOOL_DESCRIPTION,
      inputSchema: z.object({}),
      execute: async () => {
        const summaries = await listRecipes(userId)
        return { recipes: recipesToToolRows(summaries) }
      },
    },
  }

  const modelMessages = await convertToModelMessages(messages, { tools })

  logAiDebugJson("http.body.uiMessages", { userId, messages })
  logAiDebugJson("convertToModelMessages.output", { modelMessages })

  const useMockAi = shouldUseRatatouilleMockAi()
  logAiDebugJson("config", {
    useMockAi,
    ratatouilleAiMock: process.env.RATATOUILLE_AI_MOCK,
    hasUsableAnthropicApiKey: hasUsableAnthropicApiKey(),
    anthropicKeyNote:
      "RATATOUILLE_AI_DEBUG only logs. Non-empty ANTHROPIC_API_KEY uses real Anthropic unless RATATOUILLE_AI_MOCK=true or key is a sentinel (mock, off, …).",
  })

  const languageModel = useMockAi
    ? createRatatouilleMockLanguageModel()
    : anthropic("claude-sonnet-4-20250514")

  const result = streamText({
    model: languageModel,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    stopWhen: stepCountIs(5),
    tools,
    experimental_onStart: (event) => {
      logAiDebugJson("sdk.experimental_onStart", {
        model: event.model,
        system: event.system,
        messages: event.messages,
        toolNames: event.tools ? Object.keys(event.tools as Record<string, unknown>) : [],
      })
    },
    experimental_onStepStart: (event) => {
      logAiDebugJson("sdk.experimental_onStepStart", {
        stepNumber: event.stepNumber,
        messages: event.messages,
      })
    },
    experimental_onToolCallStart: (event) => {
      logAiDebugJson("sdk.experimental_onToolCallStart", {
        stepNumber: event.stepNumber,
        toolCall: event.toolCall,
      })
    },
    experimental_onToolCallFinish: (event) => {
      if (event.success) {
        logAiDebugJson("sdk.experimental_onToolCallFinish", {
          stepNumber: event.stepNumber,
          success: true,
          output: event.output,
        })
      } else {
        logAiDebugJson("sdk.experimental_onToolCallFinish", {
          stepNumber: event.stepNumber,
          success: false,
          error: event.error,
        })
      }
    },
    onStepFinish: (event) => {
      logAiDebugJson("sdk.onStepFinish", {
        text: event.text,
        toolCalls: event.toolCalls,
        usage: event.usage,
        finishReason: event.finishReason,
      })
    },
    onFinish: (event) => {
      logAiDebugJson("sdk.onFinish", {
        totalUsage: event.totalUsage,
        stepCount: event.steps.length,
        finishReason: event.finishReason,
      })
    },
    onError: ({ error }) => {
      console.error("[ratatouille-ai] streamText error", error)
    },
  })

  return result.toUIMessageStreamResponse()
}
