import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const provider = z.enum(["openai", "anthropic", "gemini", "groq", "xai", "compatible"]);

const schema = z.object({
  provider,
  apiKey: z.string().min(8).max(400),
  model: z.string().min(1).max(120),
  baseUrl: z.string().url().max(200),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(60000),
      }),
    )
    .min(1)
    .max(30),
});

const modelsSchema = z.object({
  provider,
  apiKey: z.string().min(8).max(400),
  baseUrl: z.string().url().max(200),
});

const ENDPOINTS: Partial<Record<z.infer<typeof provider>, string>> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  groq: "https://api.groq.com/openai/v1",
  xai: "https://api.x.ai/v1",
};

const MODEL_ENDPOINTS: Partial<Record<z.infer<typeof provider>, string>> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  groq: "https://api.groq.com/openai/v1",
  xai: "https://api.x.ai/v1",
};

function upstreamError(json: unknown): string | undefined {
  const body = (Array.isArray(json) ? json[0] : json) as { error?: unknown } | undefined;
  const error = body?.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

const PARSE_FAILURE = /parsing failed|could not be parsed|output_parse_failed/i;

function isParseFailure(message: string, json: unknown) {
  const code = (json as { error?: { code?: unknown } } | undefined)?.error?.code;
  return code === "output_parse_failed" || PARSE_FAILURE.test(message);
}

function readableError(message: string) {
  if (/request too large|tokens per minute|\btpm\b/i.test(message)) {
    return "This request is larger than the provider's rate limit. Start a new chat, remove large attachments, or switch model.";
  }
  if (!PARSE_FAILURE.test(message)) return message;
  return (
    "The provider could not parse the model's own output (a known Harmony quirk with gpt-oss on Groq). " +
    "Retried automatically. If it persists, try again or switch model — for example llama-3.3-70b-versatile."
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const relayChat = createServerFn({ method: "POST" })
  .validator(schema)
  .handler(async ({ data }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const raw = (body: BodyInit, init?: ResponseInit) =>
      new Response(body, {
        ...init,
        headers: { ...(init?.headers ?? {}), "x-tss-raw": "true" },
      });
    try {
      const systemPrompt =
        "The user routes messages through a local anonymization layer. Tokens like [[PERSON_1]] stand in for private values you must not guess. Answer using only what is written.";
      const messages = [{ role: "system", content: systemPrompt }, ...data.messages];

      if (data.provider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            "x-api-key": data.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: data.model,
            max_tokens: 2048,
            system: systemPrompt,
            messages: data.messages,
            stream: true,
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          return raw(
            JSON.stringify({ ok: false, error: json.error?.message || `Upstream ${res.status}` }),
            { status: res.status }
          );
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
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
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const payload = trimmed.slice(5).trim();
                  try {
                    const obj = JSON.parse(payload) as {
                      type?: string;
                      delta?: { text?: string };
                    };
                    if (obj.type === "content_block_delta" && obj.delta?.text) {
                      streamController.enqueue(encoder.encode(obj.delta.text));
                    }
                  } catch {
                    // Ignore non-JSON/control lines
                  }
                }
              }
            } finally {
              reader.releaseLock();
              streamController.close();
            }
          },
        });
        return raw(stream, {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      const root = ENDPOINTS[data.provider] ?? data.baseUrl.replace(/\/$/, "");
      let res: Response | undefined;
      let lastError = "Relay failed";

      // gpt-oss occasionally emits malformed Harmony output that the provider
      // rejects; the same request usually succeeds when replayed.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          res = await fetch(`${root}/chat/completions`, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${data.apiKey}`,
            },
            body: JSON.stringify({
              model: data.model,
              ...(data.provider === "groq" ? { max_completion_tokens: 1024 } : {}),
              messages,
              stream: true,
            }),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Relay failed";
          lastError = message;
          if (attempt < 2) {
            await sleep(400 * (attempt + 1));
            continue;
          }
          return raw(JSON.stringify({ ok: false, error: message }), { status: 500 });
        }

        if (res.ok) break;

        const json = (await res.json().catch(() => ({}))) as unknown;
        lastError = upstreamError(json) || `Upstream ${res.status}`;
        const retryable =
          res.status === 429 || res.status >= 500 || isParseFailure(lastError, json);
        if (!retryable || attempt === 2) {
          return raw(JSON.stringify({ ok: false, error: readableError(lastError) }), {
            status: res.status,
          });
        }
        await sleep(400 * (attempt + 1));
      }

      if (!res || !res.ok) {
        return raw(JSON.stringify({ ok: false, error: readableError(lastError) }), { status: 502 });
      }

      const upstream = res;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(streamController) {
          const reader = upstream.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const payload = trimmed.slice(5).trim();
                if (payload === "[DONE]") continue;
                try {
                  const obj = JSON.parse(payload) as {
                    choices?: { delta?: { content?: string } }[];
                  };
                  const content = obj.choices?.[0]?.delta?.content;
                  if (content) streamController.enqueue(encoder.encode(content));
                } catch {
                  // Ignore malformed SSE lines.
                }
              }
            }
          } finally {
            reader.releaseLock();
            streamController.close();
          }
        },
      });
      return raw(stream, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Relay failed";
      return raw(JSON.stringify({ ok: false, error: readableError(message) }), { status: 500 });
    } finally {
      clearTimeout(timer);
    }
  });

export const relayModels = createServerFn({ method: "POST" })
  .validator(modelsSchema)
  .handler(async ({ data }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      let url: string;
      const headers: Record<string, string> = {};

      if (data.provider === "anthropic") {
        url = "https://api.anthropic.com/v1/models";
        headers["x-api-key"] = data.apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else if (data.provider === "gemini") {
        url = `${MODEL_ENDPOINTS.gemini}/models?key=${encodeURIComponent(data.apiKey)}`;
      } else {
        const root = MODEL_ENDPOINTS[data.provider] ?? data.baseUrl.replace(/\/$/, "");
        url = `${root}/models`;
        headers.authorization = `Bearer ${data.apiKey}`;
      }

      const res = await fetch(url, { signal: controller.signal, headers });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { id?: string }[];
        models?: { name?: string; supportedGenerationMethods?: string[] }[];
      };
      if (!res.ok) {
        return { ok: false as const, error: upstreamError(json) || `Upstream ${res.status}` };
      }

      const models =
        data.provider === "gemini"
          ? (json.models ?? [])
              .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
              .map((model) => model.name?.replace(/^models\//, ""))
          : (json.data ?? []).map((model) => model.id);
      const ids = [...new Set(models.filter((id): id is string => Boolean(id && id.trim())))].sort();
      return ids.length
        ? { ok: true as const, models: ids }
        : { ok: false as const, error: "The provider returned no usable models." };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Model discovery failed";
      return { ok: false as const, error: message };
    } finally {
      clearTimeout(timer);
    }
  });
