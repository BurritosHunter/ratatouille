import { anthropic } from "@ai-sdk/anthropic";
import { auth } from "@/auth";
import { createAssistantTools } from "@/lib/ai/assistant-tools";
import {
  createRatatouilleMockLanguageModel,
  shouldUseRatatouilleMockAi
} from "@/lib/ai/ratatouille-mock-language-model";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";

export const maxDuration = 30;
const ASSISTANT_CHAT_SYSTEM_PROMPT = "You are a helpful assistant for the Ratatouille recipe app. When the user asks what recipes they have, to list their recipes, or similar, call the listRecipesForUser tool and summarize the results helpfully. When the user asks to change the modular tool layout preview (below the site header), call setAssistantLayout with the best matching option. When the user asks for a colored square or swatch in that preview (red, blue, or green), call the corresponding setAssistantBackground* tool—those tools insert a square in a layout column, not the full page background. You may call multiple tools in the same assistant turn when it fits the request—for example, to update the preview with layout, a color square, and the user's recipes together (parallel tool calls in one step are allowed).";


/** Set `RATATOUILLE_AI_DEBUG=true` in `.env.local` to log prompts, tools, and SDK steps (dev only; includes user message text). */
function isAiDebugEnabled(): boolean {
  const raw = process.env.RATATOUILLE_AI_DEBUG;
  return raw === "1" || raw === "true";
}

function jsonSerializationReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  return value;
}

function logAiDebugJson(label: string, data: unknown): void {
  if (!isAiDebugEnabled()) return;

  try {
    console.log(`[ratatouille-ai] ${label}\n${JSON.stringify(data, jsonSerializationReplacer, 2)}`);
  } catch (error) {
    console.error(`[ratatouille-ai] ${label} (serialize failed)`, error);
  }
}



export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const userId = Number.parseInt(session.user.id, 10);
  if (!Number.isFinite(userId)) return new Response("Unauthorized", { status: 401 });

  let body: { messages: UIMessage[] };
  try {
    body = (await request.json()) as { messages: UIMessage[] };
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages)) return new Response("Expected messages array", { status: 400 });

  const tools = createAssistantTools(userId);
  const modelMessages = await convertToModelMessages(messages, { tools });

  const useMockAi = shouldUseRatatouilleMockAi();
  const languageModel = useMockAi ? createRatatouilleMockLanguageModel() : anthropic("claude-sonnet-4-20250514");
  const result = streamText({
    model: languageModel,
    system: ASSISTANT_CHAT_SYSTEM_PROMPT,
    messages: modelMessages,
    stopWhen: stepCountIs(8),
    tools
  });

  return result.toUIMessageStreamResponse();
}
