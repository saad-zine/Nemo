// AI message text cleaning and rendering.
//
// Model responses arrive as raw markdown: emphasis (asterisks), code fences,
// smart punctuation, zero-width chars, tables and lists, etc. Nemo never stores
// raw originals, so assistant content should be cleaned before display and
// offered as clean, copyable text — code fences rendered in monospace blocks,
// tables and lists rendered as semantic HTML.

import type { ReactNode } from "react";
import { CodeBlock } from "@/components/code-block";

// Zero-width / invisible characters to strip.
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;

// Smart punctuation → plain ASCII equivalents.
const SMART_QUOTES_RE = /[\u2018\u2019\u201A\u201B\u2032\u2035]/g;
const SMART_DOUBLE_QUOTES_RE = /[\u201C\u201D\u201E\u201F]/g;
const EM_DASH_RE = /[\u2014\u2015]/g;
const EN_DASH_RE = /[\u2012\u2013]/g;
const ELLIPSIS_RE = /\u2026/g;
const NBSP_RE = /\u00A0/g;

// Inline code spans.
const INLINE_CODE_RE = /`([^`]+)`/g;

// Bold/italic emphasis markers: **...**, *..._, __...__, _...
const EMPHASIS_RE = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3/g;

// Strikethrough.
const STRIKETHROUGH_RE = /~~(.*?)~~/g;

// Markdown table row: starts and ends with |.
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
// Markdown table separator row (|---|---|): skip it.
const TABLE_SEP_RE = /^\s*\|?\s*:?-{3,}\s*(\|\s*:?-{3,}\s*)+\|?\s*$/;

// List item: bullet (- * +) or ordered (1.).
const LIST_ITEM_RE = /^\s*(?:[-*+]\s+|\d+\.\s+)/;
// Ordered list item marker.
const ORDERED_LIST_RE = /^\s*\d+\.\s+/;

/** Clean a raw AI response into safe plain text for display/copy. */
export function cleanAiText(text: string): string {
  const out = text
    .replace(ZERO_WIDTH_RE, "")
    .replace(SMART_QUOTES_RE, "'")
    .replace(SMART_DOUBLE_QUOTES_RE, '"')
    .replace(EM_DASH_RE, "-")
    .replace(EN_DASH_RE, "-")
    .replace(ELLIPSIS_RE, "...")
    .replace(NBSP_RE, " ")
    .replace(INLINE_CODE_RE, "$1")
    .replace(EMPHASIS_RE, "$2$4")
    .replace(STRIKETHROUGH_RE, "$1")
    // Collapse runs of spaces/tabs (but not newlines).
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return out;
}

function splitCells(row: string): string[] {
  return row.replace(/^\s*\||\s*\|$/g, "").split("|").map((cell) => cell.trim());
}

function parseTable(lines: string[]): string[][] {
  return lines
    .filter((line) => !TABLE_SEP_RE.test(line))
    .map(splitCells);
}

type Block =
  | { kind: "fence"; code: string }
  | { kind: "table"; rows: string[][] }
  | { kind: "list"; type: "bullet" | "ordered"; items: string[] }
  | { kind: "text"; text: string };

function segmentBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence opening.
    const fenceOpen = line.match(/^```(\w*)\s*$/);
    if (fenceOpen) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing fence
      blocks.push({ kind: "fence", code: codeLines.join("\n") });
      continue;
    }

    // Table.
    if (TABLE_ROW_RE.test(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && TABLE_ROW_RE.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push({ kind: "table", rows: parseTable(tableLines) });
      continue;
    }

    // List item.
    if (LIST_ITEM_RE.test(line)) {
      const items: string[] = [];
      const isOrdered = ORDERED_LIST_RE.test(line);
      while (i < lines.length && LIST_ITEM_RE.test(lines[i])) {
        items.push(lines[i].replace(LIST_ITEM_RE, ""));
        i++;
      }
      blocks.push({ kind: "list", type: isOrdered ? "ordered" : "bullet", items });
      continue;
    }

    // Text paragraph: collect until a blank line or a special block.
    const textLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim() === "") {
        i++;
        break;
      }
      if (
        TABLE_ROW_RE.test(l) ||
        l.match(/^```(\w*)\s*$/) ||
        LIST_ITEM_RE.test(l)
      ) {
        break;
      }
      textLines.push(l);
      i++;
    }
    if (textLines.length > 0) {
      blocks.push({ kind: "text", text: textLines.join("\n") });
    }
  }

  return blocks;
}

function renderTable({ rows }: { rows: string[][] }): ReactNode {
  if (rows.length === 0) return null;
  const header = rows[0];
  const body = rows.slice(1);
  return (
    <div className="overflow-x-auto rounded border border-line bg-surface/40 p-2 text-sm mb-2">
      <table className="border-collapse w-full">
        <thead>
          <tr>
            {header.map((cell, index) => (
              <th
                key={index}
                className="border border-line/30 p-1 text-left text-fg/80 font-medium"
              >
                {cleanAiText(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-line/30 p-1 text-left text-fg">
                  {cleanAiText(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderList({
  type,
  items,
}: {
  type: "bullet" | "ordered";
  items: string[];
}): ReactNode {
  const Tag = type === "ordered" ? "ol" : "ul";
  return (
    <Tag className="mb-2 text-fg list-disc list-inside space-y-1">
      {items.map((item, index) => (
        <li key={index} className="whitespace-pre-wrap">
          {cleanAiText(item)}
        </li>
      ))}
    </Tag>
  );
}

/** Render raw AI content: code fences become code blocks, tables become HTML
 * tables, lists become <ul>/<ol>, the rest is cleaned text. */
export function renderAiContent(text: string): ReactNode {
  if (!text || text.trim() === "") {
    return <p className="whitespace-pre-wrap mb-2">{cleanAiText(text)}</p>;
  }

  const blocks = segmentBlocks(text);

  const parts: ReactNode[] = [];
  blocks.forEach((block, index) => {
    switch (block.kind) {
      case "fence":
        parts.push(<CodeBlock key={`fence-${index}`} code={block.code} />);
        break;
      case "table":
        parts.push(renderTable({ rows: block.rows }));
        break;
      case "list":
        parts.push(renderList({ type: block.type, items: block.items }));
        break;
      case "text":
        parts.push(
          <p key={`text-${index}`} className="whitespace-pre-wrap mb-2">
            {cleanAiText(block.text)}
          </p>,
        );
        break;
    }
  });

  return parts.length ? parts : <p className="whitespace-pre-wrap mb-2">{cleanAiText(text)}</p>;
}
