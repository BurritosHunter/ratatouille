"use client";

import { Switch } from "radix-ui";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { useAssistantChatComposer } from "@/contexts/assistant-chat-composer-context";
import { cn } from "@/lib/helpers/utils";

type Props = { id: string };

export function AssistantAccessSwitch({ id }: Props) {
  const { t } = useTranslation();
  const { assistantAccessEnabled, setAssistantAccessEnabled } = useAssistantChatComposer();

  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {t("assistant.accessSwitchLabel")}
      </Label>
      <Switch.Root
        id={id}
        checked={assistantAccessEnabled}
        onCheckedChange={setAssistantAccessEnabled}
        className={cn(
          "peer inline-flex h-[1.15rem] w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
        )}
        aria-label={t("assistant.accessSwitchAria")}
      >
        <Switch.Thumb
          className={cn(
            "pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0.5 dark:bg-foreground",
          )}
        />
      </Switch.Root>
    </div>
  );
}
