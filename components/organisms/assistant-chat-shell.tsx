"use client"

import { useChat } from "@ai-sdk/react"
import { IconMessageCircle, IconX } from "@tabler/icons-react"
import type { ReactNode } from "react"
import { useState } from "react"

import { RecipeListRowLink } from "@/components/molecules/recipe-list-row-link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/helpers/utils"
import { DefaultChatTransport } from "ai"

export function AssistantChatShell({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  })

  return (
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
              "flex h-svh w-full max-w-md shrink-0 flex-col border-l border-border bg-popover shadow-xl",
              "max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-50",
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
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ask anything about your recipes—for example, “What recipes do I have?”
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
                      )
                    }
                    if (part.type === "tool-listRecipesForUser") {
                      const callId = part.toolCallId
                      switch (part.state) {
                        case "input-streaming":
                        case "input-available":
                          return (
                            <div key={callId} className="text-sm text-muted-foreground">
                              Loading recipes…
                            </div>
                          )
                        case "output-available": {
                          const output = part.output as {
                            recipes: { recipeId: number; title: string; thumbSrc: string | null }[]
                          }
                          const recipes = output.recipes ?? []
                          if (recipes.length === 0) {
                            return (
                              <p key={callId} className="text-sm text-muted-foreground">
                                No recipes yet.
                              </p>
                            )
                          }
                          return (
                            <ul key={callId} className="flex flex-col gap-2">
                              {recipes.map((recipe) => (
                                <li key={recipe.recipeId}>
                                  <RecipeListRowLink
                                    recipeId={recipe.recipeId}
                                    title={recipe.title}
                                    thumbSrc={recipe.thumbSrc}
                                  />
                                </li>
                              ))}
                            </ul>
                          )
                        }
                        case "output-error":
                          return (
                            <p key={callId} className="text-sm text-destructive">
                              {part.errorText ?? "Could not load recipes."}
                            </p>
                          )
                        default:
                          return null
                      }
                    }
                    return null
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
            disabled={status !== "ready"}
            onSend={(text) => {
              void sendMessage({ text })
            }}
          />
          </aside>
        </>
      ) : null}
    </div>
  )
}

function AssistantChatInput({
  disabled,
  onSend,
}: {
  disabled: boolean
  onSend: (text: string) => void
}) {
  const [value, setValue] = useState("")

  return (
    <form
      className="shrink-0 border-t border-border p-3"
      onSubmit={(event) => {
        event.preventDefault()
        const trimmed = value.trim()
        if (!trimmed || disabled) return
        onSend(trimmed)
        setValue("")
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
              event.preventDefault()
              const trimmed = value.trim()
              if (!trimmed || disabled) return
              onSend(trimmed)
              setValue("")
            }
          }}
        />
        <Button type="submit" disabled={disabled || !value.trim()}>
          Send
        </Button>
      </div>
    </form>
  )
}
