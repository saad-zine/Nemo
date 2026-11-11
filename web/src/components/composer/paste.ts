// Pasted images arrive on the clipboard as files with a generic or missing
// name. The attachment chip and the wire format both show that name, so give
// pasted images one that reads well and stays unique in the attachment list.

import { readable } from "@/lib/files";
import { isImageFile } from "@/lib/ocr";

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

function extensionFor(file: File) {
  const known = EXTENSIONS[file.type];
  if (known) return known;
  const own = file.name.split(".").pop()?.toLowerCase() ?? "";
  return own && /^[a-z0-9]+$/.test(own) ? own : "png";
}

// `files` covers Chrome and Edge; `items` is the fallback for browsers that
// only expose the pasted image there.
function filesOnClipboard(transfer: DataTransfer) {
  if (transfer.files.length > 0) return Array.from(transfer.files);

  const items: File[] = [];
  for (const item of Array.from(transfer.items)) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) items.push(file);
  }
  return items;
}

export type PastedImages = {
  /** Images that can be attached, already renamed. */
  files: File[];
  /** Why an image was refused, when one was. */
  error: string;
  /** Index the next pasted image should use. */
  nextIndex: number;
};

/**
 * Keep only the images in a paste and rename them. `taken` holds the names
 * already in use and `startIndex` numbers the new ones, so repeated pastes
 * never produce two identical labels.
 */
export function pastedImages(
  transfer: DataTransfer,
  taken: string[] = [],
  startIndex = 1,
): PastedImages {
  const used = new Set(taken);
  const files: File[] = [];
  let error = "";
  let index = startIndex;

  for (const file of filesOnClipboard(transfer)) {
    if (!file.type.startsWith("image/") && !isImageFile(file)) continue;

    const ext = extensionFor(file);
    let name = index === 1 ? `pasted-image.${ext}` : `pasted-image-${index}.${ext}`;
    while (used.has(name)) {
      index += 1;
      name = `pasted-image-${index}.${ext}`;
    }
    used.add(name);

    const renamed = new File([file], name, { type: file.type, lastModified: file.lastModified });
    const problem = readable(renamed);
    if (problem) {
      error = problem;
      continue;
    }

    index += 1;
    files.push(renamed);
  }

  return { files, error, nextIndex: index };
}
