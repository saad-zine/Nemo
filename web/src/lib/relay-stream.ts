type ContentPart = { type?: string; text?: string };

/** Pull plain text out of a provider payload, streaming or not. Providers
 *  disagree on the shape: OpenAI streams `choices[0].delta.content`, some
 *  gateways answer with one `choices[0].message.content`, legacy completions
 *  use `choices[0].text`, and Anthropic uses `delta.text` or a `content`
 *  array of parts. */
export function extractText(payload: unknown): string {
  const body = payload as {
    type?: string;
    delta?: { text?: string; content?: string };
    message?: { content?: unknown };
    content?: unknown;
    choices?: {
      delta?: { content?: unknown };
      message?: { content?: unknown };
      text?: unknown;
    }[];
  };

  const parts = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      return (value as ContentPart[])
        .map((part) => (typeof part === "string" ? part : (part?.text ?? "")))
        .join("");
    }
    return "";
  };

  const choice = body.choices?.[0];
  const candidates: unknown[] = [
    choice?.delta?.content,
    choice?.message?.content,
    choice?.text,
    body.delta?.text,
    body.delta?.content,
    body.message?.content,
    body.content,
  ];

  for (const candidate of candidates) {
    const text = parts(candidate);
    if (text) return text;
  }
  return "";
}

function enqueueEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  line: string,
) {
  if (!line.startsWith("data:")) return;
  const payload = line.slice(5).trim();
  // Anthropic never sends it; on OpenAI it would fail JSON.parse and yield no text anyway.
  if (payload === "[DONE]") return;
  try {
    const text = extractText(JSON.parse(payload));
    if (text) controller.enqueue(encoder.encode(text));
  } catch {
    // Keep-alive comments and non-JSON control events carry no text.
  }
}

/** Decode a provider SSE response into plain text. Both provider branches use
 *  the same `data:` framing, so one decoder serves both. */
export function sseTextStream(res: Response): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(streamController) {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) enqueueEvent(streamController, encoder, line.trim());
        }
        // A last event may arrive without a trailing newline.
        enqueueEvent(streamController, encoder, buffer.trim());
      } finally {
        reader.releaseLock();
        streamController.close();
      }
    },
  });
}
