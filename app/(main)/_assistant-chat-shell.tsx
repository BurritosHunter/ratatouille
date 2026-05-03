"use client";

import { useChat } from "@ai-sdk/react";
import { IconMessageCircle, IconX } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageForm } from "@/components/organisms/message-form";
import { Button } from "@/components/ui/button";
import { AssistantChatComposerProvider } from "@/contexts/assistant-chat-composer-context";
import { GeneratedUIContext } from "@/contexts/assistant-generated-ui-context";
import { DEFAULT_ASSISTANT_MOCK_SCENARIO, readAssistantMockAiOverride, readAssistantMockScenarioOverride, type AssistantMockScenario } from "@/lib/assistant-mock-ai-preference";
import { mergeGeneratedUIPayload, SUPPORTED_TOOL_TYPES, tryParseToolData, type GeneratedUIPayload } from "@/lib/generated-ui";
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
  if (typeof part !== "object" || part === null) return null;

  const candidate = part as Record<string, unknown>;
  const partType = candidate.type;
  if (typeof partType !== "string" || !partType.startsWith("tool-")) return null;
  if (typeof candidate.toolCallId !== "string" || typeof candidate.state !== "string") return null;

  return part as ToolPart;
}
const SUPPORTED_TOOL_TYPES_SET = new Set<string>(SUPPORTED_TOOL_TYPES);
function isSupportedToolType(type: string): type is (typeof SUPPORTED_TOOL_TYPES)[number] {
  return SUPPORTED_TOOL_TYPES_SET.has(type);
}

const ASSISTANT_ACCESS_STORAGE_KEY = "ratatouille-assistant-access-enabled";

