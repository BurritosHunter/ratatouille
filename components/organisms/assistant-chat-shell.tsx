"use client";

import { useChat } from "@ai-sdk/react";
import { IconMessageCircle, IconX } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { MessageForm } from "@/components/organisms/message-form";
import { Button } from "@/components/ui/button";
import { AssistantChatComposerProvider } from "@/contexts/assistant-chat-composer-context";
import { AssistantSurfaceContext } from "@/contexts/assistant-surface-context";
import type { RecipeToolRow } from "@/lib/ai/recipe-tool-rows";
import {
  ASSISTANT_SURFACE_TOOL_PART_TYPES,
  mergeAssistantSurfacePayload,
  type AssistantLayoutOption,
  type AssistantSurfacePayload,
} from "@/lib/assistant/surface";
import { cn } from "@/lib/helpers/utils";
import { DefaultChatTransport, type UIDataTypes, type UIMessagePart, type UITools } from "ai";

type ToolPart = {
  type: string;
  toolCallId: string;
  state: string;
  errorText?: string;
  output?: unknown;
};
function getToolPart(part: UIMessagePart<UIDataTypes, UITools>): ToolPart | null {
  /* Returns null for text and non-tool parts. */

  if (typeof part !== "object" || part === null) { return null; }

  const candidate = part as Record<string, unknown>;
  const type = candidate.type;
  if (typeof type !== "string" || !type.startsWith("tool-")) { return null; }
  if (typeof candidate.toolCallId !== "string" || typeof candidate.state !== "string") { return null; }

  return part as ToolPart;
}

const SURFACE_TOOL_PART_TYPE_SET = new Set<string>(ASSISTANT_SURFACE_TOOL_PART_TYPES);
function isSurfaceToolType(type: string): type is (typeof ASSISTANT_SURFACE_TOOL_PART_TYPES)[number] {
  return SURFACE_TOOL_PART_TYPE_SET.has(type);
}

function surfacePatchFromToolPart(
  part: ToolPart,
): Partial<Pick<AssistantSurfacePayload, "recipes" | "layout" | "backgroundColor">> | null {
  switch (part.type) {
    case "tool-listRecipesForUser": {
      const output = part.output as { recipes?: RecipeToolRow[] };
      return { recipes: output.recipes ?? [] };
    }
    case "tool-setAssistantLayout": {
      const output = part.output as { layout?: AssistantLayoutOption };
      if (!output.layout) {
        return null;
      }
      return { layout: output.layout };
    }
    case "tool-setAssistantBackgroundRed":
      return { backgroundColor: "red" };
    case "tool-setAssistantBackgroundBlue":
      return { backgroundColor: "blue" };
    case "tool-setAssistantBackgroundGreen":
      return { backgroundColor: "green" };
    default:
      return null;
  }
}

function surfaceToolKindLabel(partType: string, t: TFunction<"translation">): string {
  switch (partType) {
    case "tool-listRecipesForUser":
      return t("assistant.toolKind.recipes");
    case "tool-setAssistantLayout":
      return t("assistant.toolKind.layout");
    case "tool-setAssistantBackgroundRed":
    case "tool-setAssistantBackgroundBlue":
    case "tool-setAssistantBackgroundGreen":
      return t("assistant.toolKind.colorSquare");
    default:
      return t("assistant.toolKind.generic");
  }
}

function SurfaceToolPartMessage({ part }: { part: ToolPart }) {
  const { t } = useTranslation();
  const callId = part.toolCallId;
  const label = surfaceToolKindLabel(part.type, t);

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <div key={callId} className="text-sm text-muted-foreground">
          {t("assistant.runningTool", { label })}
        </div>
      );
    case "output-available":
      return (
        <p key={callId} className="text-sm text-muted-foreground">
          {t("assistant.updatedMainLayout", { label })}
        </p>
      );
    case "output-error":
      return (
        <p key={callId} className="text-sm text-destructive">
          {t("assistant.toolFailed", { label, error: part.errorText ?? t("assistant.unknownError") })}
        </p>
      );
    default:
      return null;
  }
}

export function AssistantChatShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();

  const [surface, setSurface] = useState<AssistantSurfacePayload | null>(null);
  const clearSurface = useCallback(() => { setSurface(null); }, []);
  const [panelOpen, setPanelOpen] = useState(false);

  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat", credentials: "include" }),
    onError: (chatError) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[assistant]", chatError);
      }
    },
  });
  const inputDisabled = status === "submitted" || status === "streaming";
  const sendUserMessageToAssistant = useCallback((text: string) => {
    setPanelOpen(true);
    void sendMessage({ text });
  }, [sendMessage]);
  
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (previousPathnameRef.current === "/assistant" && pathname !== "/assistant") {
      clearSurface(); /* Preview mounts only on /assistant; clear shell state when leaving that route. */
    }
    previousPathnameRef.current = pathname;
  }, [pathname]);







