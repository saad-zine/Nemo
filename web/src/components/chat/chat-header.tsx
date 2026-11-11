import { useState } from "react";
import { MarkIncognito, MarkPencil } from "@/components/marks";
import { useVault, type Thread } from "@/lib/store";

export function ChatHeader({
  autoAnonymize,
  onToggleAutoAnonymize,
  thread,
  empty,
  incognito,
  onToggleIncognito,
  reveal,
  onToggleReveal,
}: {
  autoAnonymize: boolean;
  onToggleAutoAnonymize: () => void;
  thread: Thread | undefined;
  empty: boolean;
  incognito: boolean;
  onToggleIncognito: () => void;
  reveal: boolean;
  onToggleReveal: () => void;
}) {
  const renameThread = useVault((s) => s.renameThread);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  return (
    <div className="relative flex h-12 shrink-0 items-center justify-between px-4 border-b border-line/40">
      <div className="flex items-center gap-2 z-10">
        <button
          type="button"
          role="switch"
          aria-checked={autoAnonymize}
          onClick={onToggleAutoAnonymize}
          title="Anonymize all upcoming messages in this conversation automatically"
          className="flex items-center gap-2 cursor-pointer outline-none select-none text-muted transition-colors hover:text-fg"
        >
          <span
            className={`text-xs font-medium transition-colors ${autoAnonymize ? "text-fg" : "text-muted"}`}
          >
            Auto-anonymize
          </span>
          <span
            className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors duration-200 ${
              autoAnonymize ? "bg-lime" : "bg-line"
            }`}
          >
            <span
              className={`size-2.5 rounded-full shadow-sm transition-transform duration-200 ${
                autoAnonymize ? "translate-x-3 bg-ink" : "translate-x-0.5 bg-fg"
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
          onClick={onToggleIncognito}
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
          onClick={onToggleReveal}
          className="text-xs text-faint hover:text-fg"
        >
          {reveal ? "Hide originals" : "Originals"}
        </button>
      </div>
    </div>
  );
}
