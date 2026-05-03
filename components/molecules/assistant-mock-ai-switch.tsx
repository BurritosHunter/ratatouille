"use client";

import { Switch } from "radix-ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { ASSISTANT_MOCK_AI_STORAGE_KEY, readAssistantMockAiOverride, writeAssistantMockAiOverride } from "@/lib/assistant-mock-ai-preference";
import { cn } from "@/lib/helpers/utils";

type Props = { id: string };

export function AssistantMockAiSwitch({ id }: Props) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(() => readAssistantMockAiOverride() ?? false);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ASSISTANT_MOCK_AI_STORAGE_KEY) return;
      
      setChecked(readAssistantMockAiOverride() ?? false);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (readAssistantMockAiOverride() !== null) return;

    void fetch("/api/assistant/dev-ai-mode", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { defaultUseMock?: boolean } | null) => {
        if (data && typeof data.defaultUseMock === "boolean") {
          setChecked(data.defaultUseMock);
        }
      })
      .catch(() => {});
  }, []);

  if (process.env.NODE_ENV === "production") { return null; }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">{t("profile.mockAiLabel")}</Label>
        <Switch.Root
          id={id}
          checked={checked}
          onCheckedChange={(value) => {
            const next = value === true;
            setChecked(next);
            writeAssistantMockAiOverride(next);
          }}
          className={cn("peer inline-flex h-[1.15rem] w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80")}
          aria-label={t("profile.mockAiAria")}
        >
          <Switch.Thumb className={cn("pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0.5 dark:bg-foreground")} />
        </Switch.Root>
      </div>
      <p className="text-xs text-muted-foreground">{t("profile.mockAiHint")}</p>
    </div>
  );
}
