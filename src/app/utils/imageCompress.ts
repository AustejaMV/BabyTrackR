/**
 * Client-side "middle-out" style image compression:
 * 1. Resize to small max dimension (fewer pixels).
 * 2. Encode as JPEG with moderate quality (high compression).
 * Result: tiny payload for sync/storage (typically 3–15 KB).
 */

const MAX_SIZE_PX = 128;
const JPEG_QUALITY = 0.52;
const MAX_OUTPUT_BYTES = 80_000; // ~80 KB cap; server may also enforce

export async function compressBabyPhoto(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await loadImage(dataUrl);
  const { width, height } = scaleToFit(img.width, img.height, MAX_SIZE_PX);
  const blob = await drawToBlob(img, width, height, JPEG_QUALITY);
  const out = await blobToDataUrl(blob);
  if (out.length > MAX_OUTPUT_BYTES * 1.4) {
    // Base64 ~1.37x raw bytes; if still too big, shrink more
    const smaller = await drawToBlob(img, Math.max(64, width >> 1), Math.max(64, height >> 1), 0.45);
    return blobToDataUrl(smaller);
  }
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

function scaleToFit(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const r = max / Math.max(w, h);
  return { width: Math.round(w * r), height: Math.round(h * r) };
}

function drawToBlob(img: HTMLImageElement, width: number, height: number, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas 2d not available"));
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
