const PARSE_FAILURE = /parsing failed|could not be parsed|output_parse_failed/i;

export function upstreamError(json: unknown): string | undefined {
  const body = (Array.isArray(json) ? json[0] : json) as { error?: unknown } | undefined;
  const error = body?.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

export function isParseFailure(message: string, json: unknown) {
  const code = (json as { error?: { code?: unknown } } | undefined)?.error?.code;
  return code === "output_parse_failed" || PARSE_FAILURE.test(message);
}

export function readableError(message: string) {
  if (/request too large|tokens per minute|\btpm\b/i.test(message)) {
    return "This request is larger than the provider's rate limit. Start a new chat, remove large attachments, or switch model.";
  }
  if (!PARSE_FAILURE.test(message)) return message;
  return (
    "The provider could not parse the model's own output (a known Harmony quirk with gpt-oss on Groq). " +
    "Retried automatically. If it persists, try again or switch model — for example llama-3.3-70b-versatile."
  );
}
