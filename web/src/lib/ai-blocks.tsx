// Block segmentation and block-level rendering for assistant messages.
//
// Model output is raw markdown; the chat UI turns it into semantic HTML:
// code fences become CodeBlock, tables become <table>, lists become <ul>/<ol>,
// the rest becomes paragraphs of inline-rendered text.

import { Fragment, type ReactNode } from "react";
import { CodeBlock } from "@/components/code-block";
import { renderInline } from "@/lib/ai-inline";

// Markdown table row: starts and ends with |.
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
// Markdown table separator row (|---|---|): skip it.
const TABLE_SEP_RE = /^\s*\|?\s*:?-{3,}\s*(\|\s*:?-{3,}\s*)+\|?\s*$/;
// ATX heading: # through ######.
const HEADING_RE = /^\s*(#{1,6})\s+(.+?)\s*#*\s*$/;
// Horizontal rule.
const RULE_RE = /^\s*(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/;

// List item: bullet (- * +) or ordered (1.).
const LIST_ITEM_RE = /^\s*(?:[-*+]\s+|\d+\.\s+)/;
// List item with indentation, marker and text captured separately.
const LIST_LINE_RE = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
// Ordered list item marker.
const ORDERED_LIST_RE = /^\s*\d+\.\s+/;

// Code fence opener and closer.
const FENCE_OPEN_RE = /^```(\w*)\s*$/;
const FENCE_CLOSE_RE = /^```\s*$/;

function splitCells(row: string): string[] {
  return row.replace(/^\s*\||\s*\|$/g, "").split("|").map((cell) => cell.trim());
}

function parseTable(lines: string[]): string[][] {
  return lines.filter((line) => !TABLE_SEP_RE.test(line)).map(splitCells);
}

type ListItem = { text: string; ordered: boolean; children: ListItem[] };

type Block =
  | { kind: "fence"; code: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "rule" }
  | { kind: "table"; rows: string[][] }
  | { kind: "list"; items: ListItem[] }
  | { kind: "text"; text: string };

function readFence(lines: string[], start: number): [Block, number] {
  let end = start + 1;
  while (end < lines.length && !FENCE_CLOSE_RE.test(lines[end])) end++;
  const code = lines.slice(start + 1, end).join("\n");
  if (end < lines.length) end++; // skip closing fence
  return [{ kind: "fence", code }, end];
}

function readTable(lines: string[], start: number): [Block, number] {
  let end = start;
  while (end < lines.length && TABLE_ROW_RE.test(lines[end])) end++;
  return [{ kind: "table", rows: parseTable(lines.slice(start, end)) }, end];
}

function readList(lines: string[], start: number): [Block, number] {
  const rootOrdered = ORDERED_LIST_RE.test(lines[start]);
  const root: ListItem[] = [];
  const levels: { depth: number; ordered: boolean; items: ListItem[] }[] = [
    { depth: 0, ordered: rootOrdered, items: root },
  ];
  let i = start;

  while (i < lines.length) {
    const match = lines[i].match(LIST_LINE_RE);
    if (!match) {
      // A blank line inside a list keeps it going when the next item is
      // a sibling of the same kind, so numbering does not restart.
      if (lines[i].trim() === "") {
        let next = i;
        while (next < lines.length && lines[next].trim() === "") next++;
        const nextMatch = next < lines.length ? lines[next].match(LIST_LINE_RE) : null;
        if (nextMatch) {
          const nextOrdered = !/^[-*+]/.test(nextMatch[2]);
          const nextDepth = Math.floor(nextMatch[1].replace(/\t/g, "  ").length / 2);
          if (nextDepth === 0 && nextOrdered === rootOrdered) {
            i = next;
            continue;
          }
        }
      }
      break;
    }
    const indent = match[1].replace(/\t/g, "  ").length;
    const ordered = !/^[-*+]/.test(match[2]);
    let depth = Math.floor(indent / 2);

    if (depth === 0 && ordered !== rootOrdered && root.length > 0) {
      break;
    }

    depth = Math.min(depth, levels[levels.length - 1].depth + 1);
    while (levels.length > 1 && depth < levels[levels.length - 1].depth) {
      levels.pop();
    }
    if (depth > levels[levels.length - 1].depth) {
      const parentLevel = levels[levels.length - 1];
      const parent = parentLevel.items[parentLevel.items.length - 1];
      if (parent) {
        levels.push({ depth, ordered, items: parent.children });
      } else {
        depth = parentLevel.depth;
      }
    }

    const level = levels[levels.length - 1];
    level.items.push({ text: match[3], ordered, children: [] });
    i++;
  }

  return [{ kind: "list", items: root }, i];
}

function readParagraph(lines: string[], start: number): [Block | null, number] {
  const textLines: string[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      break;
    }
    if (
      TABLE_ROW_RE.test(line) ||
      FENCE_OPEN_RE.test(line) ||
      HEADING_RE.test(line) ||
      RULE_RE.test(line) ||
      LIST_ITEM_RE.test(line)
    ) {
      break;
    }
    textLines.push(line);
    i++;
  }
  if (textLines.length === 0) return [null, i];
  return [{ kind: "text", text: textLines.join("\n") }, i];
}

function segmentBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (FENCE_OPEN_RE.test(line)) {
      const [block, next] = readFence(lines, i);
      blocks.push(block);
      i = next;
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (RULE_RE.test(line)) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }

    if (TABLE_ROW_RE.test(line)) {
      const [block, next] = readTable(lines, i);
      blocks.push(block);
      i = next;
      continue;
    }

    if (LIST_ITEM_RE.test(line)) {
      const [block, next] = readList(lines, i);
      blocks.push(block);
      i = next;
      continue;
    }

    const [block, next] = readParagraph(lines, i);
    if (block) blocks.push(block);
    i = next;
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
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-line/30 p-1 text-left text-fg">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderListItems(items: ListItem[], nested = false): ReactNode {
  if (items.length === 0) return null;
  const ordered = items[0].ordered;
  const Tag = ordered ? "ol" : "ul";
  const marker = ordered ? "list-decimal" : "list-disc";
  const spacing = nested ? "mt-1" : "mb-2";
  return (
    <Tag className={`list-inside space-y-1 text-fg ${marker} ${spacing}`}>
      {items.map((item, index) => (
        <li key={index} className="whitespace-pre-wrap">
          {renderInline(item.text)}
          {item.children.length > 0 ? renderListItems(item.children, true) : null}
        </li>
      ))}
    </Tag>
  );
}

