"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import {
  ASSISTANT_MOCK_SCENARIO_STORAGE_KEY,
  DEFAULT_ASSISTANT_MOCK_SCENARIO,
  type AssistantMockScenario,
  readAssistantMockScenarioOverride,
  writeAssistantMockScenarioOverride,
} from "@/lib/assistant-mock-ai-preference";

type Props = { id: string };

export function AssistantMockScenarioSelect({ id }: Props) {
  const { t } = useTranslation();
  const [scenario, setScenario] = useState<AssistantMockScenario>(
    () => readAssistantMockScenarioOverride() ?? DEFAULT_ASSISTANT_MOCK_SCENARIO,
  );

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ASSISTANT_MOCK_SCENARIO_STORAGE_KEY) return;
      setScenario(readAssistantMockScenarioOverride() ?? DEFAULT_ASSISTANT_MOCK_SCENARIO);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (readAssistantMockScenarioOverride() !== null) return;

    void fetch("/api/assistant/dev-ai-mode", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { defaultMockScenario?: string } | null) => {
        const defaultScenario = data?.defaultMockScenario;
        if (defaultScenario === "surface" || defaultScenario === "recipes" || defaultScenario === "pantry") {
          setScenario(defaultScenario);
        }
      })
      .catch(() => {});
  }, []);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {t("profile.mockScenarioLabel")}
      </Label>
      <select
        id={id}
        value={scenario}
        onChange={(event) => {
          const raw = event.target.value;
          const next: AssistantMockScenario =
            raw === "surface" ? "surface" : raw === "pantry" ? "pantry" : "recipes";
          setScenario(next);
          writeAssistantMockScenarioOverride(next);
        }}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <option value="recipes">{t("profile.mockScenarioRecipes")}</option>
        <option value="surface">{t("profile.mockScenarioSurface")}</option>
        <option value="pantry">{t("profile.mockScenarioPantry")}</option>
      </select>
      <p className="text-xs text-muted-foreground">{t("profile.mockScenarioHint")}</p>
    </div>
  );
}
