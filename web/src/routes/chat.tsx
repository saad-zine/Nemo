import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Composer } from "@/components/composer";
import { ChatContents } from "@/components/chat/chat-contents";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatThread } from "@/components/chat/chat-thread";
import { KryptosEmpty } from "@/components/chat/kryptos-empty";
import { useChatSend } from "@/components/chat/use-chat-send";
import { takeDraft } from "@/lib/draft";
import { useVault, type ChatMessage } from "@/lib/store";

export const Route = createFileRoute("/chat")({ component: Relay });

function Relay() {
  const threads = useVault((s) => s.threads);
  const activeId = useVault((s) => s.activeId);
  const setAutoAnonymize = useVault((s) => s.setAutoAnonymize);
  const setNewSessionAutoAnonymize = useVault((s) => s.setNewSessionAutoAnonymize);
  const newSessionAutoAnonymize = useVault((s) => s.newSessionAutoAnonymize);
  const model = useVault((s) => s.model);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState(false);
  const [incognito, setIncognito] = useState(false);
  const [ephemeral, setEphemeral] = useState<ChatMessage[]>([]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const thread = activeId ? threads.find((t) => t.id === activeId) : undefined;

  const messages = useMemo(
    () => (incognito ? ephemeral : thread ? thread.messages : pendingMessages),
    [incognito, ephemeral, thread, pendingMessages],
  );
  const empty = messages.length === 0;

  const autoAnonymizeUpcoming = thread
    ? (thread.autoAnonymize ?? false)
    : newSessionAutoAnonymize;

  const send = useChatSend({
    thread,
    incognito,
    ephemeral,
    pendingMessages,
    autoAnonymizeUpcoming,
    busy,
    setEphemeral,
    setPendingMessages,
    setBusy,
    setError,
    setStreamingId,
  });

  function resend(message: ChatMessage) {
    if (busy) return;
    const attachments = (message.attachments ?? []).map((file, index) => ({
      id: `${message.id}-${index}`,
      name: file.name,
      size: file.size,
      text: file.content,
    }));
    const anonymize =
      Boolean(message.hits?.length) ||
      Boolean(message.masked && message.masked !== message.content);
    void send({ text: message.content, attachments, anonymize });
  }

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

  useEffect(() => {
    const draft = takeDraft();
    if (draft) void send(draft);
    // only consume a draft queued from the home composer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to the newest message whenever the conversation changes.
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // Messages already in the thread when it opens render in place; only new ones animate in.
  const conversationKey = incognito ? "__incognito__" : thread?.id || "__draft__";
  const known = useRef<{ thread?: string; ids: Set<string> }>({ ids: new Set() });
  if (known.current.thread !== conversationKey) {
    known.current = { thread: conversationKey, ids: new Set(messages.map((m) => m.id)) };
  }
  const fresh = (id: string) => !known.current.ids.has(id);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        autoAnonymize={autoAnonymizeUpcoming}
        onToggleAutoAnonymize={toggleConversationAutoAnonymize}
        thread={thread}
        empty={empty}
        incognito={incognito}
        onToggleIncognito={() => {
          setIncognito((v) => !v);
          setEphemeral([]);
          setError("");
        }}
        reveal={reveal}
        onToggleReveal={() => setReveal((v) => !v)}
      />

      <div className="min-h-0 flex-1 flex overflow-hidden">
        <div className="min-h-0 flex-1 flex flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 no-scrollbar">
            {empty ? (
              <KryptosEmpty incognito={incognito} />
            ) : (
              <ChatThread
                messages={messages}
                error={error}
                busy={busy}
                reveal={reveal}
                streamingId={streamingId}
                model={model}
                isFresh={fresh}
                onResend={resend}
              />
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

        <ChatContents messages={messages} />
      </div>
    </div>
  );
}
