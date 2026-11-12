/**
 * Compression côté client : réduit les photos avant envoi à l'API.
 * Vise ~1200px max (le texte de la carte grise doit rester lisible)
 * tout en gardant le payload sous ~450 Ko (limites des APIs vision gratuites).
 * Gère la rotation EXIF (photos de smartphone) via createImageBitmap.
 */
const MAX_PAYLOAD_CHARS = 450_000;

async function loadImage(dataUrl: string): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap applique l'orientation EXIF ('from-image') — crucial pour les photos smartphone
  if (typeof createImageBitmap === 'function') {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      // fallback ci-dessous
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function sourceSize(src: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  return src instanceof ImageBitmap
    ? { w: src.width, h: src.height }
    : { w: (src as HTMLImageElement).naturalWidth, h: (src as HTMLImageElement).naturalHeight };
}

function drawSource(
  ctx: CanvasRenderingContext2D,
  src: ImageBitmap | HTMLImageElement,
  w: number,
  h: number
) {
  if (src instanceof ImageBitmap) ctx.drawImage(src, 0, 0, w, h);
  else ctx.drawImage(src as HTMLImageElement, 0, 0, w, h);
}

function canvasToJpeg(
  src: ImageBitmap | HTMLImageElement,
  maxSize: number,
  quality: number
): string {
  const { w, h } = sourceSize(src);
  const scale = Math.min(1, maxSize / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');
  drawSource(ctx, src, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function compressImageForUpload(
  dataUrl: string,
  maxSize = 1200
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;

  try {
    const src = await loadImage(dataUrl);
    try {
      for (const size of [maxSize, 1000, 800]) {
        for (const quality of [0.8, 0.65, 0.5]) {
          const out = canvasToJpeg(src, size, quality);
          if (out.length <= MAX_PAYLOAD_CHARS || (size === 800 && quality === 0.5)) {
            return out;
          }
        }
      }
      return canvasToJpeg(src, 800, 0.5);
    } finally {
      if (src instanceof ImageBitmap) src.close();
    }
  } catch {
    return dataUrl; // format non décodable (ex: HEIC hors Safari) → original
  }
}
