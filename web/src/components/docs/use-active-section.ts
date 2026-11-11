// Track which docs section the reader is looking at.
//
// A click selection holds until you scroll again, so trailing sections stay lit.

import { useEffect, useRef, useState, type RefObject } from "react";
import { SECTION_IDS } from "@/components/docs/docs-sections";

export function useActiveSection(rootRef: RefObject<HTMLDivElement | null>) {
  const [active, setActive] = useState(SECTION_IDS[0]);
  const locked = useRef<string | null>(null);

  const select = (id: string) => {
    locked.current = id;
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frame = 0;
    const compute = () => {
      // A click selection holds until you scroll again, so trailing sections stay lit.
      if (locked.current) return;
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 8) {
        setActive(SECTION_IDS[SECTION_IDS.length - 1]);
        return;
      }
      const line = root.getBoundingClientRect().top + 120;
      let current = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        compute();
      });
    };
    const release = () => {
      locked.current = null;
    };

    compute();
    root.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("wheel", release, { passive: true });
    root.addEventListener("touchmove", release, { passive: true });
    root.addEventListener("pointerdown", release);
    window.addEventListener("keydown", release);
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      root.removeEventListener("scroll", onScroll);
      root.removeEventListener("wheel", release);
      root.removeEventListener("touchmove", release);
      root.removeEventListener("pointerdown", release);
      window.removeEventListener("keydown", release);
      window.removeEventListener("resize", onScroll);
    };
  }, [rootRef]);

  return { active, select };
}
