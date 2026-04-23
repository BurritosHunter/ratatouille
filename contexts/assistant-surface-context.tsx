"use client";

import { createContext, useContext } from "react";

import type { AssistantSurfacePayload } from "@/lib/assistant/surface";

export type AssistantSurfaceContextValue = {
  surface: AssistantSurfacePayload | null;
  clearSurface: () => void;
};

export const AssistantSurfaceContext = createContext<AssistantSurfaceContextValue | null>(null);

export function useAssistantSurface(): AssistantSurfaceContextValue {
  const context = useContext(AssistantSurfaceContext);
  if (!context) { throw new Error("useAssistantSurface must be used within AssistantChatShell"); }
  
  return context;
}
