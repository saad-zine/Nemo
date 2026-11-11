import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { MarkPlus, MarkUpload } from "@/components/marks";
import { ACCEPT } from "@/lib/files";

export function AttachmentPicker({
  open,
  onToggle,
  onFiles,
}: {
  open: boolean;
  onToggle: () => void;
  onFiles: (files: FileList) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Add files"
        title="Add files"
        className={`flex size-8 items-center justify-center rounded-full transition-transform duration-200 hover:bg-bg hover:text-fg active:scale-90 ${
          open ? "rotate-45 bg-bg text-fg" : "text-muted"
        }`}
      >
        <MarkPlus className="size-4" />
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        aria-label="Upload text files"
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-full left-0 z-40 mb-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-2 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragEnter={(e) => {
                if (!e.dataTransfer.types.includes("Files")) return;
                e.preventDefault();
                setDragOver(true);
              }}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("Files")) e.preventDefault();
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setDragOver(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files) onFiles(e.dataTransfer.files);
              }}
              className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
                dragOver ? "border-lime bg-lime/10" : "border-line hover:border-muted hover:bg-raised"
              }`}
            >
              <MarkUpload className="size-5 text-muted" />
              <span className="text-[13px] font-semibold text-fg">Drop files or browse</span>
              <span className="text-[11px] text-faint">
                .txt .md .csv .json · 2 MB · .png .jpg .pdf · 10 MB
              </span>
            </button>
            <p className="px-2 pt-2 text-[11px] leading-relaxed text-faint">
              Images and scanned PDFs are read with local OCR. Files never leave this device.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
