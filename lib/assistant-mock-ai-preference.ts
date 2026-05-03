/** Client-only: persisted assistant dev settings for `/api/chat` (mock model, scenario). */

export const ASSISTANT_MOCK_AI_STORAGE_KEY = "ratatouille-assistant-mock-ai";

export const ASSISTANT_MOCK_SCENARIO_STORAGE_KEY = "ratatouille-assistant-mock-scenario";

export const DEFAULT_ASSISTANT_MOCK_SCENARIO = "recipes" as const;

export type AssistantMockScenario = "recipes" | "surface" | "pantry";

export function readAssistantMockAiOverride(): boolean | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ASSISTANT_MOCK_AI_STORAGE_KEY);
    if (raw === null) return null;
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function writeAssistantMockAiOverride(enabled: boolean): void {
  try {
    window.localStorage.setItem(ASSISTANT_MOCK_AI_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    /* Quota or private mode */
  }
}

/** `null` = not set; shell sends `DEFAULT_ASSISTANT_MOCK_SCENARIO` after dev defaults load. */
export function readAssistantMockScenarioOverride(): AssistantMockScenario | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ASSISTANT_MOCK_SCENARIO_STORAGE_KEY)?.trim().toLowerCase();
    if (raw === "surface") return "surface";
    if (raw === "pantry") return "pantry";
    if (raw === "recipes") return "recipes";
    return null;
  } catch {
    return null;
  }
}

export function writeAssistantMockScenarioOverride(scenario: AssistantMockScenario): void {
  try {
    window.localStorage.setItem(ASSISTANT_MOCK_SCENARIO_STORAGE_KEY, scenario);
  } catch {
    /* Quota or private mode */
  }
}
