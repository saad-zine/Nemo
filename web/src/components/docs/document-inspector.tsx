import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { PatientDocument } from "./sample-document";

const LENS_SIZE = 116;
const LENS_RADIUS = LENS_SIZE / 2;

export function DocumentInspector() {
  const paperRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;
  const positionX = useMotionValue(0);
  const positionY = useMotionValue(0);
  const springX = useSpring(positionX, { stiffness: 430, damping: 34, mass: 0.45 });
  const springY = useSpring(positionY, { stiffness: 430, damping: 34, mass: 0.45 });
  const lensX = reduceMotion ? positionX : springX;
  const lensY = reduceMotion ? positionY : springY;
  const clipPath = useMotionTemplate`circle(${LENS_RADIUS}px at ${lensX}px ${lensY}px)`;
  const transformOrigin = useMotionTemplate`${lensX}px ${lensY}px`;

  function moveLens(clientX: number, clientY: number) {
    const bounds = paperRef.current?.getBoundingClientRect();
    if (!bounds) return;
    positionX.set(clampLens(clientX - bounds.left, bounds.width));
    positionY.set(clampLens(clientY - bounds.top, bounds.height));
  }

  function showLens() {
    const bounds = paperRef.current?.getBoundingClientRect();
    if (!bounds) return;
    positionX.set(bounds.width * 0.18);
    positionY.set(bounds.height * 0.34);
    setActive(true);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (active) setActive(false);
      else showLens();
      return;
    }
    if (event.key === "Escape") {
      setActive(false);
      return;
    }
    if (!event.key.startsWith("Arrow")) return;

    const bounds = paperRef.current?.getBoundingClientRect();
    if (!bounds) return;
    event.preventDefault();
    if (!active) showLens();
    const distance = event.shiftKey ? 24 : 12;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -distance;
    else if (event.key === "ArrowRight") dx = distance;
    else if (event.key === "ArrowUp") dy = -distance;
    else if (event.key === "ArrowDown") dy = distance;
    positionX.set(clampLens(positionX.get() + dx, bounds.width));
    positionY.set(clampLens(positionY.get() + dy, bounds.height));
    setActive(true);
  }

  function onPointerEnter(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    moveLens(event.clientX, event.clientY);
    setActive(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" && !active) return;
    moveLens(event.clientX, event.clientY);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    moveLens(event.clientX, event.clientY);
    setActive(true);
  }

  return (
    <div>
      <div
        ref={paperRef}
        role="button"
        tabIndex={0}
        aria-pressed={active}
        aria-label="Anonymized sample patient note. Hover, tap, or press Enter to use the magnifying glass; arrow keys move it."
        onKeyDown={onKeyDown}
        onPointerEnter={onPointerEnter}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setActive(false);
        }}
        className={`relative h-[370px] rounded-[5px] border-2 border-[#252b23] bg-[#fffdf4] text-[#273026] shadow-[4px_5px_0_#252b23] outline-none select-none focus-visible:ring-3 focus-visible:ring-lime focus-visible:ring-offset-3 focus-visible:ring-offset-bg ${
          active ? "cursor-none" : "cursor-crosshair"
        }`}
        style={{ touchAction: "pan-y" }}
      >
        <div aria-hidden="true" className="absolute inset-0">
          <PatientDocument revealed={false} />
        </div>

        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
          style={{ clipPath }}
          animate={{ opacity: active ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.12 }}
        >
          <motion.div className="absolute inset-0" style={{ scale: 1.08, transformOrigin }}>
            <PatientDocument revealed />
          </motion.div>
        </motion.div>

        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-30 size-[116px]"
          style={{ x: lensX, y: lensY, marginLeft: -LENS_RADIUS, marginTop: -LENS_RADIUS }}
          animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.82 }}
          transition={{ duration: reduceMotion ? 0 : 0.16 }}
        >
          <div className="absolute top-[84px] left-[86px] h-[52px] w-[15px] origin-top -rotate-45 rounded-full border-[3px] border-[#252b23] bg-[#ff8f70] shadow-[2px_2px_0_#252b23]" />
          <div className="relative size-[116px] rounded-full border-[5px] border-[#252b23] bg-white/5 shadow-[4px_5px_0_rgba(37,43,35,0.9),inset_0_0_0_2px_rgba(255,255,255,0.75)]">
            <div className="absolute top-[12px] left-[22px] h-[9px] w-[29px] -rotate-[28deg] rounded-full bg-white/75" />
            <div className="absolute right-[16px] bottom-[18px] size-2 rounded-full bg-white/45" />
          </div>
        </motion.div>
      </div>
      <p aria-live="polite" className="sr-only">
        {active
          ? "Lens open. The private values and portrait are visible: Yasmine Benali, 14 Rue des Orangers, Casablanca, and Attijariwafa Bank."
          : "Lens closed. The document shows anonymized tokens and a blurred portrait."}
      </p>
    </div>
  );
}

function clampLens(value: number, extent: number) {
  return Math.min(Math.max(value, LENS_RADIUS), Math.max(LENS_RADIUS, extent - LENS_RADIUS));
}
