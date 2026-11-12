/**
 * Compression côté client : réduit les photos avant envoi à l'API.
 * Vise ~1200px max (le texte de la carte grise doit rester lisible)
 * tout en gardant le payload sous ~450 Ko (limites des APIs vision gratuites).
 */
const MAX_PAYLOAD_CHARS = 450_000;

function canvasToJpeg(img: HTMLImageElement, maxSize: number, quality: number): string {
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function compressImageForUpload(
  dataUrl: string,
  maxSize = 1200
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        // D'abord qualité max à taille réduite, puis baisse qualité/taille si trop lourd
        for (const size of [maxSize, 1000, 800]) {
          for (const quality of [0.8, 0.65, 0.5]) {
            const out = canvasToJpeg(img, size, quality);
            if (out.length <= MAX_PAYLOAD_CHARS || (size === 800 && quality === 0.5)) {
              return resolve(out);
            }
          }
        }
        resolve(canvasToJpeg(img, 800, 0.5));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl); // format non décodable (ex: HEIC hors Safari) → original
    img.src = dataUrl;
  });
}
