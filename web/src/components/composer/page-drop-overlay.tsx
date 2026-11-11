import { MarkUpload } from "@/components/marks";

export function PageDropOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-6 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-lime/70 bg-surface/90 px-6 py-10 text-center shadow-2xl">
        <MarkUpload className="size-6 text-lime" />
        <p className="text-sm font-bold text-fg">Drop to attach</p>
        <p className="text-[12px] text-muted">
          Images, PDFs and text files are read locally — nothing is uploaded.
        </p>
      </div>
    </div>
  );
}
