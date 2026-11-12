import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import sharp from 'sharp';
import heicConvert from 'heic-convert';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Support base64 image uploads from camera / files
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Return JSON errors instead of Express' default HTML error pages
// (Safari throws "The string did not match the expected pattern" on res.json() of HTML)
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  const status = err?.status || err?.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err?.type === 'entity.too.large'
      ? 'Les images sont trop lourdes. Réessayez avec des photos moins volumineuses.'
      : err?.message || 'Erreur interne du serveur.',
  });
});

// Init Google GenAI if key present
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const SCAN_PROMPT = `Tu es un assistant expert pour mécaniciens et garagistes automobiles spécialisé dans la lecture optique et l'analyse de documents automobiles français et internationaux (Certificat d'immatriculation / Carte Grise) ainsi que des plaques d'immatriculation sur véhicules.
Les photos peuvent inclure : le recto ET le verso de la carte grise, et/ou une photo du véhicule avec sa plaque. Le verso contient souvent les informations du titulaire (champs C) et le recto les caractéristiques techniques du véhicule (champs D, E, B, P). Analyse toutes les images ensemble pour reconstituer le document complet.
Analyse attentivement la ou les photos fournies :
1. Carte Grise (Certificat d'immatriculation) :
   - Champ (A) : Numéro d'immatriculation (ex: AA-123-BB ou 1234 AB 75)
   - Champ (C.1 / C.4.1) : Nom et prénom du propriétaire (titulaire du certificat d'immatriculation). S'il y a un prénom et un nom, sépare-les clairement.
   - Champ (C.3) : Adresse complète du propriétaire
   - Champ (D.1) : Marque du constructeur (ex: PEUGEOT, RENAULT, VOLKSWAGEN, TOYOTA, BMW...)
   - Champ (D.3) : Dénomination commerciale / Modèle (ex: 308, CLIO, GOLF, YARIS...)
   - Champ (E) : Numéro d'identification du véhicule (VIN / Numéro de châssis à 17 caractères)
   - Champ (B) : Date de première mise en circulation (format YYYY-MM-DD ou DD/MM/YYYY)
   - Champ (P.3) : Type de carburant / énergie (ex: ES pour Essence, GO pour Gazole/Diesel, EL pour Électrique, EE pour Hybride)
   - Champ (P.6) : Puissance administrative nationale (chevaux fiscaux CV)
   - Champ (J.1) : Genre national (ex: VP pour Véhicule Particulier, CTTE pour Camionnette...)

Retourne impérativement un JSON structuré valide selon le schéma fourni.`;

const SCAN_SCHEMA_PROPERTIES = {
  immatriculation: {
    type: Type.STRING,
    description: "Plaque d'immatriculation normalisée (ex: EB-456-JK)",
  },
  nomProprietaire: {
    type: Type.STRING,
    description: 'Nom de famille du titulaire de la carte grise ou raison sociale',
  },
  prenomProprietaire: {
    type: Type.STRING,
    description: 'Prénom du titulaire',
  },
  adresseProprietaire: {
    type: Type.STRING,
    description: 'Adresse postale complète du propriétaire',
  },
  marque: {
    type: Type.STRING,
    description: 'Marque constructeur (ex: PEUGEOT, RENAULT)',
  },
  modele: {
    type: Type.STRING,
    description: 'Modèle commercial (ex: 308 1.6 HDi, CLIO 5)',
  },
  vin: {
    type: Type.STRING,
    description: 'Numéro de série VIN (champ E)',
  },
  dateMiseEnCirculation: {
    type: Type.STRING,
    description: 'Date de 1ère mise en circulation',
  },
  carburant: {
    type: Type.STRING,
    description: 'Carburant / Énergie (ex: Diesel, Essence, Hybride, Électrique)',
  },
  puissanceFiscale: {
    type: Type.STRING,
    description: 'Puissance administrative en CV',
  },
  couleur: {
    type: Type.STRING,
    description: 'Couleur du véhicule observée',
  },
  rawObservations: {
    type: Type.STRING,
    description: 'Remarques ou détails additionnels utiles pour le mécanicien',
  },
  confiance: {
    type: Type.STRING,
    description: "Niveau de confiance de la détection ('haute', 'moyenne', 'faible')",
  },
};

