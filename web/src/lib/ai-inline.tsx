// Text normalization and inline markdown rendering for assistant messages.
//
// Model output mixes plain markdown with "smart" typography and invisible
// characters; the chat UI wants plain ASCII punctuation but must not disturb
// markdown syntax, so normalization targets specific character classes only.

import type { ReactNode } from "react";

// Zero-width / invisible characters to strip.
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;

// Smart punctuation -> plain ASCII equivalents.
const SMART_QUOTES_RE = /[\u2018\u2019\u201A\u201B\u2032\u2035]/g;
const SMART_DOUBLE_QUOTES_RE = /[\u201C\u201D\u201E\u201F]/g;
const EM_DASH_RE = /[\u2014\u2015]/g;
const EN_DASH_RE = /[\u2012\u2013]/g;
const ELLIPSIS_RE = /\u2026/g;
const NBSP_RE = /\u00A0/g;

// Inline markdown tokens, matched longest-first so ** wins over * and a code
// span wins over emphasis inside it.
const INLINE_RE =
  /(`[^`\n]+`|\*\*[\s\S]+?\*\*|__[\s\S]+?__|~~[\s\S]+?~~|\*[^*\n]+?\*|_[^_\n]+?_)/g;

/** Normalize punctuation and invisible characters without touching markdown. */
function normalize(text: string): string {
  return text
    .replace(ZERO_WIDTH_RE, "")
    .replace(SMART_QUOTES_RE, "'")
    .replace(SMART_DOUBLE_QUOTES_RE, '"')
    .replace(EM_DASH_RE, "-")
    .replace(EN_DASH_RE, "-")
    .replace(ELLIPSIS_RE, "...")
    .replace(NBSP_RE, " ");
}

/**
 * Render inline markdown (`code`, **bold**, *italic*, ~~strike~~) as elements.
 * `key` seeds the child keys so nested tokens stay unique per parent.
 */
export function renderInline(text: string, key = "i"): ReactNode[] {
  const source = normalize(text);
  const parts: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of source.matchAll(INLINE_RE)) {
    const token = match[0];
    const at = match.index ?? 0;
    if (at > last) parts.push(source.slice(last, at));
    const k = `${key}-${index++}`;
    if (token.startsWith("`")) {
      parts.push(
        <code key={k} className="rounded bg-raised px-1 py-0.5 font-mono text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**") || token.startsWith("__")) {
      parts.push(
        <strong key={k} className="font-semibold">
          {renderInline(token.slice(2, -2), k)}
        </strong>,
      );
    } else if (token.startsWith("~~")) {
      parts.push(
        <del key={k} className="opacity-70">
          {renderInline(token.slice(2, -2), k)}
        </del>,
      );
    } else {
      parts.push(<em key={k}>{renderInline(token.slice(1, -1), k)}</em>);
    }
    last = at + token.length;
  }
  if (last < source.length) parts.push(source.slice(last));
  return parts;
}

/** Render inline markdown only, for contexts that do not support block layout. */
export function renderInlineMarkdown(text: string): ReactNode[] {
  return renderInline(text);
}