function readAssistantAccessFromStorage(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(ASSISTANT_ACCESS_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function writeAssistantAccessToStorage(enabled: boolean): void {
  try {
    window.localStorage.setItem(ASSISTANT_ACCESS_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    /* Quota or private mode */
  }
}

export function AssistantChatShell({ children }: { children: ReactNode }) {
  const { t: translate } = useTranslation();
  const router = useRouter();
  
  /* Chat & Generated UI */
  const [panelOpen, setPanelOpen] = useState(false);
  const [assistantAccessEnabled, setAssistantAccessEnabledState] = useState(true);
  const [generatedUI, setGeneratedUI] = useState<GeneratedUIPayload | null>(null);
  const clearGeneratedUI = useCallback(() => { setGeneratedUI(null); }, []);
  /** Dev: defaults from `/api/assistant/dev-ai-mode` until `localStorage` overrides exist. */
  const devChatMockDefaultRef = useRef<boolean | null>(null);
  const devChatMockScenarioRef = useRef<AssistantMockScenario | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    void fetch("/api/assistant/dev-ai-mode", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (data: { defaultUseMock?: boolean; defaultMockScenario?: string } | null) => {
          if (data && typeof data.defaultUseMock === "boolean") {
            devChatMockDefaultRef.current = data.defaultUseMock;
          }
          if (
            data?.defaultMockScenario === "surface" ||
            data?.defaultMockScenario === "recipes" ||
            data?.defaultMockScenario === "pantry"
          ) {
            devChatMockScenarioRef.current = data.defaultMockScenario;
          }
        },
      )
      .catch(() => {});
  }, []);

  /** Refs below are read only inside `prepareSendMessagesRequest` (when sending), not synchronously during render. */
  /* eslint-disable react-hooks/refs -- false positive: callback runs on transport send */
  const assistantChatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        credentials: "include",
        prepareSendMessagesRequest: (request) => {
          const { body, headers, id, messages, trigger, messageId } = request;
          const outgoingBody = {
            ...(body ?? {}),
            id,
            messages,
            trigger,
            messageId,
          };
          const headerRecord: Record<string, string> =
            headers instanceof Headers
              ? Object.fromEntries(headers.entries())
              : { ...((headers as Record<string, string> | undefined) ?? {}) };

          if (process.env.NODE_ENV === "production") { return { body: outgoingBody }; }

          const fromStorage = readAssistantMockAiOverride();
          const useMockAi = fromStorage ?? devChatMockDefaultRef.current;
          if (useMockAi === null) { return { body: outgoingBody }; }

          const scenario =
            readAssistantMockScenarioOverride() ??
            devChatMockScenarioRef.current ??
            DEFAULT_ASSISTANT_MOCK_SCENARIO;

          return {
            body: outgoingBody,
            headers: {
              ...headerRecord,
              "x-ratatouille-mock-ai": useMockAi ? "true" : "false",
              "x-ratatouille-mock-scenario": scenario,
            },
          };
        },
      }),
    [],
  );
  /* eslint-enable react-hooks/refs */

  const { messages, sendMessage, setMessages, status, stop, error, clearError } = useChat({
    transport: assistantChatTransport,
    onError: (chatError) => {
      if (process.env.NODE_ENV === "development") console.error("[assistant]", chatError);
    },
  });
  const chatBlockedByStatus = status === "submitted" || status === "streaming";
  const formsDisabled = chatBlockedByStatus || !assistantAccessEnabled;

  useLayoutEffect(() => {
    setAssistantAccessEnabledState(readAssistantAccessFromStorage());
  }, []);

  const setAssistantAccessEnabled = useCallback((enabled: boolean) => {
    setAssistantAccessEnabledState(enabled);
    writeAssistantAccessToStorage(enabled);
  }, []);

  useEffect(() => {
    if (!assistantAccessEnabled) setPanelOpen(false);
  }, [assistantAccessEnabled]);

  const sendUserMessageToAssistant = useCallback(
    (text: string) => {
      if (!assistantAccessEnabled) return;
      setPanelOpen(true);
      void sendMessage({ text });
    },
    [assistantAccessEnabled, sendMessage],
  );

  const composerContextValue = useMemo(
    () => ({
      sendUserMessageToAssistant,
      inputDisabled: formsDisabled,
      assistantAccessEnabled,
      setAssistantAccessEnabled,
    }),
    [sendUserMessageToAssistant, formsDisabled, assistantAccessEnabled, setAssistantAccessEnabled],
  );

  /* Pathname */
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (previousPathnameRef.current === "/assistant" && pathname !== "/assistant") {
      /* Preview mounts only on /assistant; clear shell state when leaving that route. */
      queueMicrotask(() => setGeneratedUI(null));
    }
    previousPathnameRef.current = pathname;
  }, [pathname]);

  /* Handle tool outputs */
  const processedToolIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    let routeChangedToAssistantPage = false;

    const navigateToAssistantPageIfNeeded = () => {
      if (routeChangedToAssistantPage || pathname === "/assistant") return;

      routeChangedToAssistantPage = true;
      queueMicrotask(() => {
        startTransition(() => {
          router.replace("/assistant");
        });
      });
    };

    for (const message of messages) {
      if (message.role !== "assistant") continue;

      for (const part of message.parts) {
        /* Validate If Tool Is Supported */
        const tool = getToolPart(part);
        if (!tool || !isSupportedToolType(tool.type) || tool.state !== "output-available") continue;

        /* Check If Already Processed */
        const currentKey = `${message.id}:${tool.toolCallId}`;
        if (processedToolIds.current.has(currentKey)) continue;
        processedToolIds.current.add(currentKey);

        /* Navigate */
        navigateToAssistantPageIfNeeded();


        /* Merge Data Fields */
        const dataFields = tryParseToolData(tool.type, tool.output);
        if (dataFields === null) continue;
        setGeneratedUI((previous) => mergeGeneratedUIPayload(previous, currentKey, dataFields));
      }
    }
  }, [messages, pathname, router, setGeneratedUI, setMessages, translate]);


  return (
    <GeneratedUIContext.Provider value={{ generatedUI, clearGeneratedUI }}>
      <AssistantChatComposerProvider value={composerContextValue}>
        <div className="flex h-[100svh] max-h-[100svh] min-h-0 w-full overflow-hidden">
          <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", panelOpen && "md:pr-[min(28rem,100%)]")}>
            {children}
          </div>
          {assistantAccessEnabled && !panelOpen ? (
            <Button
              type="button"
              size="icon"
              variant="default"
              className="fixed right-6 bottom-6 z-50 size-12 rounded-full shadow-lg"
              aria-expanded={false}
              aria-label={translate("assistant.openChatAria")}
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
                aria-label={translate("assistant.closeAssistantAria")}
                onClick={() => setPanelOpen(false)}
              />
              <aside
                className={cn("fixed inset-y-0 right-0 z-50 flex h-[100svh] max-h-[100svh] w-full max-w-md shrink-0 flex-col border-l border-border bg-popover shadow-xl")}
                role="dialog"
                aria-label={translate("assistant.chatDialogAria")}
                aria-modal="true"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="font-heading text-sm font-semibold">{translate("assistant.title")}</h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={translate("assistant.closeAria")}
                    onClick={() => setPanelOpen(false)}
                  >
                    <IconX className="size-4" aria-hidden />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                  {error ? (
                    <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <p className="font-medium">{translate("assistant.errorTitle")}</p>
                      <p className="mt-1 whitespace-pre-wrap text-destructive/90">{error.message}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => clearError()}
                      >
                        {translate("assistant.dismiss")}
                      </Button>
                    </div>
                  ) : null}
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{translate("assistant.drawerEmpty")}</p>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="space-y-2">
                        {message.role === "assistant" ? (<span className="text-xs font-medium text-muted-foreground">{translate("assistant.roleAssistant")}</span>) : null}
                        {message.parts.map((messagePart, partIndex) => {
                          if (messagePart.type === "text") {
                            return (
                              <div
                                key={partIndex}
                                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                              >
                                <div
                                  className={cn(
                                    "max-w-[95%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                  )}
                                >
                                  {messagePart.text}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    ))
                  )}
                  {(status === "submitted" || status === "streaming") && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-block size-2 animate-pulse rounded-full bg-muted-foreground" aria-hidden />
                      {translate("assistant.thinking")}
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => void stop()}
                      >
                        {translate("assistant.stop")}
                      </Button>
                    </div>
                  )}
                </div>
                <MessageForm
                  disabled={formsDisabled}
                  onSend={sendUserMessageToAssistant}
                  className="border-t border-border p-3"
                />
              </aside>
            </>
          ) : null}
        </div>
      </AssistantChatComposerProvider>
    </GeneratedUIContext.Provider>
  );
}