const SCAN_JSON_INSTRUCTION = `Réponds UNIQUEMENT avec un objet JSON contenant exactement ces clés : immatriculation, nomProprietaire, prenomProprietaire, adresseProprietaire, marque, modele, vin, dateMiseEnCirculation, carburant, puissanceFiscale, couleur, rawObservations, confiance. Utilise une chaîne vide "" pour les champs illisibles ou absents. Ne mets aucune clé en dehors de cette liste.`;

function buildPromptText(): string {
  return SCAN_PROMPT;
}

/**
 * Free no-key vision API (BlockRun / Nemotron) — OpenAI-compatible chat completions.
 */
interface VisionProvider {
  name: string;
  url: string;
  model: string;
  apiKey?: string;
}

const VISION_PROVIDERS: VisionProvider[] = [
  {
    name: 'blockrun-nemotron',
    url: 'https://blockrun.ai/api/v1/chat/completions',
    model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  },
  {
    name: 'llm7-vision',
    url: 'https://api.llm7.io/v1/chat/completions',
    model: 'default',
  },
];

async function callVisionProvider(
  provider: VisionProvider,
  imageParts: { dataUrl: string }[]
): Promise<any | null> {
  const content: any[] = [
    { type: 'text', text: `${SCAN_PROMPT}\n\n${SCAN_JSON_INSTRUCTION}` },
    ...imageParts.map((img) => ({ type: 'image_url', image_url: { url: img.dataUrl } })),
  ];

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.apiKey) headers['Authorization'] = `Bearer ${provider.apiKey}`;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Free tiers are rate-limited: retry with backoff on 429
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content }],
        temperature: 0.1,
      }),
    });

    if (response.status === 429 && attempt < 2) {
      const waitMs = 4000 * (attempt + 1);
      console.warn(`${provider.name} rate-limité (429), nouvelle tentative dans ${waitMs / 1000}s...`);
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      throw new Error(`${provider.name} HTTP ${response.status}`);
    }

    const json = await response.json();
    const text: string = json?.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') {
      // Normalise : certains modèles renvoient des tableaux ou des non-chaînes
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) parsed[key] = parsed[key].join(' | ');
        else if (parsed[key] !== null && typeof parsed[key] !== 'string') {
          parsed[key] = String(parsed[key]);
        }
      }
    }
    return parsed && parsed.immatriculation ? parsed : null;
  }
  return null;
}

/**
 * Essaie chaque provider de vision gratuit jusqu'à obtenir un résultat.
 */
async function analyzeWithFreeVisionApis(
  imageParts: { dataUrl: string }[]
): Promise<{ provider: string; data: any } | null> {
  let lastError: any = null;
  for (const provider of VISION_PROVIDERS) {
    try {
      const parsed = await callVisionProvider(provider, imageParts);
      if (parsed) {
        return { provider: provider.name, data: parsed };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`${provider.name} indisponible:`, err?.message);
    }
  }
  if (lastError) throw lastError;
  return null;
}

/**
 * Endpoint for scanning Vehicle + Carte Grise (Registration Document)
 */
