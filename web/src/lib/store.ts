import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Hit } from "@/lib/anonymize";
import { providerInfo, type Provider } from "@/lib/models";
import { NAV_ORDER_DEFAULT, type NavKey } from "@/lib/nav";

export type { Provider } from "@/lib/models";

export type AnonymizeScope = "both" | "file" | "text";

export type KeySettings = {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string;
  restoreReplies: boolean;
  anonymizeScope: AnonymizeScope;
  anonymizeShortcut: string;
};

export type ProviderConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

export type Attachment = {
  id: string;
  name: string;
  size: number;
  text: string;
};

export type ChatAttachment = {
  name: string;
  size: number;
  content: string;
  masked?: string;
  hits?: Hit[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  masked?: string;
  hits?: Hit[];
  attachments?: ChatAttachment[];
  held?: boolean;
  at?: number;
};

export type Thread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  autoAnonymize?: boolean;
};

export type Activity = {
  id: string;
  kind: "chat" | "document";
  title: string;
  entities: number;
  at: number;
};

type State = {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string;
  providerKeys: Partial<Record<Provider, ProviderConfig>>;
  restoreReplies: boolean;
  anonymizeScope: AnonymizeScope;
  anonymizeShortcut: string;
  navOrder: NavKey[];
  strict: boolean;
  threads: Thread[];
  activeId: string;
  newSessionAutoAnonymize: boolean;
  documents: number;
  entities: number;
  messagesRouted: number;
  activity: Activity[];
  ledger: Hit[];
  fullAccessModalOpen: boolean;
  sampleData: boolean;
  setSampleData: (v: boolean) => void;
  setFullAccessModalOpen: (open: boolean) => void;
  saveKey: (settings: KeySettings) => void;
  saveProviderKey: (provider: Provider, config: ProviderConfig) => void;
  activateProvider: (provider: Provider) => void;
  renameThread: (id: string, title: string) => void;
  deleteThread: (id: string) => void;
  setProvider: (p: Provider) => void;
  setApiKey: (k: string) => void;
  setModel: (m: string) => void;
  setBaseUrl: (u: string) => void;
  setRestoreReplies: (v: boolean) => void;
  setAnonymizeScope: (v: AnonymizeScope) => void;
  setAnonymizeShortcut: (v: string) => void;
  setNavOrder: (v: NavKey[]) => void;
  setStrict: (v: boolean) => void;
  newThread: () => void;
  startNewSession: () => void;
  createThread: (messages: ChatMessage[], autoAnonymize?: boolean) => string;
  setAutoAnonymize: (threadId: string, autoAnonymize: boolean) => void;
  setNewSessionAutoAnonymize: (v: boolean) => void;
  clearThreads: () => void;
  selectThread: (id: string) => void;
  pushMessage: (threadId: string, message: ChatMessage) => void;
  updateMessage: (threadId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  record: (entry: Omit<Activity, "id" | "at">, entityDelta: number, doc?: boolean) => void;
  remember: (hits: Hit[]) => void;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function uniqueTitle(base: string, threads: Thread[], excludeId?: string) {
  const clean = base.trim() || "New conversation";
  const taken = new Set(
    threads.filter((t) => t.id !== excludeId).map((t) => t.title.trim().toLowerCase()),
  );
  if (!taken.has(clean.toLowerCase())) return clean;
  let n = 2;
  while (taken.has(`${clean} ${n}`.toLowerCase())) n += 1;
  return `${clean} ${n}`;
}

export const useVault = create<State>()(
  persist(
    (set) => ({
      provider: "openai",
      apiKey: "",
      model: "gpt-4o-mini",
      baseUrl: "https://api.openai.com/v1",
      providerKeys: {},
      restoreReplies: true,
      anonymizeScope: "both",
      anonymizeShortcut: "Ctrl+H",
      navOrder: NAV_ORDER_DEFAULT,
      strict: true,
      threads: [],
      activeId: "",
      newSessionAutoAnonymize: false,
      documents: 0,
      entities: 0,
      messagesRouted: 0,
      activity: [],
      ledger: [],
      fullAccessModalOpen: false,
      sampleData: true,
      setSampleData: (sampleData) => set({ sampleData }),
      setFullAccessModalOpen: (fullAccessModalOpen) => set({ fullAccessModalOpen }),
      saveKey: (settings) => {
        const config = { apiKey: settings.apiKey.trim(), model: settings.model, baseUrl: settings.baseUrl };
        set((s) => ({
          ...settings,
          apiKey: config.apiKey,
          providerKeys: { ...s.providerKeys, [settings.provider]: config },
        }));
      },
      saveProviderKey: (provider, config) => {
        const clean = { apiKey: config.apiKey.trim(), model: config.model, baseUrl: config.baseUrl };
        set((s) => ({
          providerKeys: { ...s.providerKeys, [provider]: clean },
          ...(s.provider === provider ? { apiKey: clean.apiKey, model: clean.model, baseUrl: clean.baseUrl } : {}),
        }));
      },
      activateProvider: (provider) =>
        set((s) => {
          const cfg = s.providerKeys[provider];
          const info = providerInfo(provider);
          return {
            provider,
            apiKey: cfg?.apiKey ?? "",
            model: cfg?.model ?? info.models[0] ?? "",
            baseUrl: cfg?.baseUrl ?? info.baseUrl,
          };
        }),
      renameThread: (id, title) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === id
              ? { ...t, title: uniqueTitle(title.trim() || t.title, s.threads, id) }
              : t,
          ),
        })),
      deleteThread: (id) =>
        set((s) => {
          const rest = s.threads.filter((t) => t.id !== id);
          if (rest.length === 0) {
            return { threads: [], activeId: "" };
          }
          return { threads: rest, activeId: s.activeId === id ? rest[0].id : s.activeId };
        }),
      setProvider: (provider) =>
        set((s) => {
          const cfg = s.providerKeys[provider];
          const info = providerInfo(provider);
          return {
            provider,
            apiKey: cfg?.apiKey ?? "",
            model: cfg?.model ?? info.models[0] ?? "",
            baseUrl: cfg?.baseUrl ?? info.baseUrl,
          };
        }),
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setRestoreReplies: (restoreReplies) => set({ restoreReplies }),
      setAnonymizeScope: (anonymizeScope) => set({ anonymizeScope }),
      setAnonymizeShortcut: (anonymizeShortcut) => set({ anonymizeShortcut }),
      setNavOrder: (navOrder) => set({ navOrder }),
      setStrict: (strict) => set({ strict }),
      newThread: () =>
        set(() => ({
          activeId: "",
          newSessionAutoAnonymize: false,
        })),
      startNewSession: () =>
        set(() => ({
          activeId: "",
          newSessionAutoAnonymize: false,
        })),
      createThread: (messages, autoAnonymize) => {
        const id = uid();
        const seed = messages[0]?.content?.trim() || messages[0]?.attachments?.[0]?.name || "";
        const raw = seed.replace(/\s+/g, " ").slice(0, 42);
        set((s) => {
          const t: Thread = {
            id,
            title: uniqueTitle(raw || "New conversation", s.threads),
            updatedAt: Date.now(),
            messages,
            autoAnonymize: autoAnonymize ?? s.newSessionAutoAnonymize,
          };
          return {
            threads: [t, ...s.threads.filter((existing) => existing.messages.length > 0)].slice(0, 24),
            activeId: id,
            newSessionAutoAnonymize: false,
          };
        });
        return id;
      },
      setAutoAnonymize: (threadId, autoAnonymize) =>
        set((s) => ({
          threads: s.threads.map((t) => (t.id === threadId ? { ...t, autoAnonymize } : t)),
        })),
      setNewSessionAutoAnonymize: (newSessionAutoAnonymize) => set({ newSessionAutoAnonymize }),
      clearThreads: () =>
        set(() => ({
          threads: [],
          activeId: "",
          newSessionAutoAnonymize: false,
        })),
      selectThread: (id) => set({ activeId: id }),
      pushMessage: (threadId, message) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            const seed = message.content.trim() || message.attachments?.[0]?.name || "";
            const raw = seed.replace(/\s+/g, " ").slice(0, 42);
            const title =
              t.messages.length === 0 && message.role === "user"
                ? uniqueTitle(raw || t.title, s.threads, t.id)
                : t.title;
            return {
              ...t,
              title,
              updatedAt: Date.now(),
              messages: [...t.messages, { ...message, at: message.at ?? Date.now() }],
            };
          }),
        })),
      updateMessage: (threadId: string, messageId: string, updates: Partial<ChatMessage>) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            return {
              ...t,
              updatedAt: Date.now(),
              messages: t.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
              ),
            };
          }),
        })),
      record: (entry, entityDelta, doc) =>
        set((s) => ({
          documents: s.documents + (doc ? 1 : 0),
          entities: s.entities + entityDelta,
          messagesRouted: s.messagesRouted + (entry.kind === "chat" ? 1 : 0),
          activity: [
            { ...entry, id: uid(), at: Date.now() },
            ...s.activity,
          ].slice(0, 500),
        })),
      remember: (hits) =>
        set((s) => {
          const map = new Map(s.ledger.map((h) => [`${h.kind}:${h.value}`, h]));
          for (const h of hits) map.set(`${h.kind}:${h.value}`, h);
          return { ledger: [...map.values()].slice(-200) };
        }),
    }),
    {
      name: "nemo-vault",
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<State>) };
        if (Array.isArray(merged.threads)) {
          merged.threads = merged.threads
            .filter((t) => t && Array.isArray(t.messages) && t.messages.length > 0)
            .reduce<Thread[]>((acc, thread) => {
              const title = uniqueTitle(thread.title, acc);
              acc.push(title === thread.title ? thread : { ...thread, title });
              return acc;
            }, []);
        } else {
          merged.threads = [];
        }
        if (merged.activeId && !merged.threads.some((t) => t.id === merged.activeId)) {
          merged.activeId = merged.threads[0]?.id ?? "";
        }
        if (!merged.providerKeys || typeof merged.providerKeys !== "object") {
          merged.providerKeys = {};
        }
        if (merged.apiKey && merged.provider && !merged.providerKeys[merged.provider]) {
          merged.providerKeys = {
            ...merged.providerKeys,
            [merged.provider]: {
              apiKey: merged.apiKey,
              model: merged.model || "",
              baseUrl: merged.baseUrl || providerInfo(merged.provider).baseUrl,
            },
          };
        }
        return merged;
      },
    },
  ),
);
