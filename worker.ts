/**
 * Cloudflare Worker — MecaScan
 * Sert les assets statiques (SPA) + endpoint POST /api/scan-vehicle-registration
 * Détection via APIs vision gratuites (BlockRun, LLM7) ou Gemini si GEMINI_API_KEY définie.
 */

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  GEMINI_API_KEY?: string;
}

const SCAN_PROMPT = `Tu es un assistant expert pour mécaniciens et garagistes automobiles spécialisé dans la lecture optique et l'analyse de documents automobiles français et internationaux (Certificat d'immatriculation / Carte Grise) ainsi que des plaques d'immatriculation sur véhicules.
Les photos peuvent inclure : le recto ET le verso de la carte grise, et/ou une photo du véhicule avec sa plaque. Le verso contient souvent les informations du titulaire (champs C) et le recto les caractéristiques techniques du véhicule (champs D, E, B, P). Analyse toutes les images ensemble pour reconstituer le document complet.
Analyse attentivement la ou les photos fournies :
1. Carte Grise (Certificat d'immatriculation) :
   - Champ (A) : Numéro d'immatriculation. Formats possibles : français (ex: AB-123-CD) ou marocain avec lettre arabe au centre (ex: 54321 | أ | 6). Pour le Maroc, la plaque se lit : chiffres à gauche, LETTRE ARABE au centre (أ، ب، ج، د، هـ، و، ز، ح، ط، ي، ك، ل، م، ن، س، ع، ف، ص، ق، ر، ش، ت), chiffres à droite. Garde la lettre arabe telle quelle dans le résultat, ne la traduis pas et ne la remplace pas par une lettre latine.
   - Champ (C.1 / C.4.1) : Nom et prénom du propriétaire (titulaire du certificat d'immatriculation). S'il y a un prénom et un nom, sépare-les clairement.
   - Champ (C.3) : Adresse complète du propriétaire
   - Champ (D.1) : Marque du constructeur (ex: PEUGEOT, RENAULT, VOLKSWAGEN, TOYOTA, BMW...)
   - Champ (D.3) : Dénomination commerciale / Modèle (ex: 308, CLIO, GOLF, YARIS...)
   - Champ (E) : Numéro d'identification du véhicule (VIN / Numéro de châssis à 17 caractères)
   - Champ (B) : Date de première mise en circulation (format YYYY-MM-DD ou DD/MM/YYYY)
   - Champ (P.3) : Type de carburant / énergie (ex: ES pour Essence, GO pour Gazole/Diesel, EL pour Électrique, EE pour Hybride)
   - Champ (P.6) : Puissance administrative nationale (chevaux fiscaux CV)
   - Champ (J.1) : Genre national (ex: VP pour Véhicule Particulier, CTTE pour Camionnette...)
   - Important : inspecte chaque image attentivement. Si un champ est difficile à lire sur une image, cherche-le sur une autre (ex: plaque du véhicule pour l'immatriculation, verso pour le propriétaire). Ne laisse un champ vide que s'il est vraiment illisible ou absent.

Retourne impérativement un JSON structuré valide selon le schéma fourni.`;

const SCAN_JSON_INSTRUCTION = `Réponds UNIQUEMENT avec un objet JSON contenant exactement ces clés : immatriculation, nomProprietaire, prenomProprietaire, adresseProprietaire, marque, modele, vin, dateMiseEnCirculation, carburant, puissanceFiscale, couleur, rawObservations, confiance. Utilise une chaîne vide "" pour les champs illisibles ou absents. Ne mets aucune clé en dehors de cette liste.`;

interface VisionProvider {
  name: string;
  url: string;
  model: string;
  apiKey?: string;
}

function getProviders(env: Env): VisionProvider[] {
  const providers: VisionProvider[] = [];
  if (env.GEMINI_API_KEY) {
    providers.push({
      name: 'gemini-2.5-flash',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      model: 'gemini-2.5-flash',
      apiKey: env.GEMINI_API_KEY,
    });
  }
  providers.push(
    {
      name: 'blockrun-nemotron',
      url: 'https://blockrun.ai/api/v1/chat/completions',
      model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    },
    {
      name: 'llm7-vision',
      url: 'https://api.llm7.io/v1/chat/completions',
      model: 'default',
    }
  );
  return providers;
}

async function callVisionProvider(
  provider: VisionProvider,
  imageParts: string[]
): Promise<any | null> {
  const content: any[] = [
    { type: 'text', text: `${SCAN_PROMPT}\n\n${SCAN_JSON_INSTRUCTION}` },
    ...imageParts.map((dataUrl) => ({ type: 'image_url', image_url: { url: dataUrl } })),
  ];

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.apiKey) headers['Authorization'] = `Bearer ${provider.apiKey}`;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
      await sleep(4000 * (attempt + 1));
      continue;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`${provider.name} HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const json = await response.json();
    const text: string = json?.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') {
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

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function handleScan(request: Request, env: Env): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Corps de requête JSON invalide.' }, 400);
  }

  const { vehicleImage, carteGriseImage, carteGriseVersoImage } = body || {};

  const imageParts = [carteGriseImage, carteGriseVersoImage, vehicleImage].filter(
    (img): img is string => typeof img === 'string' && img.startsWith('data:')
  );

  if (imageParts.length === 0) {
    return jsonResponse(
      { success: false, error: 'Au moins une image (carte grise ou véhicule) est requise pour la détection.' },
      400
    );
  }

  // Champs clés pour évaluer la qualité d'une extraction
  const KEY_FIELDS = ['immatriculation', 'marque', 'modele', 'vin', 'nomProprietaire'];
  const scoreData = (d: any) =>
    KEY_FIELDS.filter((k) => d && typeof d[k] === 'string' && d[k].trim() !== '').length;

  let best: { provider: string; data: any; score: number } | null = null;
  let lastError: any = null;

  for (const provider of getProviders(env)) {
    // Si on a déjà tous les champs clés, inutile d'insister
    if (best && best.score >= KEY_FIELDS.length) break;
    try {
      const parsed = await callVisionProvider(provider, imageParts);
      if (parsed) {
        const score = scoreData(parsed);
        console.log(`${provider.name}: score=${score}/5`);
        if (!best || score > best.score) {
          best = { provider: provider.name, data: parsed, score };
        }
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`${provider.name} indisponible:`, err?.message);
    }
  }

  if (best && best.score > 0) {
    return jsonResponse({ success: true, source: best.provider, data: best.data });
  }

  return jsonResponse(
    {
      success: false,
      error: `La détection automatique a échoué${lastError?.message ? ` (${lastError.message})` : ''}. Réessayez ou saisissez les informations manuellement.`,
    },
    502
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/scan-vehicle-registration') {
      if (request.method !== 'POST') {
        return jsonResponse({ success: false, error: 'Méthode non autorisée.' }, 405);
      }
      return handleScan(request, env);
    }

    if (url.pathname.startsWith('/api/')) {
      return jsonResponse({ success: false, error: 'Route API introuvable.' }, 404);
    }

    // Assets statiques + fallback SPA
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404) {
      const indexUrl = new URL('/index.html', url.origin);
      return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    }
    return assetResponse;
  },
};
