"use client";

import { createContext, useContext } from "react";
import type { AssistantGeneratedUIPayload } from "@/lib/assistant/generated-ui";

export type AssistantGeneratedUIContextValue = {
  generatedUI: AssistantGeneratedUIPayload | null;
  clearSurface: () => void;
};

export const AssistantGeneratedUIContext = createContext<AssistantGeneratedUIContextValue | null>(null);

export function useAssistantGeneratedUI(): AssistantGeneratedUIContextValue {
  const context = useContext(AssistantGeneratedUIContext);
  if (!context) { throw new Error("useAssistantGeneratedUI must be used within AssistantChatShell"); }

  return context;
}
