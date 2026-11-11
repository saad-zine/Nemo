import type { Dispatch, SetStateAction } from "react";
import type { ComposerPayload } from "@/components/composer";
import { anonymize, restore, type Hit } from "@/lib/anonymize";
import { buildWire } from "@/lib/chat-wire";
import { relayChat } from "@/lib/relay";
import { useVault, type ChatAttachment, type ChatMessage, type Thread } from "@/lib/store";
import { pumpStream } from "./chat-stream";

type SendSession = {
  thread: Thread | undefined;
  incognito: boolean;
  ephemeral: ChatMessage[];
  pendingMessages: ChatMessage[];
  autoAnonymizeUpcoming: boolean;
  busy: boolean;
  setEphemeral: Dispatch<SetStateAction<ChatMessage[]>>;
  setPendingMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
  setStreamingId: Dispatch<SetStateAction<string | null>>;
};

export function useChatSend(session: SendSession) {
  const { thread, incognito, ephemeral, pendingMessages, autoAnonymizeUpcoming, busy } = session;
  const { setEphemeral, setPendingMessages, setBusy, setError, setStreamingId } = session;
  const pushMessage = useVault((s) => s.pushMessage);
  const createThread = useVault((s) => s.createThread);
  const remember = useVault((s) => s.remember);
  const updateMessage = useVault((s) => s.updateMessage);
  const record = useVault((s) => s.record);
  const apiKey = useVault((s) => s.apiKey);
  const provider = useVault((s) => s.provider);
  const model = useVault((s) => s.model);
  const baseUrl = useVault((s) => s.baseUrl);
  const restoreReplies = useVault((s) => s.restoreReplies);

  async function send(draft: ComposerPayload) {
    const state = useVault.getState();
    const prompt = draft.text.trim();
    if ((!prompt && draft.attachments.length === 0) || busy) return;
    const activeThread = thread;
    setError("");

    const isAnonymizeActive = draft.anonymize || autoAnonymizeUpcoming;
    const maskPrompt =
      isAnonymizeActive && (state.anonymizeScope === "both" || state.anonymizeScope === "text");
    const maskFiles =
      isAnonymizeActive && (state.anonymizeScope === "both" || state.anonymizeScope === "file");

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

    function noteActivity() {
      record(
        {
          kind: "chat",
          title: seed.replace(/\s+/g, " ").slice(0, 48) || "Attached file",
          entities: allHits.length,
        },
        fresh.length,
      );
    }

    function deliverHeld(held: ChatMessage) {
      if (incognito) {
        setEphemeral((prev) => [...prev, held]);
      } else if (activeThread) {
        pushMessage(activeThread.id, held);
      } else {
        createThread([userMsg, held], isAnonymizeActive);
        setPendingMessages([]);
      }
    }

    if (incognito) {
      setEphemeral((prev) => [...prev, userMsg]);
    } else if (activeThread) {
      pushMessage(activeThread.id, userMsg);
      remember(allHits);
      noteActivity();
    } else {
      setPendingMessages([userMsg]);
    }

    if (apiKey.trim().length < 8) {
      deliverHeld({
        id: Math.random().toString(36).slice(2, 10),
        role: "assistant",
        held: true,
        content:
          "Nothing was sent. Add a key and this anonymized transcript is the only text your model will receive.",
        masked: promptMasked,
      });
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
        deliverHeld({
          id: Math.random().toString(36).slice(2, 10),
          role: "assistant",
          content: errorBody.error || `Upstream ${response.status}`,
          held: true,
        });
      } else {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const json = (await response.json().catch(() => ({}))) as {
            ok?: boolean;
            text?: string;
            error?: string;
          };
          if (json.ok === false) {
            deliverHeld({
              id: Math.random().toString(36).slice(2, 10),
              role: "assistant",
              content: json.error || "Request failed",
              held: true,
            });
          } else {
            const raw = json.text || "";
            const shown = restoreReplies ? restore(raw, [...state.ledger, ...allHits]) : raw;
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
              noteActivity();
            }
          }
        } else {
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
          setStreamingId(streamId);

          try {
            await pumpStream({
              response,
              ledger: [...state.ledger, ...allHits],
              restoreReplies,
              onFrame: (patch) => {
                if (incognito) {
                  setEphemeral((prev) =>
                    prev.map((m) => (m.id === streamId ? { ...m, ...patch } : m)),
                  );
                } else if (targetThreadId) {
                  updateMessage(targetThreadId, streamId, patch);
                } else {
                  targetThreadId = createThread(
                    [userMsg, { ...placeholder, ...patch }],
                    isAnonymizeActive,
                  );
                  setPendingMessages([]);
                  remember(allHits);
                  noteActivity();
                }
              },
            });
          } finally {
            setStreamingId(null);
          }
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return send;
}
