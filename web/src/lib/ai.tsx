// Assistant message rendering - the stable import surface for `@/lib/ai`.
//
// Model responses arrive as raw markdown and Nemo never stores the originals,
// so the chat UI renders them at message time. Normalization and inline
// formatting live in `ai-inline`; block segmentation and block rendering live
// in `ai-blocks`. This module only re-exports.

export { renderAiContent } from "@/lib/ai-blocks";
export { renderInlineMarkdown } from "@/lib/ai-inline";
