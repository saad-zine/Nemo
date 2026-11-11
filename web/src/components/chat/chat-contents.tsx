import { useMemo } from "react";
import { renderInlineMarkdown } from "@/lib/ai";
import type { ChatMessage } from "@/lib/store";

export function ChatContents({ messages }: { messages: ChatMessage[] }) {
  const userPrompts = useMemo(() => messages.filter((m) => m.role === "user"), [messages]);
  if (userPrompts.length === 0) return null;

  return (
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
                {renderInlineMarkdown(
                  m.masked || m.content || m.attachments?.[0]?.name || "Attached file",
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
