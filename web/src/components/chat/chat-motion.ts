// Entrance used by the Kobra Conversation demo: rise 8px out of a 4px blur.
export const EASE = [0.22, 1, 0.36, 1] as const;
const ENTER_FROM = { opacity: 0, y: 8, filter: "blur(4px)" };
const ENTER_TO = { opacity: 1, y: 0, filter: "blur(0px)" };

// Kryptos brand entrance: staggered line reveal with blur-to-sharp.
export const KRYPTO_EASE = [0.16, 1, 0.3, 1] as const;

export function enterProps(skip: boolean, reduce: boolean | null) {
  return {
    layout: !reduce,
    initial: skip || reduce ? false : ENTER_FROM,
    animate: ENTER_TO,
    transition: {
      duration: 0.32,
      ease: EASE,
      layout: { type: "spring" as const, duration: 0.5, bounce: 0 },
    },
  };
}
