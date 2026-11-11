import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AttachmentList } from "@/components/composer/attachment-list";
import { AttachmentPicker } from "@/components/composer/attachment-picker";
import { ModelPicker } from "@/components/composer/model-picker";
import { PageDropOverlay } from "@/components/composer/page-drop-overlay";
import { pastedImages } from "@/components/composer/paste";
import { MarkIncognito } from "@/components/marks";
import { queueDraft } from "@/lib/draft";
import { extractText, readable } from "@/lib/files";
import { ocrStageLabel } from "@/lib/ocr";
import { eventMatchesShortcut, prettyShortcut } from "@/lib/shortcuts";
import { useVault, type Attachment } from "@/lib/store";

export type ComposerPayload = {
  text: string;
  attachments: Attachment[];
  anonymize: boolean;
};

export function Composer({ onSend, busy, conversationAutoAnonymize }: {
  onSend?: (payload: ComposerPayload) => void;
  busy?: boolean;
  conversationAutoAnonymize?: boolean;
}) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [anonymize, setAnonymize] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pageDrag, setPageDrag] = useState(false);
  const [fileError, setFileError] = useState("");
  const [ocrNote, setOcrNote] = useState("");
  const addFilesRef = useRef(addFiles);
  addFilesRef.current = addFiles;
  const pasteIndexRef = useRef(1);
  const strict = useVault((s) => s.strict);
  const setStrict = useVault((s) => s.setStrict);
  const shortcut = useVault((s) => s.anonymizeShortcut);
  const navigate = useNavigate();

  const vaultAutoAnonymize = useVault((s) => {
    const active = s.threads.find((th) => th.id === s.activeId);
    return active?.autoAnonymize ?? s.newSessionAutoAnonymize;
  });

  const isAutoAnonymize = conversationAutoAnonymize ?? vaultAutoAnonymize;

  useEffect(() => {
    setAnonymize(isAutoAnonymize);
  }, [isAutoAnonymize]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !eventMatchesShortcut(e, shortcut)) return;
      e.preventDefault();
      setAnonymize((on) => !on);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setPageDrag(true);
    };
    const onOver = (event: DragEvent) => { if (!hasFiles(event)) return; event.preventDefault(); };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0 || event.relatedTarget === null) {
        depth = 0;
        setPageDrag(false);
      }
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = 0;
      setPageDrag(false);
      if (event.defaultPrevented) return;
      event.preventDefault();
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) void addFilesRef.current(files);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  async function addFiles(files: FileList | File[], initialError = "") {
    const list = Array.from(files);
    if (list.length === 0) return;
    const next: Attachment[] = [];
    let error = initialError;
    setOcrNote("");
    for (const file of list) {
      const problem = readable(file);
      if (problem) { error = problem; continue; }
      try {
        const text = await extractText(file, (progress) => {
          setOcrNote(`${file.name} · ${ocrStageLabel(progress.stage, progress.page, progress.pages)}`);
        });
        next.push({ id: Math.random().toString(36).slice(2, 10), name: file.name, size: file.size, text });
      } catch (err) {
        error = err instanceof Error ? err.message : "Couldn't read that file.";
      } finally {
        setOcrNote("");
      }
    }
    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next].slice(0, 6));
      setUploadOpen(false);
    }
    setFileError(error);
  }

  function submit() {
    const text = value.trim();
    if ((!text && attachments.length === 0) || busy) return;
    const payload: ComposerPayload = { text, attachments, anonymize: anonymize || isAutoAnonymize };
    setValue("");
    setAttachments([]);
    setFileError("");
    if (onSend) onSend(payload);
    else {
      queueDraft(payload);
      void navigate({ to: "/chat" });
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="w-full">
      <div
        className={`rounded-2xl transition-[padding,background-color,border-color] duration-200 outline-none ring-0 ${
          anonymize ? "border border-line/70 bg-surface/50 p-1.5 shadow-lg" : "border border-transparent bg-transparent p-0"
        }`}
      >
        <AnimatePresence initial={false}>
          {anonymize && (
            <motion.div
              key="anonymize-header-bar"
              initial={{ height: 0, opacity: 0, y: -4 }} animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between px-2.5 pt-1 pb-2">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-lime shadow-[0_0_8px_rgba(163,230,53,0.9)]" />
                  <MarkIncognito className="size-3.5 text-lime" />
                  <span className="text-[12px] font-medium text-fg">this prompt will be anonymized</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-faint">
                  <span>{strict ? "strict masking" : "masking active"}</span>
                  <kbd className="rounded bg-raised/80 px-1.5 py-0.5 text-[10px] font-mono text-muted">{prettyShortcut(shortcut)}</kbd>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-xl border border-line bg-raised shadow-sm transition-all outline-none focus-within:outline-none ring-0">
          <div className="px-3 pt-3 pb-2">
            <AttachmentList
              attachments={attachments}
              onRemove={(id) => setAttachments((prev) => prev.filter((f) => f.id !== id))}
            />
            {ocrNote && <p role="status" className="mb-2 text-[11px] text-muted">{ocrNote}…</p>}
            {fileError && <p role="alert" className="mb-2 text-[11px] text-danger">{fileError}</p>}
            <textarea
              value={value}
              rows={2}
              onChange={(e) => setValue(e.target.value)}
              onPaste={(e) => {
                const pasted = pastedImages(
                  e.clipboardData,
                  attachments.map((f) => f.name),
                  pasteIndexRef.current,
                );
                if (pasted.files.length === 0 && !pasted.error) return;
                pasteIndexRef.current = pasted.nextIndex;
                // A screenshot on the clipboard can still carry a text flavour.
                // Keep the prompt clean unless the paste really had text.
                if (!e.clipboardData.getData("text/plain").trim()) e.preventDefault();
                void addFiles(pasted.files, pasted.error);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask anything"
              className="max-h-40 min-h-12 w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed outline-none focus:outline-none ring-0 focus:ring-0 placeholder:text-faint"
            />
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1">
                <AttachmentPicker
                  open={uploadOpen}
                  onToggle={() => {
                    setFileError("");
                    setUploadOpen((open) => !open);
                  }}
                  onFiles={(files) => void addFiles(files)}
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={anonymize}
                  onClick={() => setAnonymize((on) => !on)}
                  title={`Toggle anonymization (${prettyShortcut(shortcut)})`}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-bold transition-colors cursor-pointer ${
                    anonymize ? "bg-lime text-ink shadow-sm" : "text-muted hover:bg-bg hover:text-fg"
                  }`}
                >
                  Anonymize
                </button>
              </div>
              <div className="flex items-center gap-2">
                <ModelPicker />
                <button
                  type="button"
                  role="switch"
                  aria-checked={strict}
                  aria-label="Strict"
                  onClick={() => setStrict(!strict)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-[13px] font-semibold text-muted transition-colors hover:text-fg">Strict</span>
                  <span className={`relative h-3.5 w-6 rounded-full transition-colors duration-200 ${strict ? "bg-fg" : "bg-line"}`}>
                    <span className={`absolute top-0.5 left-0.5 size-2.5 rounded-full shadow-sm transition-transform duration-200 ${strict ? "translate-x-2.5 bg-ink" : "translate-x-0 bg-fg"}`} />
                  </span>
                </button>
                <button
                  type="submit"
                  disabled={busy || (!value.trim() && attachments.length === 0)}
                  aria-label="Send"
                  className="flex size-8 items-center justify-center rounded-full bg-fg text-ink disabled:opacity-40 cursor-pointer"
                >
                  <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                    <path d="M8 12.5V3.5M4.5 6.5 8 3.5l3.5 3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PageDropOverlay visible={pageDrag} />
    </form>
  );
}