/* SARAH - Everything above this point is validated */


  const processedSurfaceCallIdsReference = useRef<Set<string>>(new Set());
  useEffect(() => {
    /* Sync tool results to layout preview state. Not useMemo(messages): Clear must hide the panel without stripping chat history.
     * Dedupe by assistant message id + toolCallId so a new turn can reuse the same toolCallId (e.g. mock model) and still merge.
     * Navigate to /assistant only when new surface output is applied — not on every render while surface is non-null (that trapped client navigations).
     * `pathname` is a dependency so we read the current route when deciding to navigate; already-processed tool parts are skipped. */
    let changeRouteToAssistantPage = false;
    for (const message of messages) {
      if (message.role !== "assistant") { continue; }

      for (const part of message.parts) {
        const tool = getToolPart(part);
        if (!tool || !isSurfaceToolType(tool.type)) { continue; }
        if (tool.state !== "output-available") { continue; }

        const dedupeKey = `${message.id}:${tool.toolCallId}`;
        if (processedSurfaceCallIdsReference.current.has(dedupeKey)) { continue; }

        processedSurfaceCallIdsReference.current.add(dedupeKey);
        const patch = surfacePatchFromToolPart(tool);
        if (patch === null) { continue; }
        
        if (!changeRouteToAssistantPage && pathname !== "/assistant") {
          changeRouteToAssistantPage = true;
          queueMicrotask(() => {
            startTransition(() => {
              router.replace("/assistant");
            });
          });
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect -- see block comment above
        setSurface((previous) => mergeAssistantSurfacePayload(previous, dedupeKey, patch));
      }
    }
  }, [messages, pathname, router]);

  return (
    <AssistantSurfaceContext.Provider value={{ surface, clearSurface }}>
      <AssistantChatComposerProvider value={{ sendUserMessageToAssistant, inputDisabled }}>
      <div className="flex h-[100svh] max-h-[100svh] min-h-0 w-full overflow-hidden">
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            panelOpen && "md:pr-[min(28rem,100%)]",
          )}
        >
          {children}
        </div>

        {!panelOpen ? (
          <Button
            type="button"
            size="icon"
            variant="default"
            className="fixed bottom-6 right-6 z-50 size-12 rounded-full shadow-lg"
            aria-expanded={false}
            aria-label={t("assistant.openChatAria")}
            onClick={() => setPanelOpen(true)}
          >
            <IconMessageCircle className="size-5" aria-hidden />
          </Button>
        ) : null}

        {panelOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
              aria-label={t("assistant.closeAssistantAria")}
              onClick={() => setPanelOpen(false)}
            />
            <aside
              className={cn(
                "fixed inset-y-0 right-0 z-50 flex h-[100svh] max-h-[100svh] w-full max-w-md shrink-0 flex-col border-l border-border bg-popover shadow-xl",
              )}
              role="dialog"
              aria-label={t("assistant.chatDialogAria")}
              aria-modal="true"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                <h2 className="font-heading text-sm font-semibold">{t("assistant.title")}</h2>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t("assistant.closeAria")} onClick={() => setPanelOpen(false)}>
                  <IconX className="size-4" aria-hidden />
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {error ? (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    <p className="font-medium">{t("assistant.errorTitle")}</p>
                    <p className="mt-1 whitespace-pre-wrap text-destructive/90">{error.message}</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => clearError()}>{t("assistant.dismiss")}</Button>
                  </div>
                ) : null}
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("assistant.drawerEmpty")}</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {message.role === "user" ? t("assistant.roleYou") : t("assistant.roleAssistant")}
                      </span>
                      {message.parts.map((part, partIndex) => {
                        if (part.type === "text") {
                          return (
                            <div
                              key={partIndex}
                              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                            >
                              <div
                                className={cn(
                                  "max-w-[95%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                                  message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground",
                                )}
                              >
                                {part.text}
                              </div>
                            </div>
                          );
                        }
                        const toolLike = getToolPart(part);
                        if (toolLike && isSurfaceToolType(toolLike.type)) {
                          return <SurfaceToolPartMessage key={toolLike.toolCallId} part={toolLike} />;
                        }
                        return null;
                      })}
                    </div>
                  ))
                )}
                {(status === "submitted" || status === "streaming") && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-block size-2 animate-pulse rounded-full bg-muted-foreground" aria-hidden />
                    {t("assistant.thinking")}
                    <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => void stop()}>{t("assistant.stop")}</Button>
                  </div>
                )}
              </div>

              <MessageForm disabled={inputDisabled} onSend={sendUserMessageToAssistant} className="border-t border-border p-3" />
            </aside>
          </>
        ) : null}
      </div>
      </AssistantChatComposerProvider>
    </AssistantSurfaceContext.Provider>
  );
}