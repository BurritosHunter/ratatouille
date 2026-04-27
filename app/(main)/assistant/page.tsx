"use client";

import { MessageForm } from "@/components/organisms/message-form";
import { GeneratedUISurface } from "./_assistant-generated-ui";
import { useAssistantChatComposer } from "@/contexts/assistant-chat-composer-context";
import { useGeneratedUI } from "@/contexts/assistant-generated-ui-context";
import { cn } from "@/lib/helpers/utils";
import { useTranslation } from "react-i18next";

export default function AssistantPage() {
  const { t } = useTranslation();
  const { generatedUI } = useGeneratedUI();
  const { sendUserMessageToAssistant, inputDisabled } = useAssistantChatComposer();

  return (
    <div className="mx-auto flex w-full max-w-header min-h-0 flex-1 flex-col">

      <GeneratedUISurface />

      <section className={cn("mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-20", generatedUI && "hidden")} aria-hidden={generatedUI ? true : undefined}>
        <h1 className="font-heading text-lg font-semibold text-foreground">{t("assistant.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("assistant.pageDescription")}</p>
        <div className="mt-3 max-w-lg">
          <MessageForm disabled={inputDisabled} onSend={sendUserMessageToAssistant} autoFocus={false} />
        </div>
      </section>
      
    </div>
  );
}
