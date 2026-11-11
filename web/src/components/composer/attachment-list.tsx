import { MarkFileText, MarkX } from "@/components/marks";
import { formatSize } from "@/lib/files";
import type { Attachment } from "@/lib/store";

export function AttachmentList({
  attachments,
  onRemove,
}: {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {attachments.map((file) => (
        <span
          key={file.id}
          className="flex max-w-full items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-[11px]"
        >
          <MarkFileText className="size-3.5 shrink-0 text-muted" />
          <span className="max-w-44 truncate text-fg">{file.name}</span>
          <span className="shrink-0 text-faint">{formatSize(file.size)}</span>
          <button
            type="button"
            aria-label={`Remove ${file.name}`}
            onClick={() => onRemove(file.id)}
            className="rounded p-0.5 text-faint hover:bg-raised hover:text-fg"
          >
            <MarkX className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
