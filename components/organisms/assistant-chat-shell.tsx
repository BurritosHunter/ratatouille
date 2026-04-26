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
import { AssistantGeneratedUIContext } from "@/contexts/assistant-generated-ui-context";
import type { RecipeToolRow } from "@/lib/ai/recipe-tool-rows";
import {
  getGeneratedUIDataFieldsFromToolOutput,
  SUPPORTED_TOOL_TYPES,
  mergeAssistantGeneratedUIPayload,
  type AssistantGeneratedUIPayload,
} from "@/lib/assistant/generated-ui";
import { cn } from "@/lib/helpers/utils";
import { DefaultChatTransport, type UIDataTypes, type UIMessage, type UIMessagePart, type UITools } from "ai";

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


/* Utility */
function appendTextPartToMessage(targetMessageId: string, text: string) {
  return (previous: UIMessage[]) =>
    previous.map((message) => {
      if (message.id !== targetMessageId) { return message; }
      return {
        ...message,
        parts: [
          ...message.parts,
          { type: "text" as const, text },
        ],
      };
    });
}

/* Surface tools */
const SURFACE_TOOL_PART_TYPE_SET = new Set<string>(SUPPORTED_TOOL_TYPES);
function isToolTypeValid(type: string): type is (typeof SUPPORTED_TOOL_TYPES)[number] {
  return SURFACE_TOOL_PART_TYPE_SET.has(type);
}

function surfaceToolKindLabel(partType: string, t: TFunction<"translation">): string {
  switch (partType) {
    case "tool-listRecipesForUser":
      return t("assistant.toolKind.recipes");
    case "tool-setAssistantLayout":
      return t("assistant.toolKind.layout");
    case "tool-setAssistantBackground":
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


/* Recipes */
function buildRecipeListSummary(t: TFunction<"translation">, rows: RecipeToolRow[]): string {
  if (rows.length === 0) { return t("assistant.recipeListSummaryEmpty"); }

  const list = rows.map((row) => t("assistant.recipeListSummaryItem", { title: row.title })).join("\n");
  return t("assistant.recipeListSummaryWithList", { count: rows.length, list });
}



export function AssistantChatShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();

  const [generatedUI, setGeneratedUI] = useState<AssistantGeneratedUIPayload | null>(null);
  const clearSurface = useCallback(() => { setGeneratedUI(null); }, []);
  const [panelOpen, setPanelOpen] = useState(false);

  /* Chat */
  const { messages, sendMessage, setMessages, status, stop, error, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat", credentials: "include" }),
    onError: (chatError) => {
      if (process.env.NODE_ENV === "development") { console.error("[assistant]", chatError); }
    },
  });
  const inputDisabled = status === "submitted" || status === "streaming";
  const sendUserMessageToAssistant = useCallback((text: string) => {
    setPanelOpen(true);
    void sendMessage({ text });
  }, [sendMessage]);

  /* Pathname */
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (previousPathnameRef.current === "/assistant" && pathname !== "/assistant") {
      clearSurface(); /* Preview mounts only on /assistant; clear shell state when leaving that route. */
    }
    previousPathnameRef.current = pathname;
  }, [pathname]);


  /* On tool outputs */
  const processedToolIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    let routeChangedToAssistantPage = false;
    const navigateToAssistantPageIfNeeded = () => {
      if (routeChangedToAssistantPage || pathname === "/assistant") { return; }
      routeChangedToAssistantPage = true;
      queueMicrotask(() => {
        startTransition(() => {
          router.replace("/assistant");
        });
      });
    };
    const processSurfaceToolOutput = (
      messageId: string,
      toolType: (typeof SUPPORTED_TOOL_TYPES)[number],
      toolOutput: unknown,
      currentKey: string,
    ) => {
      if (processedToolIds.current.has(currentKey)) { return; }
      processedToolIds.current.add(currentKey);
      navigateToAssistantPageIfNeeded();

      const dataFields = getGeneratedUIDataFieldsFromToolOutput(toolType, toolOutput);
      if (dataFields === null) { return; }
      setGeneratedUI((previous) => mergeAssistantGeneratedUIPayload(previous, currentKey, dataFields));

      if (toolType !== "tool-listRecipesForUser" || !dataFields.recipes) { return; }
      setMessages(appendTextPartToMessage(messageId, buildRecipeListSummary(t, dataFields.recipes)));
    };

    for (const message of messages) {
      if (message.role !== "assistant") { continue; }

      for (const part of message.parts) {
        /* Validate tool */
        const tool = getToolPart(part);
        if (!tool || !isToolTypeValid(tool.type) || tool.state !== "output-available") { continue; }

        const currentKey = `${message.id}:${tool.toolCallId}`;
        processSurfaceToolOutput(message.id, tool.type, tool.output, currentKey);
      }
    }
  }, [messages, pathname, router, setGeneratedUI, setMessages, t]);

  return (
    <AssistantGeneratedUIContext.Provider value={{ generatedUI, clearSurface }}>
      <AssistantChatComposerProvider value={{ sendUserMessageToAssistant, inputDisabled }}>
      <div className="flex h-[100svh] max-h-[100svh] min-h-0 w-full overflow-hidden">
        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", panelOpen && "md:pr-[min(28rem,100%)]" )}>
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
              className={cn("fixed inset-y-0 right-0 z-50 flex h-[100svh] max-h-[100svh] w-full max-w-md shrink-0 flex-col border-l border-border bg-popover shadow-xl")}
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
                  <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
                            <div key={partIndex} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
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
                        if (toolLike && isToolTypeValid(toolLike.type)) {
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
    </AssistantGeneratedUIContext.Provider>
  );
}