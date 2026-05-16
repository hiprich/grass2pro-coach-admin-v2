/** In-app adjustments before uploading coach avatar to Airtable. */

export type CoachAvatarEditState = {
  rotationDeg: number;
  /** 1 = default framing, &gt;1 zooms in (tighter crop). */
  zoom: number;
  /** Pan along canvas axes after rotation, roughly -1…1. */
  panNormX: number;
  panNormY: number;
  flipH: boolean;
};

export const DEFAULT_COACH_AVATAR_EDIT: CoachAvatarEditState = {
  rotationDeg: 0,
  zoom: 1,
  panNormX: 0,
  panNormY: 0,
  flipH: false,
};

export async function loadImageElementFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not read this image file."));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Rotated axis-aligned bounding box size for intrinsic (iw, ih). */
function rotatedAabb(iw: number, ih: number, rad: number): { rw: number; rh: number } {
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return { rw: iw * c + ih * s, rh: iw * s + ih * c };
}

/**
 * Draw the edited avatar into a square canvas (used for live preview and export).
 */
export function drawCoachAvatarToCanvas(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  state: CoachAvatarEditState,
  size: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const rad = (state.rotationDeg * Math.PI) / 180;
  const { rw, rh } = rotatedAabb(iw, ih, rad);
  const cover = Math.max(size / rw, size / rh);
  const scale = cover * Math.max(0.6, Math.min(state.zoom, 2.2));

  const panPx = state.panNormX * size * 0.18;
  const panPy = state.panNormY * size * 0.18;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.translate(panPx, panPy);
  ctx.rotate(rad);
  if (state.flipH) ctx.scale(-1, 1);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -iw / 2, -ih / 2);
  ctx.restore();
}

/**
 * Renders a square JPEG (base64, no data URL prefix) from the image and edit state.
 */
export function renderCoachAvatarToJpegBase64(
  img: HTMLImageElement,
  state: CoachAvatarEditState,
  size = 600,
  quality = 0.88,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas.");

  drawCoachAvatarToCanvas(ctx, img, state, size);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode image."));
          return;
        }
        void blob.arrayBuffer().then((buf) => {
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
          resolve(btoa(binary));
        });
      },
      "image/jpeg",
      quality,
    );
  });
}
