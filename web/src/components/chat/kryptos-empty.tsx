import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { MarkIncognito } from "@/components/marks";
import { EASE, KRYPTO_EASE } from "./chat-motion";

const KRYPTOS_ART = [
  "██╗  ██╗██████╗ ██╗   ██╗██████╗ ████████╗ ██████╗ ███████╗",
  "██║ ██╔╝██╔══██╗╚██╗ ██╔╝██╔══██╗╚══██╔══╝██╔═══██╗██╔════╝",
  "█████╔╝ ██████╔╝ ╚████╔╝ ██████╔╝   ██║   ██║   ██║███████╗",
  "██╔═██╗ ██╔══██╗  ╚██╔╝  ██╔═══╝    ██║   ██║   ██║╚════██║",
  "██║  ██╗██║  ██║   ██║   ██║        ██║   ╚██████╔╝███████║",
  "╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝        ╚═╝    ╚═════╝ ╚══════╝",
];

export function KryptosEmpty({ incognito }: { incognito: boolean }) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  // Trigger Kryptos entrance animation when chat becomes empty
  useEffect(() => {
    // Small delay to allow re-trigger on re-entry
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center pb-16">
      {incognito && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-[11px] text-muted">
          <MarkIncognito className="size-3.5" /> Incognito
        </span>
      )}
      <motion.div
        role="img"
        aria-label="Kryptos"
        initial={false}
        animate={visible ? "visible" : "hidden"}
        variants={{
          hidden: {},
          visible: { transition: reduce ? { duration: 0 } : { staggerChildren: 0.08 } },
        }}
        className="mt-5 flex flex-col items-center select-none text-fg"
        style={{ willChange: "transform, opacity, filter" }}
      >
        {KRYPTOS_ART.map((line, i) => (
          <motion.pre
            key={i}
            aria-hidden
            variants={{
              hidden: reduce
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, y: 12, filter: "blur(10px)" },
              visible: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: reduce ? { duration: 0 } : { duration: 0.7, ease: KRYPTO_EASE },
              },
            }}
            className="krypto-sheen mx-0 my-[-3px] py-[3px] whitespace-pre font-mono leading-[1.05] text-[7px] sm:text-[10px] md:text-[13px]"
            style={{
              fontFamily: '"JetBrains Mono","Fira Code",ui-monospace,Menlo,Consolas,monospace',
            }}
          >
            {line}
          </motion.pre>
        ))}
      </motion.div>
      <motion.p
        initial={false}
        animate={visible ? "visible" : "hidden"}
        variants={{
          hidden: reduce
            ? { opacity: 1, y: 0, filter: "blur(0px)" }
            : { opacity: 0, y: 8, filter: "blur(4px)" },
          visible: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: reduce ? { duration: 0 } : { delay: 0.95, duration: 0.45, ease: EASE },
          },
        }}
        className="mt-4 max-w-md text-center text-sm leading-relaxed text-muted"
      >
        {incognito
          ? "This conversation stays in this tab and is never saved."
          : "Ask a question, paste a note, or point at a file. Sensitive spans are stripped before anything reaches your model."}
      </motion.p>
    </div>
  );
}
