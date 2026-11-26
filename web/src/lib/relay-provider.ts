import { z } from "zod";

export const provider = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "groq",
  "xai",
  "freellmapi",
  "compatible",
]);

export const schema = z.object({
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

export const modelsSchema = z.object({
  provider,
  apiKey: z.string().min(8).max(400),
  baseUrl: z.string().url().max(200),
});

// Shared by both maps; only gemini differs between chat and model discovery.
const OPENAI_BASE = "https://api.openai.com/v1";
const GROQ_BASE = "https://api.groq.com/openai/v1";
const XAI_BASE = "https://api.x.ai/v1";
const FREELLMAPI_BASE = "http://127.0.0.1:31415/v1";

export const ENDPOINTS: Partial<Record<z.infer<typeof provider>, string>> = {
  openai: OPENAI_BASE,
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  groq: GROQ_BASE,
  xai: XAI_BASE,
  freellmapi: FREELLMAPI_BASE,
};

export const MODEL_ENDPOINTS: Partial<Record<z.infer<typeof provider>, string>> = {
  openai: OPENAI_BASE,
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  groq: GROQ_BASE,
  xai: XAI_BASE,
  freellmapi: FREELLMAPI_BASE,
};
