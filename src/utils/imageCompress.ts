/**
 * Compression côté client : réduit les photos avant envoi à l'API.
 * Évite les payloads trop lourds (et le rate-limit des APIs vision gratuites).
 */
export async function compressImageForUpload(
  dataUrl: string,
  maxSize = 800,
  quality = 0.6
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl); // format non décodable (ex: HEIC hors Safari) → original
    img.src = dataUrl;
  });
}
