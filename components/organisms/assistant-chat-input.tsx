"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export function AssistantChatInput({
  disabled,
  onSend,
  autoFocus = true,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  return (
    <form
      className="shrink-0 border-t border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setValue("");
      }}
    >
      <div className="flex gap-2">
        <textarea
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
          rows={2}
          placeholder={t("assistant.messagePlaceholder")}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[2.5rem] w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t("assistant.messageAria")}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              const trimmed = value.trim();
              if (!trimmed || disabled) return;
              onSend(trimmed);
              setValue("");
            }
          }}
        />
        <Button type="submit" disabled={disabled || !value.trim()} aria-busy={disabled}>
          {t("common.send")}
        </Button>
      </div>
    </form>
  );
}
