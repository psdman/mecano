import { createWorker } from 'tesseract.js';
import { compressImageForUpload } from './imageCompress';

/**
 * OCR local (Tesseract.js, gratuit, sans API) — fallback quand les APIs vision échouent.
 * Extrait le texte de la carte grise puis parse les champs par expressions régulières.
 */

export interface OcrVehicleData {
  immatriculation?: string;
  nomProprietaire?: string;
  prenomProprietaire?: string;
  adresseProprietaire?: string;
  marque?: string;
  modele?: string;
  vin?: string;
  dateMiseEnCirculation?: string;
  carburant?: string;
  puissanceFiscale?: string;
  confiance: string;
}

let workerPromise: Promise<any> | null = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('fra');
  }
  return workerPromise;
}

/** Extrait le texte brut d'une image (data URL), en la réduisant d'abord pour la rapidité. */
export async function ocrImageText(dataUrl: string): Promise<string> {
  const worker = await getWorker();
  // Réduction à ~1000px : l'OCR n'a pas besoin de plus et c'est 3-4x plus rapide sur mobile
  const prepared = await compressImageForUpload(dataUrl, 1000);
  const { data } = await worker.recognize(prepared);
  return data.text || '';
}

const MARQUES = [
  'PEUGEOT', 'RENAULT', 'VOLKSWAGEN', 'VW', 'TOYOTA', 'BMW', 'MERCEDES',
  'DACIA', 'CITROEN', 'FIAT', 'FORD', 'HONDA', 'NISSAN', 'HYUNDAI', 'KIA',
  'MITSUBISHI', 'SUZUKI', 'SKODA', 'SEAT', 'AUDI', 'PORSCHE', 'LAND ROVER',
  'JEEP', 'CHERY', 'MG', 'BYD', 'GEELY', 'OPEL', 'PEUGEOT',
];

const CARBURANTS: Record<string, string> = {
  essence: 'Essence',
  gazole: 'Gasoil (ديازال)',
  diesel: 'Gasoil (ديازال)',
  electrique: 'Électrique',
  hybride: 'Hybride',
};

function findMarque(text: string): string {
  const upper = text.toUpperCase();
  for (const m of MARQUES) {
    if (new RegExp(`\\b${m.replace(' ', '\\s+')}\\b`).test(upper)) return m === 'VW' ? 'VOLKSWAGEN' : m;
  }
  return '';
}

function findVin(text: string): string {
  const m = text.toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
  return m ? m[0] : '';
}

function findImmatriculation(text: string): string {
  // Format français SIV : AB-123-CD (tolérant aux espaces)
  const siv = text.toUpperCase().match(/\b([A-Z]{2})[\s-]?([0-9]{3})[\s-]?([A-Z]{2})\b/);
  if (siv) return `${siv[1]}-${siv[2]}-${siv[3]}`;
  // Format marocain : 12345 | أ | 6 (chiffres - lettre arabe - chiffres)
  const mar = text.match(/(\d{1,6})\s*[-|]?\s*([\u0600-\u06FF])\s*[-|]?\s*(\d{1,2})/);
  if (mar) return `${mar[1]} | ${mar[2]} | ${mar[3]}`;
  return '';
}

function findDate(text: string): string {
  // Date de mise en circulation : cherche près de "MEC" / "mise en circulation" / "1ère"
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/mise en circulation|m\.?e\.?c|1[eè]re/i.test(lines[i])) {
      const window = lines.slice(i, i + 3).join(' ');
      const d = window.match(/(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/) || window.match(/(\d{4})[\/\-.](\d{2})[\/\-.](\d{2})/);
      if (d) return d.length === 4 ? `${d[1]}/${d[2]}/${d[3]}` : `${d[3]}/${d[2]}/${d[1]}`;
    }
  }
  // fallback : première date du document
  const any = text.match(/(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/);
  return any ? `${any[1]}/${any[2]}/${any[3]}` : '';
}

