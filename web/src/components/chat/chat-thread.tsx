import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
  Conversation,
  ConversationBubble,
  ConversationContent,
} from "@/components/ui/conversation";
import { MarkCopy, MarkFileText, MarkResend } from "@/components/marks";
import { renderAiContent, renderInlineMarkdown } from "@/lib/ai";
import { formatSize } from "@/lib/files";
import type { Hit } from "@/lib/anonymize";
import type { ChatMessage } from "@/lib/store";
import { enterProps } from "./chat-motion";

export function ChatThread({
  messages,
  error,
  busy,
  reveal,
  streamingId,
  model,
  isFresh,
  onResend,
}: {
  messages: ChatMessage[];
  error: string;
  busy: boolean;
  reveal: boolean;
  streamingId: string | null;
  model: string;
  isFresh: (id: string) => boolean;
  onResend: (message: ChatMessage) => void;
}) {
  const reduce = useReducedMotion();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const enter = (skip: boolean) => enterProps(skip, reduce);

  function copy(id: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
  }

  return (
    <Conversation className="mx-auto max-w-3xl gap-3 py-6">
      {messages.map((m) => {
        const hits = m.hits ? uniqueHits(m.hits) : [];
        return m.role === "user" ? (
          <ConversationBubble key={m.id} id={m.id} align="end" variant="default" sentAt={time(m.at)}>
            <ConversationContent render={<motion.div {...enter(!isFresh(m.id))} />}>
              {(m.content || m.masked) && (
                <p className="whitespace-pre-wrap">
                  {renderInlineMarkdown(reveal ? m.content : m.masked || m.content)}
                </p>
              )}
              {m.attachments?.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="mt-1.5 flex items-center gap-1.5 rounded-md border border-current/15 px-2 py-1 text-[11px]"
                >
                  <MarkFileText className="size-3.5 shrink-0 opacity-70" />
                  <span className="max-w-44 truncate">{file.name}</span>
                  <span className="shrink-0 opacity-60">{formatSize(file.size)}</span>
                </div>
              ))}
              {hits.length > 0 && (
                <p className="mt-2 text-[11px] opacity-70">
                  {hits.map((h) => (reveal ? `${h.kind} ${h.value}` : h.token)).join("  ")}
                </p>
              )}
              <div className="mt-1.5 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => copy(m.id, reveal ? m.content : m.masked || m.content)}
                  className="rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                  title={copiedId === m.id ? "Copied!" : "Copy message"}
                  aria-label={copiedId === m.id ? "Copied" : "Copy message"}
                >
                  {copiedId === m.id ? (
                    <span className="text-[10px]">Copied!</span>
                  ) : (
                    <MarkCopy className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onResend(m)}
                  disabled={busy}
                  className="rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 disabled:opacity-30"
                  title="Resend message"
                  aria-label="Resend message"
                >
                  <MarkResend className="size-3.5" />
                </button>
              </div>
            </ConversationContent>
          </ConversationBubble>
        ) : (
          <ConversationBubble key={m.id} id={m.id} align="start" variant="ghost" sentAt={time(m.at)}>
            <ConversationContent className="p-0" render={<motion.div {...enter(!isFresh(m.id))} />}>
              {m.held && <div className="mb-1 text-[11px] opacity-60">Held locally</div>}
              <div className="flex flex-col gap-2">
                <div className={m.id === streamingId ? "t-stream" : undefined}>
                  {renderAiContent(reveal ? m.masked || m.content : m.content)}
                </div>
                <button
                  type="button"
                  onClick={() => copy(m.id, reveal ? m.masked || m.content : m.content)}
                  className="text-xs text-faint hover:text-fg self-start"
                  title={copiedId === m.id ? "Copied!" : "Copy message"}
                >
                  {copiedId === m.id ? "Copied!" : <MarkCopy className="size-3.5" />}
                </button>
              </div>
            </ConversationContent>
          </ConversationBubble>
        );
      })}
      <AnimatePresence initial={false}>
        {busy && !streamingId && (
          <ConversationBubble key="thinking" align="start" variant="ghost">
            <ConversationContent
              className="p-0"
              render={
                <motion.div
                  {...enter(false)}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  aria-label={`Waiting on ${model}`}
                />
              }
            >
              <span className="t-msg-dots" role="status">
                <span className="sr-only">Thinking</span>
                <span aria-hidden className="t-msg-dot [--msg-dot-index:0]" />
                <span aria-hidden className="t-msg-dot [--msg-dot-index:1]" />
                <span aria-hidden className="t-msg-dot [--msg-dot-index:2]" />
              </span>
            </ConversationContent>
          </ConversationBubble>
        )}
      </AnimatePresence>
      {error && <p className="text-sm text-danger">{error}</p>}
    </Conversation>
  );
}

function uniqueHits(hits: Hit[]) {
  const seen = new Set<string>();
  return hits.filter((h) => {
    if (seen.has(h.token)) return false;
    seen.add(h.token);
    return true;
  });
}

function time(at?: number) {
  return at ? new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : undefined;
}
