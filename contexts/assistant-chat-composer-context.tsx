"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AssistantChatComposerContextValue = {
  sendUserMessageToAssistant: (text: string) => void;
  inputDisabled: boolean;
  assistantAccessEnabled: boolean;
  setAssistantAccessEnabled: (enabled: boolean) => void;
};

const AssistantChatComposerContext = createContext<AssistantChatComposerContextValue | null>(null);

export function AssistantChatComposerProvider({ value, children }: { value: AssistantChatComposerContextValue; children: ReactNode; }) {
  return <AssistantChatComposerContext.Provider value={value}>{children}</AssistantChatComposerContext.Provider>;
}

export function useAssistantChatComposer(): AssistantChatComposerContextValue {
  const context = useContext(AssistantChatComposerContext);
  if (!context) { throw new Error("useAssistantChatComposer must be used within AssistantChatComposerProvider"); }
  
  return context;
}
