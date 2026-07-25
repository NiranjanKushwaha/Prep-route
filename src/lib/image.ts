const MAX_DIMENSION = 960;
const MAX_BYTES = 120_000; // ~120KB data URL payload stays API-friendly
const JPEG_QUALITIES = [0.72, 0.6, 0.48, 0.36];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Invalid image file."));
    img.src = src;
  });
}

/** Resize + compress an image file into a JPEG data URL suitable for media_url. */
export async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (PNG, JPG, WEBP, or GIF).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image must be under 8 MB before compression.");
  }

  const original = await readAsDataUrl(file);
  const img = await loadImage(original);

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height, 1));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image in this browser.");
  ctx.drawImage(img, 0, 0, width, height);

  for (const quality of JPEG_QUALITIES) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= MAX_BYTES) return dataUrl;
  }

  // Final attempt at a smaller canvas.
  canvas.width = Math.max(1, Math.round(width * 0.6));
  canvas.height = Math.max(1, Math.round(height * 0.6));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const fallback = canvas.toDataURL("image/jpeg", 0.4);
  if (fallback.length > MAX_BYTES) {
    throw new Error("Image is still too large after compression. Try a smaller file.");
  }
  return fallback;
}

export function isProbablyImageUrl(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("data:image/")) return true;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol);
  } catch {
    return false;
  }
}
