"use client";

import { AssistantChatInput } from "@/components/organisms/assistant-chat-input";
import { useAssistantChatComposer } from "@/contexts/assistant-chat-composer-context";

export default function AssistantPage() {
  const { sendUserMessage, inputDisabled } = useAssistantChatComposer();

  return (
    <section className="mx-auto flex w-full max-w-header flex-col gap-3 px-4 py-4">
      <h1 className="font-heading text-lg font-semibold text-foreground">Assistant</h1>
      <p className="text-sm text-muted-foreground">
        Ask anything about your recipes—for example, “What recipes do I have?” Tool output (layout, color square, recipes) appears in the main layout above the page.
      </p>
      <AssistantChatInput disabled={inputDisabled} onSend={sendUserMessage} autoFocus={false} />
    </section>
  );
}
