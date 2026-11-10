import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MarkBlur, MarkUpload, MarkX } from "@/components/marks";
import {
  canvasToBlob,
  detectFaces,
  downloadBlob,
  loadImageFile,
  renderBlurredImage,
  type BlurRegion,
  type BlurStyle,
} from "@/lib/blur";
import { formatSize } from "@/lib/files";
import { isImageFile } from "@/lib/ocr";

export const Route = createFileRoute("/blur")({ component: ImageBlur });

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const STYLES: { id: BlurStyle; label: string }[] = [
  { id: "pixelate", label: "Pixelate" },
  { id: "blur", label: "Blur" },
  { id: "solid", label: "Solid" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function ImageBlur() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [regions, setRegions] = useState<BlurRegion[]>([]);
  const [style, setStyle] = useState<BlurStyle>("pixelate");
  const [strength, setStrength] = useState(14);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draft, setDraft] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    renderBlurredImage(canvas, image, regions, style, strength);
  }, [image, regions, style, strength]);

  async function detect(target: HTMLImageElement) {
    setBusy(true);
    setError("");
    setNote("Loading the face model and scanning the image…");
    try {
      const found = await detectFaces(target);
      setRegions(found);
      setNote(
        found.length === 0
          ? "No face found. Add a box manually if one was missed."
          : `${found.length} face${found.length === 1 ? "" : "s"} found.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? `Face detection failed: ${err.message}`
          : "Couldn't run face detection on that image.",
      );
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(next: File) {
    if (!isImageFile(next)) {
      setError("Use a PNG, JPG, WebP or other raster image. Export PDF pages as images first.");
      return;
    }
    if (next.size > MAX_IMAGE_BYTES) {
      setError(`That image is ${formatSize(next.size)}. The limit is 10 MB.`);
      return;
    }
    setError("");
    setNote("Opening image…");
    try {
      const loaded = await loadImageFile(next);
      setImage(loaded);
      setFile(next);
      setRegions([]);
      setDraft(null);
      setManual(false);
      await detect(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open that image.");
      setNote("");
    }
  }

  function clearAll() {
    setImage(null);
    setFile(null);
    setRegions([]);
    setDraft(null);
    setManual(false);
    setError("");
    setNote("");
  }

  function removeRegion(id: string) {
    setRegions((prev) => prev.filter((region) => region.id !== id));
  }

  async function download() {
    if (!image || !file || !canvasRef.current) return;
    setBusy(true);
    setError("");
    try {
      const blob = await canvasToBlob(canvasRef.current);
      downloadBlob(blob, `${file.name.replace(/\.[^.]+$/, "")}.faces-blurred.png`);
      setNote("Blurred image downloaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't export the image.");
    } finally {
      setBusy(false);
    }
  }

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * canvas.width, 0, canvas.width),
      y: clamp(((event.clientY - rect.top) / rect.height) * canvas.height, 0, canvas.height),
    };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!manual || !image) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    dragStart.current = point;
    setDraft({ x: point.x, y: point.y, width: 0, height: 0 });
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const start = dragStart.current;
    if (!start) return;
    const point = pointFromEvent(event);
    setDraft({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) return;
    const point = pointFromEvent(event);
    const x = Math.min(start.x, point.x);
    const y = Math.min(start.y, point.y);
    const width = Math.abs(point.x - start.x);
    const height = Math.abs(point.y - start.y);
    setDraft(null);
    if (width < 4 || height < 4) return;
    setRegions((prev) => [
      ...prev,
      { id: uid(), x, y, width, height, kind: "MANUAL", label: "Manual box" },
    ]);
  }

  const size = image ? `${image.naturalWidth} × ${image.naturalHeight}` : "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 py-4 md:px-10">
        <div>
          <div className="text-[11px] text-faint">Face blur</div>
          <h1 className="text-sm text-fg">Blur faces before you share an image</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => picker.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-raised px-4 py-2 text-sm text-fg transition-colors hover:bg-line/60"
          >
            <MarkUpload className="size-4" />
            Upload image
          </button>
          {image && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:bg-raised/60 hover:text-fg"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => void download()}
            disabled={!image || regions.length === 0 || busy}
            className="rounded-full bg-fg px-4 py-2 text-sm text-ink disabled:opacity-40"
          >
            Download blurred
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-max overflow-y-auto lg:auto-rows-fr lg:grid-cols-[1.25fr_0.75fr] lg:overflow-hidden">
        <section
          className="relative flex min-h-0 flex-col border-b border-line/60 lg:border-r lg:border-b-0"
          onDragEnter={(event) => {
            if (event.dataTransfer.types.includes("Files")) {
              event.preventDefault();
              setDragOver(true);
            }
          }}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files")) event.preventDefault();
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDragOver(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const next = event.dataTransfer.files?.[0];
            if (next) void onFile(next);
          }}
        >
          <input
            ref={picker}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Upload an image"
            onChange={(event) => {
              const next = event.target.files?.[0];
              if (next) void onFile(next);
              event.target.value = "";
            }}
          />
          <div className="flex items-center justify-between gap-3 px-6 py-3 text-xs tracking-wide text-faint uppercase">
            <span>Image</span>
            {manual && <span className="normal-case text-lime">Drag on the image to add a box</span>}
          </div>

          {note && (
            <p
              role="status"
              className="mx-6 mb-3 rounded-lg bg-raised/60 px-3 py-2 text-[12px] text-muted"
            >
              {note}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mx-6 mb-3 rounded-lg bg-danger/10 px-3 py-2 text-[12px] text-danger"
            >
              {error}
            </p>
          )}

          {!image ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
              <MarkBlur className="size-7 text-muted" />
              <p className="mt-4 text-sm text-fg">Drop a CV or document photo</p>
              <p className="mt-1 text-[12px] text-faint">
                PNG, JPG or WebP up to 10 MB · Face detection runs on this device
              </p>
              <button
                type="button"
                onClick={() => picker.current?.click()}
                className="mt-5 rounded-lg border border-line/70 px-3 py-1.5 text-sm text-fg transition-colors hover:border-muted hover:bg-raised/40"
              >
                Browse images
              </button>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
                <MarkUpload className="size-3.5 text-muted" />
                <span className="max-w-[18rem] truncate text-fg">{file?.name}</span>
                <span className="text-faint">{size}</span>
                {file && <span className="text-faint">{formatSize(file.size)}</span>}
              </div>
              <div className="relative inline-block w-full">
                <canvas
                  ref={canvasRef}
                  role="img"
                  aria-label="Image preview with face redaction boxes"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className={`block h-auto w-full rounded-lg border border-line/60 ${
                    manual ? "cursor-crosshair touch-none" : ""
                  }`}
                />
                <div className="pointer-events-none absolute inset-0">
                  {regions.map((region) => (
                    <span
                      key={region.id}
                      className="absolute border border-lime/80 bg-lime/10"
                      style={{
                        left: `${(region.x / (image.naturalWidth || 1)) * 100}%`,
                        top: `${(region.y / (image.naturalHeight || 1)) * 100}%`,
                        width: `${(region.width / (image.naturalWidth || 1)) * 100}%`,
                        height: `${(region.height / (image.naturalHeight || 1)) * 100}%`,
                      }}
                    />
                  ))}
                  {draft && (
                    <span
                      className="absolute border border-dashed border-fg bg-fg/10"
                      style={{
                        left: `${(draft.x / (image.naturalWidth || 1)) * 100}%`,
                        top: `${(draft.y / (image.naturalHeight || 1)) * 100}%`,
                        width: `${(draft.width / (image.naturalWidth || 1)) * 100}%`,
                        height: `${(draft.height / (image.naturalHeight || 1)) * 100}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {dragOver && (
            <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl bg-bg/85 text-sm text-fg">
              Drop to scan the image
            </div>
          )}
        </section>

        <section className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between px-6 py-3 text-xs tracking-wide text-faint uppercase">
            <span>Faces</span>
            <span className="normal-case">
              {regions.length} box{regions.length === 1 ? "" : "es"}
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              {STYLES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStyle(item.id)}
                  className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                    style === item.id
                      ? "bg-lime text-ink"
                      : "bg-raised text-muted hover:text-fg"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="block text-[12px] text-muted">
              <span className="flex items-center justify-between">
                <span>Strength</span>
                <span className="text-faint">{strength}px</span>
              </span>
              <input
                type="range"
                min={6}
                max={30}
                value={strength}
                onChange={(event) => setStrength(Number(event.target.value))}
                className="mt-2 w-full accent-lime"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => image && void detect(image)}
                disabled={!image || busy}
                className="rounded-lg border border-line/70 px-3 py-1.5 text-[12px] text-fg transition-colors hover:border-muted hover:bg-raised/40 disabled:opacity-40"
              >
                {busy ? "Scanning…" : "Detect again"}
              </button>
              <button
                type="button"
                onClick={() => setManual((value) => !value)}
                disabled={!image}
                className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors disabled:opacity-40 ${
                  manual
                    ? "border-lime bg-lime/10 text-lime"
                    : "border-line/70 text-fg hover:border-muted hover:bg-raised/40"
                }`}
              >
                {manual ? "Done adding" : "Add box"}
              </button>
              <button
                type="button"
                onClick={() => setRegions([])}
                disabled={regions.length === 0}
                className="rounded-lg border border-line/70 px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-muted hover:bg-raised/40 disabled:opacity-40"
              >
                Clear boxes
              </button>
            </div>

            <div className="space-y-1.5">
              {regions.map((region) => (
                <div
                  key={region.id}
                  className="flex items-center gap-2 rounded-md border border-line/60 bg-surface/60 px-2 py-1.5 text-[11px]"
                >
                  <span className="rounded bg-raised px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-faint uppercase">
                    {region.kind}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-fg">{region.label}</span>
                  <button
                    type="button"
                    onClick={() => removeRegion(region.id)}
                    aria-label={`Remove ${region.label}`}
                    className="shrink-0 rounded p-0.5 text-faint hover:bg-raised hover:text-fg"
                  >
                    <MarkX className="size-3" />
                  </button>
                </div>
              ))}
              {regions.length === 0 && (
                <p className="text-[11px] leading-relaxed text-faint">
                  No face selected. Detection finds faces automatically; use “Add box” to cover a
                  missed face.
                </p>
              )}
            </div>

            <p className="text-[10px] leading-relaxed text-faint">
              Nothing is uploaded. The face model is downloaded once and runs in this tab; the
              blurred copy is generated locally.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
