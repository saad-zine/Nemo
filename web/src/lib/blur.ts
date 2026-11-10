import type { FaceDetector } from "@mediapipe/tasks-vision";

export type BlurStyle = "pixelate" | "blur" | "solid";

export type BlurRegion = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "FACE" | "MANUAL";
  label: string;
  score?: number;
};

const VISION_VERSION = "1.2.2";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite";

let detectorPromise: Promise<FaceDetector> | null = null;

async function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const options = {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" as const },
        runningMode: "IMAGE" as const,
        minDetectionConfidence: 0.4,
      };
      try {
        return await FaceDetector.createFromOptions(vision, options);
      } catch {
        return await FaceDetector.createFromOptions(vision, {
          ...options,
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" as const },
        });
      }
    })().catch((error) => {
      detectorPromise = null;
      throw error;
    });
  }
  return detectorPromise;
}

export async function loadImageFile(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function detectFaces(image: HTMLImageElement): Promise<BlurRegion[]> {
  const detector = await getDetector();
  const result = detector.detect(image);
  const regions: BlurRegion[] = [];
  for (const [index, detection] of result.detections.entries()) {
    const box = detection.boundingBox;
    if (!box) continue;
    const padX = box.width * 0.12;
    const padTop = box.height * 0.2;
    const padBottom = box.height * 0.12;
    const x = clamp(box.originX - padX, 0, image.naturalWidth);
    const y = clamp(box.originY - padTop, 0, image.naturalHeight);
    regions.push({
      id: `face-${index}-${Math.round(box.originX)}-${Math.round(box.originY)}`,
      x,
      y,
      width: clamp(box.width + padX * 2, 1, image.naturalWidth - x),
      height: clamp(box.height + padTop + padBottom, 1, image.naturalHeight - y),
      kind: "FACE",
      label: `Face ${index + 1}`,
      score: detection.categories[0]?.score,
    });
  }
  return regions;
}

export function renderBlurredImage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  regions: BlurRegion[],
  style: BlurStyle,
  strength: number,
) {
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable.");
  ctx.drawImage(image, 0, 0);

  for (const region of regions) {
    if (region.width < 1 || region.height < 1) continue;
    if (style === "pixelate") {
      pixelate(ctx, image, region, strength);
    } else if (style === "blur" && "filter" in ctx) {
      ctx.save();
      ctx.filter = `blur(${Math.max(2, strength)}px)`;
      ctx.drawImage(
        image,
        region.x,
        region.y,
        region.width,
        region.height,
        region.x,
        region.y,
        region.width,
        region.height,
      );
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
      ctx.fillRect(region.x, region.y, region.width, region.height);
      ctx.restore();
    }
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png") {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export the image."));
    }, type);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pixelate(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  region: BlurRegion,
  strength: number,
) {
  const block = Math.max(3, Math.round(strength));
  const x = clamp(Math.round(region.x), 0, Math.max(0, image.naturalWidth - 1));
  const y = clamp(Math.round(region.y), 0, Math.max(0, image.naturalHeight - 1));
  const sw = clamp(Math.ceil(region.width), 1, image.naturalWidth - x);
  const sh = clamp(Math.ceil(region.height), 1, image.naturalHeight - y);
  if (sw < 1 || sh < 1) return;

  const temp = document.createElement("canvas");
  temp.width = Math.max(1, Math.ceil(sw / block));
  temp.height = Math.max(1, Math.ceil(sh / block));
  const tempCtx = temp.getContext("2d");
  if (!tempCtx) return;
  tempCtx.imageSmoothingEnabled = false;
  tempCtx.drawImage(image, x, y, sw, sh, 0, 0, temp.width, temp.height);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(temp, 0, 0, temp.width, temp.height, x, y, sw, sh);
  ctx.restore();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
