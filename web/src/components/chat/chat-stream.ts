import { restore, type Hit } from "@/lib/anonymize";

export type StreamPatch = { content: string; masked: string };

type PumpOptions = {
  response: Response;
  ledger: Hit[];
  restoreReplies: boolean;
  onFrame: (patch: StreamPatch) => void;
};

/**
 * Drain a relayed text stream into coalesced patches.
 *
 * `onFrame` is called at most once per animation frame and always once more
 * when the stream settles, so the final text (or the empty-reply fallback)
 * reaches the message without a trailing frame left scheduled.
 */
export async function pumpStream({ response, ledger, restoreReplies, onFrame }: PumpOptions) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  // Tokens arrive far faster than the screen refreshes, so paint at
  // most once per frame instead of on every chunk.
  let frame: number | null = null;
  let pending: StreamPatch = { content: "", masked: "" };
  const flush = () => {
    frame = null;
    onFrame(pending);
  };
  const schedule = (patch: StreamPatch) => {
    pending = patch;
    if (frame === null) frame = requestAnimationFrame(flush);
  };

  let done = false;
  try {
    while (!done) {
      const { value, done: doneReading } = await reader!.read();
      done = doneReading;
      if (value) {
        accumulated += decoder.decode(value, { stream: true });
        schedule({
          content: restoreReplies ? restore(accumulated, ledger) : accumulated,
          masked: accumulated,
        });
      }
    }
  } finally {
    if (!accumulated.trim()) {
      pending = { content: "The provider returned an empty response.", masked: "" };
    }
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    flush();
  }
}
