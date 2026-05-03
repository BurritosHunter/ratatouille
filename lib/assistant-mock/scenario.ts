export type AssistantMockScenario = "recipes" | "surface" | "pantry";

export const DEFAULT_ASSISTANT_MOCK_SCENARIO = "recipes" as const satisfies AssistantMockScenario;
