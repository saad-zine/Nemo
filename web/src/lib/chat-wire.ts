import type { ChatMessage } from "@/lib/store";

// Provider input budgets in characters. Groq's free tier caps gpt-oss at 8k TPM,
// so its history has to stay much smaller than the others.
const WIRE_BUDGET: Record<string, number> = { groq: 16000 };
const DEFAULT_WIRE_BUDGET = 60000;

function wire(message: ChatMessage, limit: number, withFiles: boolean) {
  const text = message.masked || message.content;
  if (message.role !== "user" || !message.attachments?.length) {
    return text.slice(0, limit);
  }
  if (!withFiles) {
    const names = message.attachments.map((file) => `[attached file: ${file.name}]`).join("\n");
    return [text, names].filter(Boolean).join("\n\n").slice(0, limit);
  }
  const files = message.attachments
    .map((file) => `--- ${file.name} ---\n${(file.masked || file.content).slice(0, limit)}`)
    .join("\n\n");
  return [text, files].filter(Boolean).join("\n\n").slice(0, limit);
}

// Keep the newest exchange and drop old attachments/content until the request fits.
export function buildWire(history: ChatMessage[], provider: string) {
  const budget = WIRE_BUDGET[provider] ?? DEFAULT_WIRE_BUDGET;
  const out: { role: "user" | "assistant"; content: string }[] = [];
  let remaining = budget;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (remaining <= 0) break;
    const message = history[index];
    const latest = index === history.length - 1;
    const content = wire(message, remaining, latest);
    if (!content.trim()) continue;
    out.unshift({ role: message.role, content });
    remaining -= content.length;
  }
  return out;
}
