import { createServerFn } from "@tanstack/react-start";
import { isParseFailure, readableError, upstreamError } from "@/lib/relay-errors";
import { ENDPOINTS, MODEL_ENDPOINTS, modelsSchema, schema } from "@/lib/relay-provider";
import { extractText, sseTextStream } from "@/lib/relay-stream";

const PLAIN_TEXT: ResponseInit = { headers: { "content-type": "text/plain; charset=utf-8" } };

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
      const systemPrompt = [
        "The user routes messages through a local anonymization layer. Tokens like [[PERSON_1]] stand in for private values you must not guess. Answer using only what is written.",
        "",
        "Format your answer as clean Markdown so it reads well on screen:",
        "- Use `##` headings for sections and `**bold**` for short labels.",
        "- Use `-` bullets for lists and `1.` for numbered steps.",
        "- Put each list item on a single line and leave a blank line between paragraphs.",
        "- Never use hard line breaks to fake a list; write real Markdown.",
        "- Keep paragraphs short and lead with the point.",
      ].join("\n");
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

        // Some gateways ignore `stream: true` and answer with one JSON body.
        const upstreamType = res.headers.get("content-type") || "";
        if (upstreamType.includes("application/json")) {
          const json = await res.json().catch(() => null);
          return raw(extractText(json), PLAIN_TEXT);
        }

        return raw(sseTextStream(res), PLAIN_TEXT);
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

      // Some gateways ignore `stream: true` and answer with one JSON body.
      const upstreamType = res.headers.get("content-type") || "";
      if (upstreamType.includes("application/json")) {
        const json = await res.json().catch(() => null);
        return raw(extractText(json), PLAIN_TEXT);
      }

      return raw(sseTextStream(res), PLAIN_TEXT);
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
