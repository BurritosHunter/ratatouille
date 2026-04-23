import type { LanguageModelV3StreamPart, LanguageModelV3Usage } from "@ai-sdk/provider"
import { MockLanguageModelV3 } from "ai/test"
import { simulateReadableStream } from "ai"

const mockUsage: LanguageModelV3Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
}

const MOCK_TEXT_BLOCK_ID = "ratatouille-mock-text"

/**
 * Sentinel values: keep a line in `.env.local` but do not call Anthropic (dev auto-mock still applies).
 * `RATATOUILLE_AI_DEBUG` only logs — it does not disable Anthropic. Use this file’s rules or `RATATOUILLE_AI_MOCK`.
 */
const ANTHROPIC_KEY_DISABLED_SENTINELS = new Set(["mock", "off", "disabled", "false", "placeholder", "none"])

export function hasUsableAnthropicApiKey(): boolean {
  /** True when `ANTHROPIC_API_KEY` is set to a non-placeholder value (real calls use this). */
  const raw = process.env.ANTHROPIC_API_KEY?.trim()
  if (!raw) {
    return false
  }
  if (ANTHROPIC_KEY_DISABLED_SENTINELS.has(raw.toLowerCase())) {
    return false
  }
  return true
}

export function shouldUseRatatouilleMockAi(): boolean {
  /**
   * When true, `/api/chat` uses a mock language model (no Anthropic network calls).
   *
   * - `RATATOUILLE_AI_MOCK=true` or `1`: always mock (even if `ANTHROPIC_API_KEY` is set — use this to test locally with a fake key still in the file).
   * - `RATATOUILLE_AI_MOCK=false`: never mock (requires a real `ANTHROPIC_API_KEY`).
   * - Otherwise: in production, never mock. In dev, mock if there is no usable key (`ANTHROPIC_API_KEY` empty, or set to a sentinel like `mock`).
   *
   * If you put any other non-empty value in `ANTHROPIC_API_KEY`, the real Anthropic client runs; a fake key will fail at the API with “invalid API key”.
   */
  const explicit = process.env.RATATOUILLE_AI_MOCK?.trim().toLowerCase()
  if (explicit === "false") {
    return false
  }
  if (explicit === "true" || explicit === "1") {
    return true
  }
  if (process.env.NODE_ENV === "production") {
    return false
  }
  return !hasUsableAnthropicApiKey()
}

function getRatatouilleMockScenario(): "recipes" | "surface" {
  /** `RATATOUILLE_AI_MOCK_SCENARIO=surface`: first step emits layout + background + listRecipes tool calls in one model turn (dev testing of merged assistant surface). */
  const raw = process.env.RATATOUILLE_AI_MOCK_SCENARIO?.trim().toLowerCase();
  if (raw === "surface") {
    return "surface";
  }
  return "recipes";
}

function streamMockListRecipesToolCallStep(): ReadableStream<LanguageModelV3StreamPart> {
  return simulateReadableStream({
    chunks: [
      { type: "stream-start", warnings: [] },
      {
        type: "tool-call",
        toolCallId: "mock-listRecipesForUser",
        toolName: "listRecipesForUser",
        input: "{}",
      },
      {
        type: "finish",
        usage: mockUsage,
        finishReason: { unified: "tool-calls", raw: "mock" },
      },
    ],
  });
}

function streamMockSurfaceMultiToolCallStep(): ReadableStream<LanguageModelV3StreamPart> {
  return simulateReadableStream({
    chunks: [
      { type: "stream-start", warnings: [] },
      {
        type: "tool-call",
        toolCallId: "mock-setAssistantLayout",
        toolName: "setAssistantLayout",
        input: '{"layout":"twoColumn"}',
      },
      {
        type: "tool-call",
        toolCallId: "mock-setAssistantBackground",
        toolName: "setAssistantBackground",
        input: '{"color":"green"}',
      },
      {
        type: "tool-call",
        toolCallId: "mock-listRecipesForUser",
        toolName: "listRecipesForUser",
        input: "{}",
      },
      {
        type: "finish",
        usage: mockUsage,
        finishReason: { unified: "tool-calls", raw: "mock" },
      },
    ],
  });
}

function streamMockAssistantTextStep(): ReadableStream<LanguageModelV3StreamPart> {
  const text =
    getRatatouilleMockScenario() === "surface"
      ? "This is a mock assistant reply (no Anthropic API call). One step emitted three tools: layout (twoColumn), setAssistantBackground with color green for the first-column square, and a signal to load your recipes—the app fetches the list and shows the strip below the site header. Add ANTHROPIC_API_KEY to .env.local for the real model."
      : "This is a mock assistant reply (no Anthropic API call). The app loads your saved recipes in the layout preview and adds a short summary in this chat (no recipe data in the model tool result). Add ANTHROPIC_API_KEY to .env.local for the real model."
  return simulateReadableStream({
    chunks: [
      { type: "stream-start", warnings: [] },
      { type: "text-start", id: MOCK_TEXT_BLOCK_ID },
      { type: "text-delta", id: MOCK_TEXT_BLOCK_ID, delta: text },
      { type: "text-end", id: MOCK_TEXT_BLOCK_ID },
      {
        type: "finish",
        usage: mockUsage,
        finishReason: { unified: "stop", raw: "mock" },
      },
    ],
  })
}

/**
 * Two-step mock: (1) emit fixed tool call(s) so tools run for real (`listRecipesForUser`, or layout+background+recipes when `RATATOUILLE_AI_MOCK_SCENARIO=surface`), (2) stream canned text.
 * A new instance per request so the step counter resets.
 */
export function createRatatouilleMockLanguageModel(): MockLanguageModelV3 {
  let stepIndex = 0;
  const scenario = getRatatouilleMockScenario();
  return new MockLanguageModelV3({
    provider: "ratatouille-mock",
    modelId: "mock-claude",
    doStream: async () => {
      const index = stepIndex;
      stepIndex += 1;
      if (index === 0) {
        const stream = scenario === "surface" ? streamMockSurfaceMultiToolCallStep() : streamMockListRecipesToolCallStep();
        return { stream };
      }
      return { stream: streamMockAssistantTextStep() };
    },
  });
}
