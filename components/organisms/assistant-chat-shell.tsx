"use client";

import { useChat } from "@ai-sdk/react";
import { IconMessageCircle, IconX } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
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

const SURFACE_TOOL_PART_TYPE_SET = new Set<string>(ASSISTANT_SURFACE_TOOL_PART_TYPES);

function isSurfaceToolPartType(type: string): type is (typeof ASSISTANT_SURFACE_TOOL_PART_TYPES)[number] {
  return SURFACE_TOOL_PART_TYPE_SET.has(type);
}

type ToolLikePart = {
  type: string;
  toolCallId: string;
  state: string;
  errorText?: string;
  output?: unknown;
};

function asToolLikePart(part: UIMessagePart<UIDataTypes, UITools>): ToolLikePart | null {
  if (typeof part !== "object" || part === null) {
    return null;
  }
  if (!("toolCallId" in part) || !("state" in part) || !("type" in part)) {
    return null;
  }
  const candidate = part as Record<string, unknown>;
  if (typeof candidate.type !== "string" || typeof candidate.toolCallId !== "string" || typeof candidate.state !== "string") {
    return null;
  }
  return part as ToolLikePart;
}

function surfacePatchFromToolPart(
  part: ToolLikePart,
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

export function AssistantChatShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPathnameReference = useRef<string | undefined>(undefined);
  const [surface, setSurface] = useState<AssistantSurfacePayload | null>(null);
  const clearSurface = useCallback(() => {
    setSurface(null);
  }, []);
  const [panelOpen, setPanelOpen] = useState(false);
  const processedSurfaceCallIdsReference = useRef<Set<string>>(new Set());
  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      credentials: "include",
    }),
    onError: (chatError) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[assistant]", chatError);
      }
    },
  });

  const inputDisabled = status === "submitted" || status === "streaming";

  useEffect(() => {
    /* Hide tool preview when the user navigates to another view (pathname is the routing source of truth). */
    if (previousPathnameReference.current !== undefined && previousPathnameReference.current !== pathname) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on client route change
      setSurface(null);
    }
    previousPathnameReference.current = pathname;
  }, [pathname]);

  useEffect(() => {
    /* Sync tool results to layout preview state. Not useMemo(messages): Clear must hide the panel without stripping chat history.
     * Dedupe by assistant message id + toolCallId so a new turn can reuse the same toolCallId (e.g. mock model) and still merge. */
    for (const message of messages) {
      if (message.role !== "assistant") {
        continue;
      }
      for (const part of message.parts) {
        const toolLike = asToolLikePart(part);
        if (!toolLike || !isSurfaceToolPartType(toolLike.type)) {
          continue;
        }
        if (toolLike.state !== "output-available") {
          continue;
        }
        const dedupeKey = `${message.id}:${toolLike.toolCallId}`;
        if (processedSurfaceCallIdsReference.current.has(dedupeKey)) {
          continue;
        }
        processedSurfaceCallIdsReference.current.add(dedupeKey);
        const patch = surfacePatchFromToolPart(toolLike);
        if (patch === null) {
          continue;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- see block comment above
        setSurface((previous) => mergeAssistantSurfacePayload(previous, dedupeKey, patch));
      }
    }
  }, [messages]);

  return (
    <AssistantSurfaceContext.Provider value={{ surface, clearSurface }}>
      <div className="flex h-svh w-full overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>

        {!panelOpen ? (
          <Button
            type="button"
            size="icon"
            variant="default"
            className="fixed bottom-6 right-6 z-50 size-12 rounded-full shadow-lg"
            aria-expanded={false}
            aria-label="Open assistant"
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
              aria-label="Close assistant"
              onClick={() => setPanelOpen(false)}
            />
            <aside
              className={cn(
                "flex h-svh shrink-0 flex-col border-l border-border bg-popover shadow-xl",
                "max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-50 max-md:w-full max-md:max-w-md",
                "md:h-svh md:max-w-md md:flex-none md:basis-[min(28rem,100%)]",
              )}
              role="dialog"
              aria-label="Assistant chat"
              aria-modal="true"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                <h2 className="font-heading text-sm font-semibold">Assistant</h2>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setPanelOpen(false)}>
                  <IconX className="size-4" aria-hidden />
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {error ? (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    <p className="font-medium">Something went wrong</p>
                    <p className="mt-1 whitespace-pre-wrap text-destructive/90">{error.message}</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => clearError()}>
                      Dismiss
                    </Button>
                  </div>
                ) : null}
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ask anything about your recipes—for example, “What recipes do I have?” Tool output (layout, color square, recipes) appears in the main layout above the page.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {message.role === "user" ? "You" : "Assistant"}
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
                        const toolLike = asToolLikePart(part);
                        if (toolLike && isSurfaceToolPartType(toolLike.type)) {
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
                    Thinking…
                    <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => void stop()}>
                      Stop
                    </Button>
                  </div>
                )}
              </div>

              <AssistantChatInput
                disabled={inputDisabled}
                onSend={(text) => {
                  void sendMessage({ text });
                }}
              />
            </aside>
          </>
        ) : null}
      </div>
    </AssistantSurfaceContext.Provider>
  );
}

function surfaceToolLabel(partType: string): string {
  switch (partType) {
    case "tool-listRecipesForUser":
      return "recipes";
    case "tool-setAssistantLayout":
      return "layout";
    case "tool-setAssistantBackgroundRed":
    case "tool-setAssistantBackgroundBlue":
    case "tool-setAssistantBackgroundGreen":
      return "color square";
    default:
      return "tool";
  }
}

function SurfaceToolPartMessage({ part }: { part: ToolLikePart }) {
  const callId = part.toolCallId;
  const label = surfaceToolLabel(part.type);

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <div key={callId} className="text-sm text-muted-foreground">
          Running {label} tool…
        </div>
      );
    case "output-available":
      return (
        <p key={callId} className="text-sm text-muted-foreground">
          Updated main layout ({label}).
        </p>
      );
    case "output-error":
      return (
        <p key={callId} className="text-sm text-destructive">
          {label} tool failed: {part.errorText ?? "Unknown error."}
        </p>
      );
    default:
      return null;
  }
}

function AssistantChatInput({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      className="shrink-0 border-t border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setValue("");
      }}
    >
      <div className="flex gap-2">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
          rows={2}
          placeholder="Message…"
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[2.5rem] w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Message"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              const trimmed = value.trim();
              if (!trimmed || disabled) return;
              onSend(trimmed);
              setValue("");
            }
          }}
        />
        <Button type="submit" disabled={disabled || !value.trim()} aria-busy={disabled}>
          Send
        </Button>
      </div>
    </form>
  );
}
