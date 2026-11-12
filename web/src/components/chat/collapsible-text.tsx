import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Long user prompts are trimmed so the thread stays readable. The toggle
 * only appears when the text really overflows the trimmed height.
 */
export function CollapsibleText({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const body = useRef<HTMLDivElement>(null);

  // Measure while trimmed: the clamped height is the visible height, so a
  // taller scroll height means there is more text to show.
  useEffect(() => {
    if (expanded) return;
    const el = body.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    check();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  });

  return (
    <div>
      <div
        ref={body}
        className={expanded ? "" : "line-clamp-6"}
      >
        {children}
      </div>
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
        >
          {expanded ? "Show less" : "Show more"}
          {expanded ? (
            <ChevronUp className="size-3" aria-hidden />
          ) : (
            <ChevronDown className="size-3" aria-hidden />
          )}
        </button>
      )}
    </div>
  );
}