function findProprietaire(text: string): { nom: string; prenom: string; adresse: string } {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let nom = '', prenom = '', adresse = '';

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Nom / titulaire
    const nomMatch = l.match(/(?:nom|titulaire|propri[ée]taire|C\.1\.?)\s*[:\-]?\s*(.+)/i);
    if (nomMatch && !nom) {
      const val = nomMatch[1].trim();
      // essaie de séparer prénom/nom si les deux sont sur la même ligne
      const parts = val.split(/\s{2,}|\s+-\s+|,/);
      if (parts.length >= 2) {
        prenom = parts[0].replace(/^(M\.?|Mme|Mr)\.?\s*/i, '').trim();
        nom = parts.slice(1).join(' ').trim();
      } else {
        nom = val.replace(/^(M\.?|Mme|Mr)\.?\s*/i, '').trim();
      }
    }
    // Adresse
    const adrMatch = l.match(/(?:adresse|C\.3|demeurant|domicili[ée])\s*[:\-]?\s*(.+)/i);
    if (adrMatch && !adresse) adresse = adrMatch[1].trim();
  }

  // Si rien trouvé, prend la ligne après "Nom"/"Titulaire"
  if (!nom) {
    for (let i = 0; i < lines.length; i++) {
      if (/nom|titulaire|propri[ée]taire/i.test(lines[i]) && lines[i + 1]) {
        nom = lines[i + 1].trim();
        break;
      }
    }
  }

  return { nom, prenom, adresse };
}

function findCarburant(text: string): string {
  const lower = text.toLowerCase();
  for (const [key, label] of Object.entries(CARBURANTS)) {
    if (lower.includes(key)) return label;
  }
  return '';
}

function findPuissance(text: string): string {
  const m = text.match(/(\d{1,3})\s*(?:cv|chevaux?|kw)\b/i);
  return m ? `${m[1]} CV` : '';
}

/** Parse le texte OCR d'une carte grise en données structurées. */
export function parseCarteGriseText(text: string): OcrVehicleData {
  const { nom, prenom, adresse } = findProprietaire(text);
  return {
    immatriculation: findImmatriculation(text),
    nomProprietaire: nom,
    prenomProprietaire: prenom,
    adresseProprietaire: adresse,
    marque: findMarque(text),
    modele: '',
    vin: findVin(text),
    dateMiseEnCirculation: findDate(text),
    carburant: findCarburant(text),
    puissanceFiscale: findPuissance(text),
    confiance: 'moyenne (OCR local)',
  };
}

/**
 * Pipeline complet : OCR des images fournies (carte grise en priorité)
 * puis parsing. Retourne null si rien d'exploitable n'est trouvé.
 */
export async function extractVehicleDataLocal(
  images: { carteGrise?: string | null; carteGriseVerso?: string | null; vehicle?: string | null }
): Promise<OcrVehicleData | null> {
  const texts: string[] = [];

  // Carte grise en priorité (document imprimé = meilleure OCR)
  for (const img of [images.carteGrise, images.carteGriseVerso, images.vehicle]) {
    if (!img) continue;
    try {
      const text = await ocrImageText(img);
      if (text && text.trim().length > 10) texts.push(text);
    } catch (err: any) {
      console.warn('OCR image échoué:', err?.message);
    }
    if (texts.length >= 2) break; // 2 images suffisent
  }

  if (texts.length === 0) return null;

  const fullText = texts.join('\n');
  const data = parseCarteGriseText(fullText);

  // Exige au moins 2 champs clés cohérents — sinon l'OCR a probablement mal lu
  // et renvoyer des données erronées est pire qu'un message d'erreur.
  const keyCount = [data.immatriculation, data.marque, data.vin, data.nomProprietaire]
    .filter((v) => v && v.trim() !== '').length;
  if (keyCount < 2) return null;
  return data;
}
