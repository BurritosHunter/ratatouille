import type { LanguageModelV3StreamPart, LanguageModelV3Usage } from "@ai-sdk/provider";
import { MockLanguageModelV3 } from "ai/test";
import { simulateReadableStream } from "ai";

const mockUsage: LanguageModelV3Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
};

const MOCK_TEXT_BLOCK_ID = "ratatouille-mock-text";

/**
 * Sentinel values: `ANTHROPIC_API_KEY` can be set to a placeholder so dev skips real calls until you use a real key.
 * Mock vs real in development is controlled by Profile / `x-ratatouille-mock-ai`, not env flags.
 */
const ANTHROPIC_KEY_DISABLED_SENTINELS = new Set(["mock", "off", "disabled", "false", "placeholder", "none"]);

export function hasUsableAnthropicApiKey(): boolean {
  /** True when `ANTHROPIC_API_KEY` is set to a non-placeholder value (real calls use this). */
  const raw = process.env.ANTHROPIC_API_KEY?.trim();
  if (!raw) {
    return false;
  }
  if (ANTHROPIC_KEY_DISABLED_SENTINELS.has(raw.toLowerCase())) {
    return false;
  }
  return true;
}

/**
 * Default mock-vs-real when the client has not sent `x-ratatouille-mock-ai` yet (e.g. `/api/assistant/dev-ai-mode`).
 * In development: mock if there is no usable Anthropic key. Production: never mock.
 */
export function shouldUseRatatouilleMockAi(): boolean {
  if (process.env.NODE_ENV === "production") { return false; }

  return !hasUsableAnthropicApiKey();
}

/**
 * Resolves mock vs real for `/api/chat`.
 * Non-production: `x-ratatouille-mock-ai` from the app wins; if absent, {@link shouldUseRatatouilleMockAi}.
 * Production: always real (no mock).
 */
export function resolveUseMockAiForChatRequest(request: Request): boolean {
  if (process.env.NODE_ENV === "production") { return false; }

  const header = request.headers.get("x-ratatouille-mock-ai")?.trim().toLowerCase();
  if (header === "true" || header === "1") { return true; }
  if (header === "false" || header === "0") { return false; }

  return shouldUseRatatouilleMockAi();
}

export type RatatouilleMockScenario = "recipes" | "surface";

/**
 * First mock model step: `recipes` = listRecipes tool only; `surface` = layout + background + listRecipes.
 * Non-production: header `x-ratatouille-mock-scenario`; if invalid or absent, `recipes`.
 */
export function resolveRatatouilleMockScenarioFromRequest(request: Request): RatatouilleMockScenario {
  if (process.env.NODE_ENV === "production") { return "recipes"; }

  const header = request.headers.get("x-ratatouille-mock-scenario")?.trim().toLowerCase();
  if (header === "surface") { return "surface"; }
  if (header === "recipes") { return "recipes"; }
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

function streamMockAssistantTextStep(scenario: RatatouilleMockScenario): ReadableStream<LanguageModelV3StreamPart> {
  const text =
    scenario === "surface"
      ? "This is a mock assistant reply (no Anthropic API call). One step emitted three tools: layout (twoColumn), setAssistantBackground with color green for the first-column square, and listRecipesForUser with recipe rows for the generated UI preview below the site header. Turn off Mock AI under Profile to use the real model when your API key is configured."
      : "This is a mock assistant reply (no Anthropic API call). The listRecipesForUser tool returns your saved recipes for the generated UI preview, and the app adds a short summary in this chat. Turn off Mock AI under Profile to use the real model when your API key is configured.";
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
  });
}

/**
 * Two-step mock: (1) emit fixed tool call(s) so tools run for real, (2) stream canned text.
 * A new instance per request so the step counter resets.
 */
export function createRatatouilleMockLanguageModel(scenario: RatatouilleMockScenario): MockLanguageModelV3 {
  let stepIndex = 0;
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
      return { stream: streamMockAssistantTextStep(scenario) };
    },
  });
}
