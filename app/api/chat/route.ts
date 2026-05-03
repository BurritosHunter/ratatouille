import { anthropic } from "@ai-sdk/anthropic";
import { auth } from "@/auth";
import { createAssistantTools } from "@/lib/ai/assistant-tools";
import {
  createRatatouilleMockLanguageModel,
  resolveRatatouilleMockScenarioFromRequest,
  resolveUseMockAiForChatRequest,
} from "@/lib/ai/ratatouille-mock-language-model";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

export const maxDuration = 30;
const ASSISTANT_CHAT_SYSTEM_PROMPT = "You are a helpful assistant for the Ratatouille recipe app. When the user asks what recipes they have, to list their recipes, or similar, call the listRecipesForUser tool. That tool returns the signed-in user's recipe rows for the generated UI preview and chat summary context. Do not invent or guess recipe names; rely on tool output as the source of truth and you may briefly say the list is shown in the app. When the user asks to change the modular tool layout preview (below the site header), call setAssistantLayout with the best matching option. You may call multiple tools in the same assistant turn when it fits the request—for example, to update the preview with layout and the user's recipes together (parallel tool calls in one step are allowed).";

function jsonSerializationReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  return value;
}
function logAiDebugJson(label: string, data: unknown): void {
  try {
    console.log(`[ratatouille-ai] ${label}\n${JSON.stringify(data, jsonSerializationReplacer, 2)}`);
  } catch (error) {
    console.error(`[ratatouille-ai] ${label} (serialize failed)`, error);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const userIdRaw = session?.user?.id;
  const userId = userIdRaw ? Number.parseInt(userIdRaw, 10) : Number.NaN;
  if (!Number.isFinite(userId)) return new Response("Unauthorized", { status: 401 });

  let body: { messages: UIMessage[] };
  try {
    body = (await request.json()) as { messages: UIMessage[] };
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages)) return new Response("Expected messages array", { status: 400 });

  const tools = createAssistantTools({ userId });
  const modelMessages = await convertToModelMessages(messages, { tools });
  const useMockAi = resolveUseMockAiForChatRequest(request);
  const mockScenario = resolveRatatouilleMockScenarioFromRequest(request);
  logAiDebugJson("request", {
    messageCount: messages.length,
    useMockAi,
    mockScenario,
    toolNames: Object.keys(tools),
  });

  const languageModel = useMockAi ? createRatatouilleMockLanguageModel(mockScenario) : anthropic("claude-sonnet-4-20250514");
  const result = streamText({
    model: languageModel,
    system: ASSISTANT_CHAT_SYSTEM_PROMPT,
    messages: modelMessages,
    stopWhen: stepCountIs(8),
    tools,
    // experimental_onStart: (event) => {
    //   logAiDebugJson("sdk.experimental_onStart", {
    //     availableTools: event.tools ? Object.keys(event.tools as Record<string, unknown>) : [],
    //   })
    // },
    // experimental_onToolCallStart: (event) => {
    //   logAiDebugJson("sdk.experimental_onToolCallStart", {
    //     toolCalled: event.toolCall.toolName,
    //   })
    // },
    // experimental_onToolCallFinish: (event) => {
    //   if (event.success) {
    //     logAiDebugJson("sdk.experimental_onToolCallFinish", {
    //       output: event.output,
    //     })
    //   } else {
    //     logAiDebugJson("sdk.experimental_onToolCallFinish", {
    //       success: false,
    //       error: event.error,
    //     })
    //   }
    // },
    // onStepFinish: (event) => {
    //   logAiDebugJson("sdk.onStepFinish", {
    //     toolCalls: event.toolCalls.map((call) => call.toolName).join(", "),
    //   })
    // },
    // onError: ({ error }) => {
    //   console.error("[ratatouille-ai] streamText error", error)
    // },
  });

  return result.toUIMessageStreamResponse();
}
