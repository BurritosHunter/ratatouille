"use client";

import { AssistantChatInput } from "@/components/organisms/assistant-chat-input";
import { useAssistantChatComposer } from "@/contexts/assistant-chat-composer-context";
import { useTranslation } from "react-i18next";

export default function AssistantPage() {
  const { t } = useTranslation();
  const { sendUserMessage, inputDisabled } = useAssistantChatComposer();

  return (
    <section className="mx-auto flex w-full max-w-header flex-col gap-3 px-4 py-4">
      <h1 className="font-heading text-lg font-semibold text-foreground">{t("assistant.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("assistant.pageDescription")}</p>
      <AssistantChatInput disabled={inputDisabled} onSend={sendUserMessage} autoFocus={false} />
    </section>
  );
}
