// Local OCR: images and scanned PDFs are read on this device with Tesseract.js.
// Only the OCR language model is downloaded; the document never leaves the browser.

import type { Worker } from "tesseract.js";

export const OCR_IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "bmp",
  "gif",
  "tif",
  "tiff",
];

export const OCR_EXTENSIONS = [...OCR_IMAGE_EXTENSIONS, "pdf"];

export type OcrStage = "loading" | "extracting" | "rendering" | "recognizing";

export type OcrProgress = {
  stage: OcrStage;
  progress: number;
  page?: number;
  pages?: number;
};

export type OcrOptions = {
  lang?: string;
  onProgress?: (progress: OcrProgress) => void;
};

function extension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export function isImageFile(file: File) {
  return (
    OCR_IMAGE_EXTENSIONS.includes(extension(file)) ||
    (file.type.startsWith("image/") && !file.type.includes("svg"))
  );
}

export function isPdfFile(file: File) {
  return extension(file) === "pdf" || file.type === "application/pdf";
}

export function isOcrFile(file: File) {
  return isImageFile(file) || isPdfFile(file);
}

const STAGE_LABEL: Record<string, OcrStage> = {
  "loading tesseract core": "loading",
  "loading language traineddata": "loading",
  "initializing tesseract": "loading",
  "initializing api": "loading",
  "recognizing text": "recognizing",
};

let workerPromise: Promise<Worker> | null = null;
let workerLang = "";
let listener: ((progress: OcrProgress) => void) | null = null;
// One worker handles one image at a time, so recognition runs through a
// queue. Several files arriving together (a multi-file drop, a burst of
// pastes) would otherwise overwrite each other's image data.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function mapTesseractProgress(status: string, progress: number): OcrProgress {
  return { stage: STAGE_LABEL[status] ?? "recognizing", progress };
}

async function getWorker(lang: string) {
  if (!workerPromise || workerLang !== lang) {
    const { createWorker } = await import("tesseract.js");
    if (workerPromise) {
      const stale = workerPromise;
      workerPromise = null;
      void stale.then((worker) => worker.terminate()).catch(() => undefined);
    }
    workerLang = lang;
    workerPromise = createWorker(lang, 1, {
      logger: (message) => {
        listener?.(mapTesseractProgress(message.status, message.progress));
      },
    }).catch((error) => {
      workerPromise = null;
      workerLang = "";
      throw error;
    });
  }
  return workerPromise;
}

export async function terminateOcr() {
  if (!workerPromise) return;
  const active = workerPromise;
  workerPromise = null;
  workerLang = "";
  await active.then((worker) => worker.terminate()).catch(() => undefined);
}

async function recognize(
  worker: Worker,
  image: File | HTMLCanvasElement,
  onProgress?: (p: OcrProgress) => void,
) {
  return enqueue(async () => {
    listener = onProgress ?? null;
    try {
      const result = await worker.recognize(image);
      return result.data.text;
    } finally {
      listener = null;
    }
  });
}

async function imageText(file: File, worker: Worker, onProgress?: (p: OcrProgress) => void) {
  onProgress?.({ stage: "recognizing", progress: 0 });
  const text = await recognize(worker, file, onProgress);
  onProgress?.({ stage: "recognizing", progress: 1 });
  return text;
}

type PdfDocument = {
  numPages: number;
  getPage: (page: number) => Promise<{
    getViewport: (options: { scale: number }) => { width: number; height: number };
    getTextContent: () => Promise<{ items: ({ str?: string } | undefined)[] }>;
    render: (params: {
      canvas: HTMLCanvasElement;
      viewport: { width: number; height: number };
    }) => { promise: Promise<void> };
  }>;
};

type PdfHandle = {
  document: PdfDocument;
  destroy: () => Promise<void>;
};

async function loadPdf(file: File): Promise<PdfHandle> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  const document = (await task.promise) as unknown as PdfDocument;
  return { document, destroy: () => task.destroy() };
}

function pageText(items: { str?: string }[]) {
  return items
    .map((item) => (item.str ? `${item.str} ` : ""))
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function pdfText(
  file: File,
  getTesseract: () => Promise<Worker>,
  onProgress?: (p: OcrProgress) => void,
) {
  const { document: pdf, destroy } = await loadPdf(file);
  const pages: string[] = [];

  try {
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const at = (fraction: number) => ({
        progress: fraction,
        page: index,
        pages: pdf.numPages,
      });
      onProgress?.({ stage: "extracting", ...at((index - 1) / pdf.numPages) });
      const page = await pdf.getPage(index);

      const embedded = pageText((await page.getTextContent()).items as { str?: string }[]);
      if (embedded.length >= 24) {
        pages.push(embedded);
        onProgress?.({ stage: "extracting", ...at(index / pdf.numPages) });
        continue;
      }

      onProgress?.({ stage: "rendering", ...at((index - 1) / pdf.numPages) });
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;

      const worker = await getTesseract();
      const scanned = await recognize(worker, canvas, (progress) =>
        onProgress?.({
          ...progress,
          stage: progress.stage === "recognizing" ? "recognizing" : "rendering",
          progress: (index - 1 + progress.progress) / pdf.numPages,
          page: index,
          pages: pdf.numPages,
        }),
      );
      pages.push(scanned.trim());
      onProgress?.({ stage: "recognizing", ...at(index / pdf.numPages) });
    }
  } finally {
    await destroy();
  }

  return pages.filter(Boolean).join("\n\n");
}

export async function ocrFile(file: File, options: OcrOptions = {}) {
  const lang = options.lang ?? "eng";
  const getTesseract = () => getWorker(lang);

  if (isPdfFile(file)) return pdfText(file, getTesseract, options.onProgress);

  options.onProgress?.({ stage: "loading", progress: 0 });
  const worker = await getTesseract();
  options.onProgress?.({ stage: "loading", progress: 1 });
  return imageText(file, worker, options.onProgress);
}

export function ocrStageLabel(stage: OcrStage, page?: number, pages?: number) {
  switch (stage) {
    case "loading":
      return "Preparing OCR";
    case "extracting":
      return pages ? `Reading page ${page} of ${pages}` : "Reading PDF";
    case "rendering":
      return pages ? `Rendering page ${page} of ${pages}` : "Rendering PDF";
    case "recognizing":
      return pages ? `Reading text on page ${page} of ${pages}` : "Reading text";
  }
}
