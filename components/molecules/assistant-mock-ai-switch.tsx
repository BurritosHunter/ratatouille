"use client";

import { Switch } from "radix-ui";
import { useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import {
  ASSISTANT_MOCK_AI_STORAGE_KEY,
  ASSISTANT_MOCK_SCENARIO_STORAGE_KEY,
  DEFAULT_ASSISTANT_MOCK_SCENARIO,
  type AssistantMockScenario,
  readAssistantMockAiOverride,
  readAssistantMockScenarioOverride,
  writeAssistantMockAiOverride,
  writeAssistantMockScenarioOverride,
} from "@/lib/assistant-mock/client-preference";
import { cn } from "@/lib/helpers/utils";

type AssistantMockAiProfileMocksProps = {
  mockSwitchId: string;
  scenarioSelectId: string;
};

export function AssistantMockAiProfileMocks({ mockSwitchId, scenarioSelectId }: AssistantMockAiProfileMocksProps) {
  const { t } = useTranslation();
  const [mockAiEnabled, setMockAiEnabled] = useState(false);
  const [scenario, setScenario] = useState<AssistantMockScenario>(DEFAULT_ASSISTANT_MOCK_SCENARIO);

  useLayoutEffect(() => {
    const mockFromStorage = readAssistantMockAiOverride();
    const scenarioFromStorage = readAssistantMockScenarioOverride();

    if (mockFromStorage !== null) {
      setMockAiEnabled(mockFromStorage);
    }
    if (scenarioFromStorage !== null) {
      setScenario(scenarioFromStorage);
    }
    if (mockFromStorage !== null && scenarioFromStorage !== null) { return; }

    void fetch("/api/assistant/dev-ai-mode", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { defaultUseMock?: boolean; defaultMockScenario?: string } | null) => {
        if (!data) { return; }
        
        if (mockFromStorage === null && typeof data.defaultUseMock === "boolean") {
          setMockAiEnabled(data.defaultUseMock);
        }
        if (scenarioFromStorage === null) {
          const defaultScenario = data.defaultMockScenario;
          if (defaultScenario === "surface" || defaultScenario === "recipes" || defaultScenario === "pantry") {
            setScenario(defaultScenario);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === ASSISTANT_MOCK_AI_STORAGE_KEY) {
        setMockAiEnabled(readAssistantMockAiOverride() ?? false);
        return;
      }
      if (event.key !== ASSISTANT_MOCK_SCENARIO_STORAGE_KEY) {
        return;
      }
      setScenario(readAssistantMockScenarioOverride() ?? DEFAULT_ASSISTANT_MOCK_SCENARIO);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (process.env.NODE_ENV === "production") { return null; }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={mockSwitchId} className="text-xs font-normal text-muted-foreground">{t("profile.mockAiLabel")}</Label>
          <Switch.Root
            id={mockSwitchId}
            checked={mockAiEnabled}
            onCheckedChange={(value) => {
              const next = value === true;
              setMockAiEnabled(next);
              writeAssistantMockAiOverride(next);
            }}
            className={cn("peer inline-flex h-[1.15rem] w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",)}
          >
            <Switch.Thumb
              className={cn("pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0.5 dark:bg-foreground",)}
            />
          </Switch.Root>
        </div>
      </div>
      {mockAiEnabled ? (
        <div className="flex flex-row justify-between gap-4">
          <Label htmlFor={scenarioSelectId} className="text-xs font-normal text-muted-foreground">{t("profile.mockScenarioLabel")}</Label>
          <select
            id={scenarioSelectId}
            value={scenario}
            onChange={(event) => {
              const raw = event.target.value;
              const next: AssistantMockScenario = raw === "surface" ? "surface" : raw === "pantry" ? "pantry" : "recipes";
              setScenario(next);
              writeAssistantMockScenarioOverride(next);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="recipes">{t("profile.mockScenarioRecipes")}</option>
            <option value="surface">{t("profile.mockScenarioSurface")}</option>
            <option value="pantry">{t("profile.mockScenarioPantry")}</option>
          </select>
        </div>
      ) : null}
    </div>
  );
}