function renderHeading({ level, text }: { level: number; text: string }): ReactNode {
  const Tag = `h${Math.min(level, 4)}` as "h1" | "h2" | "h3" | "h4";
  let size = "text-sm font-semibold";
  if (level === 1) {
    size = "text-lg font-semibold";
  } else if (level === 2) {
    size = "text-base font-semibold";
  }
  return <Tag className={`${size} mb-2 mt-1 text-fg`}>{renderInline(text)}</Tag>;
}

function renderBlock(block: Block, index: number): ReactNode {
  switch (block.kind) {
    case "fence":
      return <CodeBlock key={`fence-${index}`} code={block.code} />;
    case "heading":
      return (
        <Fragment key={`heading-${index}`}>
          {renderHeading({ level: block.level, text: block.text })}
        </Fragment>
      );
    case "rule":
      return <hr key={`rule-${index}`} className="my-3 border-line" />;
    case "table":
      return (
        <Fragment key={`table-${index}`}>{renderTable({ rows: block.rows })}</Fragment>
      );
    case "list":
      return (
        <Fragment key={`list-${index}`}>{renderListItems(block.items)}</Fragment>
      );
    case "text":
      return (
        <p key={`text-${index}`} className="whitespace-pre-wrap mb-2">
          {renderInline(block.text)}
        </p>
      );
  }
}

/** Render raw AI content: code fences become code blocks, tables become HTML
 * tables, lists become <ul>/<ol>, the rest is cleaned text. */
export function renderAiContent(text: string): ReactNode {
  if (!text || text.trim() === "") {
    return <p className="whitespace-pre-wrap mb-2">{renderInline(text)}</p>;
  }

  const parts = segmentBlocks(text).map(renderBlock);
  return parts.length ? parts : <p className="whitespace-pre-wrap mb-2">{renderInline(text)}</p>;
}
