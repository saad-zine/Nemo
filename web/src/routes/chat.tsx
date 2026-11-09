import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Composer, type ComposerPayload } from "@/components/composer";
import { MarkFileText, MarkIncognito, MarkCopy, MarkPencil } from "@/components/marks";
import {
  Conversation,
  ConversationBubble,
  ConversationContent,
} from "@/components/ui/conversation";
import { anonymize, restore, type Hit } from "@/lib/anonymize";
import { renderAiContent } from "@/lib/ai";
import { relayChat } from "@/lib/relay";
import { takeDraft } from "@/lib/draft";
import { formatSize } from "@/lib/files";
import { useVault, type ChatAttachment, type ChatMessage } from "@/lib/store";

export const Route = createFileRoute("/chat")({ component: Relay });

// Entrance used by the Kobra Conversation demo: rise 8px out of a 4px blur.
const EASE = [0.22, 1, 0.36, 1] as const;
const ENTER_FROM = { opacity: 0, y: 8, filter: "blur(4px)" };
const ENTER_TO = { opacity: 1, y: 0, filter: "blur(0px)" };

function Relay() {
  const threads = useVault((s) => s.threads);
  const activeId = useVault((s) => s.activeId);
  const pushMessage = useVault((s) => s.pushMessage);
  const createThread = useVault((s) => s.createThread);
  const setAutoAnonymize = useVault((s) => s.setAutoAnonymize);
  const setNewSessionAutoAnonymize = useVault((s) => s.setNewSessionAutoAnonymize);
  const newSessionAutoAnonymize = useVault((s) => s.newSessionAutoAnonymize);
  const record = useVault((s) => s.record);
  const remember = useVault((s) => s.remember);
  const updateMessage = useVault((s) => s.updateMessage);
  const apiKey = useVault((s) => s.apiKey);
  const provider = useVault((s) => s.provider);
  const model = useVault((s) => s.model);
  const baseUrl = useVault((s) => s.baseUrl);
  const restoreReplies = useVault((s) => s.restoreReplies);
  const renameThread = useVault((s) => s.renameThread);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  const thread = activeId ? threads.find((t) => t.id === activeId) : undefined;
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState(false);
  const [incognito, setIncognito] = useState(false);
  const [ephemeral, setEphemeral] = useState<ChatMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const autoAnonymizeUpcoming = thread
    ? (thread.autoAnonymize ?? false)
    : newSessionAutoAnonymize;

  function toggleConversationAutoAnonymize() {
    if (thread) {
      setAutoAnonymize(thread.id, !thread.autoAnonymize);
    } else {
      setNewSessionAutoAnonymize(!newSessionAutoAnonymize);
    }
  }

  useEffect(() => {
    setPendingMessages([]);
  }, [activeId]);

  async function send(draft: ComposerPayload) {
    const state = useVault.getState();
    const prompt = draft.text.trim();
    if ((!prompt && draft.attachments.length === 0) || busy) return;
    const activeThread = thread;
    setError("");

    const isAnonymizeActive = draft.anonymize || autoAnonymizeUpcoming;
    const maskPrompt = isAnonymizeActive && (state.anonymizeScope === "both" || state.anonymizeScope === "text");
    const maskFiles = isAnonymizeActive && (state.anonymizeScope === "both" || state.anonymizeScope === "file");

    let promptMasked = prompt;
    let promptHits: Hit[] = [];
    if (maskPrompt && prompt) {
      const result = anonymize(prompt, state.ledger, state.strict);
      promptMasked = result.text;
      promptHits = result.hits.filter((h) => prompt.includes(h.value));
    }

    const knownHits = [...state.ledger, ...promptHits];
    const files: ChatAttachment[] = draft.attachments.map((file) => {
      if (!maskFiles) {
        return { name: file.name, size: file.size, content: file.text };
      }
      const result = anonymize(file.text, knownHits, state.strict);
      const hits = result.hits.filter((h) => file.text.includes(h.value));
      knownHits.push(...hits);
      return {
        name: file.name,
        size: file.size,
        content: file.text,
        masked: result.text,
        hits,
      };
    });

    const allHits = [...promptHits, ...files.flatMap((file) => file.hits ?? [])];
    const fresh = allHits.filter(
      (hit, index) =>
        !state.ledger.some((prior) => prior.token === hit.token && prior.value === hit.value) &&
        allHits.findIndex((h) => h.token === hit.token && h.value === hit.value) === index,
    );
    const seed = prompt || files[0]?.name || "";
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).slice(2, 10),
      role: "user",
      content: prompt,
      masked: promptMasked,
      hits: allHits,
      attachments: files.length > 0 ? files : undefined,
    };
    const history = (
      incognito
        ? [...ephemeral, userMsg]
        : activeThread
          ? [...activeThread.messages, userMsg]
          : [...pendingMessages, userMsg]
    ).filter((message) => !message.held);

    if (incognito) {
      setEphemeral((prev) => [...prev, userMsg]);
    } else if (activeThread) {
      pushMessage(activeThread.id, userMsg);
      remember(allHits);
      record(
        {
          kind: "chat",
          title: seed.replace(/\s+/g, " ").slice(0, 48) || "Attached file",
          entities: allHits.length,
        },
        fresh.length,
      );
    } else {
      setPendingMessages([userMsg]);
    }

    if (apiKey.trim().length < 8) {
      const held: ChatMessage = {
        id: Math.random().toString(36).slice(2, 10),
        role: "assistant",
        held: true,
        content:
          "Nothing was sent. Add a key and this anonymized transcript is the only text your model will receive.",
        masked: promptMasked,
      };
      if (incognito) {
        setEphemeral((prev) => [...prev, held]);
      } else if (activeThread) {
        pushMessage(activeThread.id, held);
      } else {
        createThread([userMsg, held], isAnonymizeActive);
        setPendingMessages([]);
      }
      return;
    }

    setBusy(true);
    let targetThreadId = activeThread?.id;

    try {
      const response = await relayChat({
        data: {
          provider,
          apiKey: apiKey.trim(),
          model,
          baseUrl: baseUrl || "https://api.openai.com/v1",
          messages: buildWire(history, provider),
        },
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        const held: ChatMessage = {
          id: Math.random().toString(36).slice(2, 10),
          role: "assistant",
          content: errorBody.error || `Upstream ${response.status}`,
          held: true,
        };
        if (incognito) {
          setEphemeral((prev) => [...prev, held]);
        } else if (activeThread) {
          pushMessage(activeThread.id, held);
        } else {
          createThread([userMsg, held], isAnonymizeActive);
          setPendingMessages([]);
        }
      } else {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const json = (await response.json().catch(() => ({}))) as {
            ok?: boolean;
            text?: string;
            error?: string;
          };
          if (json.ok === false) {
            const held: ChatMessage = {
              id: Math.random().toString(36).slice(2, 10),
              role: "assistant",
              content: json.error || "Request failed",
              held: true,
            };
            if (incognito) {
              setEphemeral((prev) => [...prev, held]);
            } else if (activeThread) {
              pushMessage(activeThread.id, held);
            } else {
              createThread([userMsg, held], isAnonymizeActive);
              setPendingMessages([]);
            }
          } else {
            const raw = json.text || "";
            const shown = restoreReplies
              ? restore(raw, [...state.ledger, ...allHits])
              : raw;
            const reply: ChatMessage = {
              id: Math.random().toString(36).slice(2, 10),
              role: "assistant",
              content: shown,
              masked: raw,
            };
            if (incognito) {
              setEphemeral((prev) => [...prev, reply]);
            } else if (activeThread) {
              pushMessage(activeThread.id, reply);
            } else {
              createThread([userMsg, reply], isAnonymizeActive);
              setPendingMessages([]);
              remember(allHits);
              record(
                {
                  kind: "chat",
                  title: seed.replace(/\s+/g, " ").slice(0, 48) || "Attached file",
                  entities: allHits.length,
                },
                fresh.length,
              );
            }
          }
        } else {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";
          const streamId = Math.random().toString(36).slice(2, 10);
          const placeholder: ChatMessage = {
            id: streamId,
            role: "assistant",
            content: "",
            masked: "",
          };
          if (incognito) {
            setEphemeral((prev) => [...prev, placeholder]);
          } else if (activeThread) {
            pushMessage(activeThread.id, placeholder);
          } else {
            setPendingMessages([userMsg, placeholder]);
          }
          let done = false;
          while (!done) {
            const { value, done: doneReading } = await reader!.read();
            done = doneReading;
            if (value) {
              accumulated += decoder.decode(value, { stream: true });
              const shown = restoreReplies
                ? restore(accumulated, [...state.ledger, ...allHits])
                : accumulated;
              const patch = { content: shown, masked: accumulated };
              if (incognito) {
                setEphemeral((prev) =>
                  prev.map((m) => (m.id === streamId ? { ...m, ...patch } : m))
                );
              } else if (targetThreadId) {
                updateMessage(targetThreadId, streamId, patch);
              } else {
                const newId = createThread(
                  [userMsg, { ...placeholder, ...patch }],
                  isAnonymizeActive,
                );
                targetThreadId = newId;
                setPendingMessages([]);
                remember(allHits);
                record(
                  {
                    kind: "chat",
                    title: seed.replace(/\s+/g, " ").slice(0, 48) || "Attached file",
                    entities: allHits.length,
                  },
                  fresh.length,
                );
              }
            }
          }
        }
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const draft = takeDraft();
    if (draft) void send(draft);
    // only consume a draft queued from the home composer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messages = useMemo(
    () => (incognito ? ephemeral : (thread ? thread.messages : pendingMessages)),
    [incognito, ephemeral, thread, pendingMessages],
  );
  const userPrompts = useMemo(
    () => messages.filter((m) => m.role === "user"),
    [messages],
  );
  const empty = messages.length === 0;

  // Auto-scroll to the newest message whenever the conversation changes.
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // Messages already in the thread when it opens render in place; only new ones animate in.
  const reduce = useReducedMotion();
  const conversationKey = incognito ? "__incognito__" : (thread?.id || "__draft__");
  const known = useRef<{ thread?: string; ids: Set<string> }>({ ids: new Set() });
  if (known.current.thread !== conversationKey) {
    known.current = { thread: conversationKey, ids: new Set(messages.map((m) => m.id)) };
  }
  const fresh = (id: string) => !known.current.ids.has(id);
  const enter = (skip: boolean) => ({
    layout: !reduce,
    initial: skip || reduce ? false : ENTER_FROM,
    animate: ENTER_TO,
    transition: { duration: 0.32, ease: EASE, layout: { type: "spring" as const, duration: 0.5, bounce: 0 } },
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative flex h-12 shrink-0 items-center justify-between px-4 border-b border-line/40">
        <div className="flex items-center gap-2 z-10">
          <button
            type="button"
            role="switch"
            aria-checked={autoAnonymizeUpcoming}
            onClick={toggleConversationAutoAnonymize}
            title="Anonymize all upcoming messages in this conversation automatically"
            className="flex items-center gap-2 cursor-pointer outline-none select-none text-muted transition-colors hover:text-fg"
          >
            <span className={`text-xs font-medium transition-colors ${autoAnonymizeUpcoming ? "text-fg" : "text-muted"}`}>
              Auto-anonymize
            </span>
            <span
              className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors duration-200 ${
                autoAnonymizeUpcoming ? "bg-lime" : "bg-line"
              }`}
            >
              <span
                className={`size-2.5 rounded-full shadow-sm transition-transform duration-200 ${
                  autoAnonymizeUpcoming ? "translate-x-3 bg-ink" : "translate-x-0.5 bg-fg"
                }`}
              />
            </span>
          </button>
        </div>

        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
          {!incognito && !empty && thread && (
            <div className="pointer-events-auto flex items-center gap-2">
              {editingTitle ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (titleInput.trim()) renameThread(thread.id, titleInput);
                    setEditingTitle(false);
                  }}
                >
                  <input
                    autoFocus
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={() => setEditingTitle(false)}
                    className="bg-surface px-2 py-0.5 text-sm font-bold text-fg outline-none rounded border border-line"
                  />
                </form>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-fg">{thread.title}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTitleInput(thread.title);
                      setEditingTitle(true);
                    }}
                    className="text-muted hover:text-fg"
                    title="Rename conversation"
                  >
                    <MarkPencil className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={() => {
              setIncognito((v) => !v);
              setEphemeral([]);
              setError("");
            }}
            aria-pressed={incognito}
            title="Incognito chat — messages are not saved"
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] transition-colors ${
              incognito ? "bg-raised text-fg" : "text-faint hover:text-fg"
            }`}
          >
            <MarkIncognito className="size-3.5" />
            <span className="hidden sm:inline">Incognito</span>
          </button>
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="text-xs text-faint hover:text-fg"
          >
            {reveal ? "Hide originals" : "Originals"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 flex overflow-hidden">
        <div className="min-h-0 flex-1 flex flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 no-scrollbar">
            {empty ? (
              <div className="flex h-full flex-col items-center justify-center pb-16">
                {incognito && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-[11px] text-muted">
                    <MarkIncognito className="size-3.5" /> Incognito
                  </span>
                )}
                <p className="mt-5 max-w-md text-center text-sm leading-relaxed text-muted">
                  {incognito
                    ? "This conversation stays in this tab and is never saved."
                    : "Ask a question, paste a note, or point at a file. Sensitive spans are stripped before anything reaches your model."}
                </p>
              </div>
            ) : (
              <Conversation className="mx-auto max-w-3xl gap-3 py-6">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <ConversationBubble key={m.id} id={m.id} align="end" variant="default" sentAt={time(m.at)}>
                      <ConversationContent render={<motion.div {...enter(!fresh(m.id))} />}>
                        {(m.content || m.masked) && (
                          <p className="whitespace-pre-wrap">
                            {reveal ? m.content : m.masked || m.content}
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
                        {m.hits && uniqueHits(m.hits).length > 0 && (
                          <p className="mt-2 text-[11px] opacity-70">
                            {uniqueHits(m.hits)
                              .map((h) => (reveal ? `${h.kind} ${h.value}` : h.token))
                              .join("  ")}
                          </p>
                        )}
                      </ConversationContent>
                    </ConversationBubble>
                  ) : (
                    <ConversationBubble key={m.id} id={m.id} align="start" variant="muted" sentAt={time(m.at)}>
                      <ConversationContent render={<motion.div {...enter(!fresh(m.id))} />}>
                        {m.held && <div className="mb-1 text-[11px] opacity-60">Held locally</div>}
                        <div className="flex flex-col gap-2">
                          {renderAiContent(reveal ? m.masked || m.content : m.content)}
                          <button
                            type="button"
                            onClick={() => {
                              const text = reveal ? m.masked || m.content : m.content;
                              void navigator.clipboard.writeText(text);
                              setCopiedId(m.id);
                              setTimeout(() => {
                                if (copiedId === m.id) setCopiedId(null);
                              }, 2000);
                            }}
                            className="text-xs text-faint hover:text-fg self-start"
                            title={copiedId === m.id ? "Copied!" : "Copy message"}
                          >
                            {copiedId === m.id ? "Copied!" : <MarkCopy className="size-3.5" />}
                          </button>
                        </div>
                      </ConversationContent>
                    </ConversationBubble>
                  ),
                )}
                <AnimatePresence initial={false}>
                  {busy && (
                    <ConversationBubble key="thinking" align="start" variant="muted">
                      <ConversationContent
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
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-6">
            <Composer
              onSend={(draft) => void send(draft)}
              busy={busy}
              conversationAutoAnonymize={autoAnonymizeUpcoming}
            />
          </div>
        </div>

        {userPrompts.length > 0 && (
          <aside className="hidden lg:block w-64 shrink-0 border-l border-line bg-surface/40 overflow-y-auto no-scrollbar">
            <div className="sticky top-0 z-10 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Contents</span>
            </div>
            <ul className="p-2 space-y-0.5">
              {userPrompts.map((m, index) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-raised/60 transition-colors group cursor-pointer outline-none"
                    onClick={() => {
                      document.getElementById(m.id)?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-medium text-faint tabular-nums">{index + 1}</span>
                      <span className="text-[10px] uppercase tracking-wide text-faint">Prompt</span>
                    </div>
                    <div className="text-xs text-fg/80 line-clamp-2 leading-snug group-hover:text-fg">
                      {m.masked || m.content || m.attachments?.[0]?.name || "Attached file"}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

// Provider input budgets in characters. Groq's free tier caps gpt-oss at 8k TPM,
// so its history has to stay much smaller than the others.
const WIRE_BUDGET: Record<string, number> = { groq: 16000 };
const DEFAULT_WIRE_BUDGET = 60000;

function wire(message: ChatMessage, limit: number, withFiles: boolean) {
  const text = message.masked || message.content;
  if (message.role !== "user" || !message.attachments?.length) {
    return text.slice(0, limit);
  }
  if (!withFiles) {
    const names = message.attachments.map((file) => `[attached file: ${file.name}]`).join("\n");
    return [text, names].filter(Boolean).join("\n\n").slice(0, limit);
  }
  const files = message.attachments
    .map((file) => `--- ${file.name} ---\n${(file.masked || file.content).slice(0, limit)}`)
    .join("\n\n");
  return [text, files].filter(Boolean).join("\n\n").slice(0, limit);
}

// Keep the newest exchange and drop old attachments/content until the request fits.
function buildWire(history: ChatMessage[], provider: string) {
  const budget = WIRE_BUDGET[provider] ?? DEFAULT_WIRE_BUDGET;
  const out: { role: "user" | "assistant"; content: string }[] = [];
  let remaining = budget;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (remaining <= 0) break;
    const message = history[index];
    const latest = index === history.length - 1;
    const content = wire(message, remaining, latest);
    if (!content.trim()) continue;
    out.unshift({ role: message.role, content });
    remaining -= content.length;
  }
  return out;
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
