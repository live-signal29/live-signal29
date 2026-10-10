import { supabase } from "@/integrations/supabase/client";

export const SCREENSHOT_BUCKET = "application-screenshots";
export type ScreenshotKind = "copier" | "account";

const MAX_DIMENSION = 1600; // px — plenty to read login / account details
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024; // bucket limit is 5 MB
export const MAX_PICK_BYTES = 20 * 1024 * 1024; // raw pick limit (we compress before upload)

const uuid = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // very old webviews
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

// Downscales + re-encodes as JPEG so phone screenshots stay small
// (faster upload, less storage / egress, and Telegram-friendly).
async function compressToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.fillStyle = "#ffffff"; // transparent PNGs -> white background
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > MAX_UPLOAD_BYTES && quality > 0.4) {
    quality -= 0.15;
    blob = await canvasToBlob(canvas, quality);
  }
  if (!blob || blob.size > MAX_UPLOAD_BYTES) throw new Error("Image is too large");
  return blob;
}

/** Uploads an optional screenshot and returns its storage path (or throws). */
export async function uploadApplicationScreenshot(file: File, kind: ScreenshotKind): Promise<string> {
  const blob = await compressToJpeg(file);
  const path = `${kind}/${uuid()}.jpg`;
  const { error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}
