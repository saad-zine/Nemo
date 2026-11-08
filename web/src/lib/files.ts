// Files are read in the browser; nothing is uploaded anywhere.
// Images and PDFs go through the local OCR pipeline in ./ocr.

import { OCR_EXTENSIONS, isOcrFile, ocrFile, type OcrProgress } from "@/lib/ocr";

export const TEXT_EXTENSIONS = [
  "txt",
  "md",
  "csv",
  "tsv",
  "json",
  "log",
  "xml",
  "html",
  "htm",
  "yaml",
  "yml",
  "eml",
  "rtf",
];

export const BINARY_EXTENSIONS = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip"];

const EXTENSIONS = [...TEXT_EXTENSIONS, ...OCR_EXTENSIONS];

export const ACCEPT =
  EXTENSIONS.map((e) => "." + e).join(",") +
  ",text/*,application/json,image/*,application/pdf";
export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_OCR_BYTES = 10 * 1024 * 1024;

export function readable(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (isOcrFile(file)) {
    if (file.size > MAX_OCR_BYTES) {
      return `That file is ${formatSize(file.size)}. The OCR limit is 10 MB.`;
    }
    return null;
  }
  if (BINARY_EXTENSIONS.includes(ext)) {
    return `.${ext} files aren't supported yet. Save it as .txt or paste the text instead.`;
  }
  if (
    !TEXT_EXTENSIONS.includes(ext) &&
    !file.type.startsWith("text/") &&
    file.type !== "application/json"
  ) {
    return "That doesn't look like a text file, image or PDF. Try .txt, .md, .csv, .png or .pdf.";
  }
  if (file.size > MAX_BYTES) return `That file is ${formatSize(file.size)}. The limit is 2 MB.`;
  return null;
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsText(file);
  });
}

/** Read a text file directly, or run local OCR for an image/scanned PDF. */
export async function extractText(
  file: File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<string> {
  if (isOcrFile(file)) {
    const text = await ocrFile(file, { onProgress });
    if (!text.trim()) throw new Error(`No readable text found in ${file.name}.`);
    return text;
  }
  return readTextFile(file);
}
