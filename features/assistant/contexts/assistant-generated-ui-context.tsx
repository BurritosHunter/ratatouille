"use client";

import { createContext, useContext } from "react";
import type { GeneratedUIPayload } from "@/lib/generated-ui";

export type GeneratedUIContextValue = {
  generatedUI: GeneratedUIPayload | null;
  clearGeneratedUI: () => void;
};

export const GeneratedUIContext = createContext<GeneratedUIContextValue | null>(null);

export function useGeneratedUI(): GeneratedUIContextValue {
  const context = useContext(GeneratedUIContext);
  if (!context) { throw new Error("useGeneratedUI must be used within AssistantChatShell"); }

  return context;
}