app.post('/api/scan-vehicle-registration', async (req, res) => {
  try {
    const { vehicleImage, carteGriseImage, carteGriseVersoImage } = req.body;

    if (!vehicleImage && !carteGriseImage && !carteGriseVersoImage) {
      return res.status(400).json({
        success: false,
        error: 'Au moins une image (carte grise ou véhicule) est requise pour la détection.',
      });
    }

    // Helper to format base64 for Gemini / vision APIs
    const prepareImagePart = (dataUrlOrPath: string) => {
      if (!dataUrlOrPath) return null;

      // If it's a data URL: "data:image/jpeg;base64,..."
      if (dataUrlOrPath.startsWith('data:')) {
        const matches = dataUrlOrPath.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          return {
            mimeType: matches[1],
            base64: matches[2],
            dataUrl: dataUrlOrPath,
          };
        }
      }

      // If it's a local file path (e.g. /src/assets/images/...)
      const resolvedPath = path.join(__dirname, dataUrlOrPath.replace(/^\//, ''));
      if (fs.existsSync(resolvedPath)) {
        const fileBuffer = fs.readFileSync(resolvedPath);
        const mimeType = resolvedPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const base64 = fileBuffer.toString('base64');
        return {
          mimeType,
          base64,
          dataUrl: `data:${mimeType};base64,${base64}`,
        };
      }

      return null;
    };

    const imageParts: { mimeType: string; base64: string; dataUrl: string }[] = [];
    const carteGrisePart = prepareImagePart(carteGriseImage);
    const carteGriseVersoPart = prepareImagePart(carteGriseVersoImage);
    const vehiclePart = prepareImagePart(vehicleImage);

    if (carteGrisePart) imageParts.push(carteGrisePart);
    if (carteGriseVersoPart) imageParts.push(carteGriseVersoPart);
    if (vehiclePart) imageParts.push(vehiclePart);

    // Compress images before sending to vision APIs (avoids payload truncation)
    await Promise.all(
      imageParts.map(async (img) => {
        try {
          let inputBuffer = Buffer.from(img.base64, 'base64');
          try {
            // Probe: fails on HEIC/HEIF which sharp cannot decode
            await sharp(inputBuffer).metadata();
          } catch {
            inputBuffer = Buffer.from(
              await heicConvert({ buffer: inputBuffer, format: 'JPEG', quality: 0.9 })
            );
          }
          const buffer = await sharp(inputBuffer)
            .rotate()
            .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 60 })
            .toBuffer();
          const base64 = buffer.toString('base64');
          img.mimeType = 'image/jpeg';
          img.base64 = base64;
          img.dataUrl = `data:image/jpeg;base64,${base64}`;
        } catch (compressErr: any) {
          console.warn('Compression image ignorée:', compressErr?.message);
        }
      })
    );

    if (imageParts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Impossible de décoder les données de l'image.",
      });
    }

    // If Gemini API is available, attempt live multimodal extraction
    if (aiClient) {
      try {
        const promptText = buildPromptText();

        const parts: any[] = imageParts.map((img) => ({
          inlineData: { mimeType: img.mimeType, data: img.base64 },
        }));
        parts.push({ text: promptText });

        const response = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: SCAN_SCHEMA_PROPERTIES,
              required: ['immatriculation', 'marque'],
            },
          },
        });

        const text = response.text?.trim() || '{}';
        const parsedData = JSON.parse(text);

        if (parsedData && parsedData.immatriculation) {
          return res.json({
            success: true,
            source: 'gemini-2.5-flash',
            data: parsedData,
          });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini API indisponible, tentative via BlockRun:', geminiErr?.message);
        // Fallback gracefully below
      }
    }

    // Free no-key vision APIs fallback (BlockRun, puis LLM7)
    try {
      const result = await analyzeWithFreeVisionApis(imageParts);
      if (result) {
        return res.json({
          success: true,
          source: result.provider,
          data: result.data,
        });
      }
    } catch (visionErr: any) {
      console.warn('APIs vision gratuites indisponibles:', visionErr?.message);
    }

    return res.status(502).json({
      success: false,
      error: "La détection automatique a échoué (service IA indisponible). Réessayez ou saisissez les informations manuellement.",
    });
  } catch (error: any) {
    console.error('Erreur scan carte grise:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Erreur lors de l’analyse du document par le serveur.',
    });
  }
});

// JSON 404 for unknown API routes (avoid HTML responses breaking res.json())
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, error: 'Route API introuvable.' });
});

// Setup Vite in Dev or Serve Static in Prod
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Garage MecaScan opérationnel sur http://localhost:${PORT}`);
  });
}

startServer();
