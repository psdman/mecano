/**
 * Cloudflare Worker — MecaScan
 * Sert les assets statiques (SPA) + endpoint POST /api/scan-vehicle-registration
 * Détection via APIs vision gratuites (BlockRun, LLM7) ou Gemini si GEMINI_API_KEY définie.
 */

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  GEMINI_API_KEY?: string;
  DB?: any; // D1Database
}

const SCAN_PROMPT = `Tu es un assistant expert pour mécaniciens et garagistes automobiles spécialisé dans la lecture optique et l'analyse de documents automobiles français et internationaux (Certificat d'immatriculation / Carte Grise) ainsi que des plaques d'immatriculation sur véhicules.
Les photos peuvent inclure : le recto ET le verso de la carte grise, et/ou une photo du véhicule avec sa plaque. Le verso contient souvent les informations du titulaire (champs C) et le recto les caractéristiques techniques du véhicule (champs D, E, B, P). Analyse toutes les images ensemble pour reconstituer le document complet.
Analyse attentivement la ou les photos fournies :
1. Carte Grise (Certificat d'immatriculation) :
   - Champ (A) : Numéro d'immatriculation. Formats possibles : français (ex: AB-123-CD) ou marocain avec lettre arabe au centre (ex: 54321 | أ | 6). Pour le Maroc, la plaque se lit : chiffres à gauche, LETTRE ARABE au centre (أ، ب، ج، د، هـ، و، ز، ح، ط، ي، ك، ل، م، ن، س، ع، ف، ص، ق، ر، ش، ت), chiffres à droite. Garde la lettre arabe telle quelle dans le résultat, ne la traduis pas et ne la remplace pas par une lettre latine. Pour le Maroc, renvoie le résultat EXACTEMENT au format 'NNNNN | L | NN' (chiffres, pipe, lettre arabe, pipe, chiffres) — jamais l'inverse.
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
      name: 'gemini-3.5-flash-lite',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      model: 'gemini-3.5-flash-lite',
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
      await sleep(2000 * (attempt + 1));
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
  const errors: string[] = [];

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
      } else {
        errors.push(`${provider.name}: aucun champ détecté`);
      }
    } catch (err: any) {
      errors.push(`${provider.name}: ${err?.message || 'erreur'}`);
      console.warn(`${provider.name} indisponible:`, err?.message);
    }
  }

  if (best && best.score > 0) {
    return jsonResponse({ success: true, source: best.provider, data: best.data });
  }

  return jsonResponse(
    {
      success: false,
      error: `La détection automatique a échoué. Réessayez ou saisissez les informations manuellement. (${errors.join(' | ') || 'aucun provider configuré'})`,
    },
    502
  );
}

// ================= AUTH & D1 DATABASE =================

const SESSION_COOKIE = 'mecano_session';
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;

function uuid(): string {
  return crypto.randomUUID();
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 },
    key,
    256
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('Cookie') || '';
  for (const part of cookie.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

async function getSessionUser(request: Request, env: Env): Promise<any | null> {
  if (!env.DB) return null;
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.username, u.role, u.nom, u.permissions FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`
  ).bind(token, Date.now()).first();
  return row || null;
}

function requireDb(env: Env): Response | null {
  if (!env.DB) return jsonResponse({ success: false, error: 'Base de données non configurée (D1).' }, 503);
  return null;
}

const COLLECTIONS: Record<string, { table: string; idCol?: string }> = {
  clients: { table: 'clients' },
  vehicles: { table: 'vehicles' },
  interventions: { table: 'interventions' },
  payments: { table: 'payments' },
};

async function handleAuth(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;

  if (path === '/api/auth/login' && request.method === 'POST') {
    const dbErr = requireDb(env); if (dbErr) return dbErr;
    await seedAdminIfEmpty(env); // crée admin/admin123 si table vide
    const { username, password } = await request.json().catch(() => ({}));
    const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
    if (!user) return jsonResponse({ success: false, error: 'Identifiants incorrects.' }, 401);
    const hash = await hashPassword(password, user.salt);
    if (hash !== user.password_hash) return jsonResponse({ success: false, error: 'Identifiants incorrects.' }, 401);

    // seed admin par défaut si table users vide gérée à la création
    const token = uuid();
    await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(token, user.id, Date.now() + SESSION_TTL_MS).run();

    const ALL_PERMS = { dashboard: true, workflow: true, interventions: true, vehicles: true, clients: true, caisse: true };
    const res = jsonResponse({
      success: true,
      user: {
        id: user.id, username: user.username, role: user.role, nom: user.nom,
        permissions: user.permissions ? JSON.parse(user.permissions) : ALL_PERMS,
      },
    });
    res.headers.append('Set-Cookie',
      `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${url.protocol === 'https:' ? '; Secure' : ''}`);
    return res;
  }

  if (path === '/api/auth/change-password' && request.method === 'POST') {
    const dbErr = requireDb(env); if (dbErr) return dbErr;
    const me = await getSessionUser(request, env);
    if (!me) return jsonResponse({ success: false, error: 'Non authentifié.' }, 401);
    const { oldPassword, newPassword } = await request.json().catch(() => ({}));
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first();
    const hash = await hashPassword(oldPassword || '', user.salt);
    if (hash !== user.password_hash) return jsonResponse({ success: false, error: 'Ancien mot de passe incorrect.' }, 400);
    const salt = uuid();
    const newHash = await hashPassword(newPassword || '', salt);
    await env.DB.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').bind(newHash, salt, me.id).run();
    return jsonResponse({ success: true });
  }

  if (path === '/api/auth/logout' && request.method === 'POST') {
    const token = getCookie(request, SESSION_COOKIE);
    if (token && env.DB) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    const res = jsonResponse({ success: true });
    res.headers.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
    return res;
  }

  if (path === '/api/auth/me' && request.method === 'GET') {
    const user = await getSessionUser(request, env);
    return jsonResponse(user ? { success: true, user } : { success: false }, user ? 200 : 401);
  }

  return null;
}

async function seedAdminIfEmpty(env: Env) {
  if (!env.DB) return;
  const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM users').first();
  if (count && count.c === 0) {
    const salt = uuid();
    const hash = await hashPassword('admin123', salt);
    await env.DB.prepare('INSERT INTO users (id, username, password_hash, salt, role, nom) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(uuid(), 'admin', hash, salt, 'admin', 'Administrateur').run();
    console.log('Admin par défaut créé : admin / admin123');
  }
}

// ---- Users management (admin only) ----
async function handleUsers(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/users')) return null;
  const dbErr = requireDb(env); if (dbErr) return dbErr;
  const me = await getSessionUser(request, env);
  if (!me) return jsonResponse({ success: false, error: 'Non authentifié.' }, 401);
  if (me.role !== 'admin') return jsonResponse({ success: false, error: 'Accès réservé aux administrateurs.' }, 403);

  if (url.pathname === '/api/users' && request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT id, username, role, nom, permissions, created_at FROM users').all();
    return jsonResponse({ success: true, users: results });
  }

  if (url.pathname === '/api/users' && request.method === 'POST') {
    const { username, password, role, nom, permissions } = await request.json().catch(() => ({}));
    if (!username || !password) return jsonResponse({ success: false, error: 'username et password requis.' }, 400);
    const salt = uuid();
    const hash = await hashPassword(password, salt);
    const perms = permissions && typeof permissions === 'object' ? JSON.stringify(permissions) : null;
    try {
      await env.DB.prepare('INSERT INTO users (id, username, password_hash, salt, role, nom, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(uuid(), username, hash, salt, role === 'admin' ? 'admin' : 'mecanicien', nom || '', perms).run();
    } catch {
      return jsonResponse({ success: false, error: 'Ce nom d’utilisateur existe déjà.' }, 409);
    }
    return jsonResponse({ success: true });
  }

  const delMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (delMatch && request.method === 'DELETE') {
    if (delMatch[1] === me.id) return jsonResponse({ success: false, error: 'Vous ne pouvez pas supprimer votre propre compte.' }, 400);
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(delMatch[1]).run();
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(delMatch[1]).run();
    return jsonResponse({ success: true });
  }
  return null;
}

// ---- Settings (lecture: tout user connecté, écriture: admin) ----
async function handleSettings(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname !== '/api/settings') return null;
  const dbErr = requireDb(env); if (dbErr) return dbErr;
  const me = await getSessionUser(request, env);
  if (!me) return jsonResponse({ success: false, error: 'Non authentifié.' }, 401);

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
    const settings: Record<string, string> = {};
    for (const r of results || []) settings[r.key] = r.value;
    return jsonResponse({ success: true, settings });
  }

  if (request.method === 'PUT') {
    if (me.role !== 'admin') return jsonResponse({ success: false, error: 'Réservé aux administrateurs.' }, 403);
    const body = await request.json().catch(() => ({}));
    for (const [key, value] of Object.entries(body || {})) {
      if (typeof key !== 'string' || key.length > 64) continue;
      await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .bind(key, String(value)).run();
    }
    return jsonResponse({ success: true });
  }
  return null;
}

// ---- Data CRUD (authentifié) ----
async function handleData(request: Request, env: Env, url: URL): Promise<Response | null> {
  const m = url.pathname.match(/^\/api\/data\/([a-z]+)(?:\/([^/]+))?$/);
  if (!m) return null;
  const dbErr = requireDb(env); if (dbErr) return dbErr;
  const me = await getSessionUser(request, env);
  if (!me) return jsonResponse({ success: false, error: 'Non authentifié.' }, 401);

  const coll = m[1];
  const cfg = COLLECTIONS[coll];
  if (!cfg) return jsonResponse({ success: false, error: 'Collection inconnue.' }, 404);
  const id = m[2];

  // GET /api/data/:coll → liste
  if (!id && request.method === 'GET') {
    const { results } = await env.DB.prepare(`SELECT data FROM ${cfg.table}`).all();
    return jsonResponse({ success: true, items: results.map((r: any) => JSON.parse(r.data)) });
  }

  // PUT /api/data/:coll/replace → remplace toute la collection (sync frontend)
  if (id === 'replace' && request.method === 'PUT') {
    const items = await request.json().catch(() => null);
    if (!Array.isArray(items)) return jsonResponse({ success: false, error: 'Tableau attendu.' }, 400);
    const keepIds = items.map((i: any) => i.id);
    const placeholders = keepIds.map(() => '?').join(',');
    if (keepIds.length > 0) {
      await env.DB.prepare(`DELETE FROM ${cfg.table} WHERE id NOT IN (${placeholders})`).bind(...keepIds).run();
    } else {
      await env.DB.prepare(`DELETE FROM ${cfg.table}`).run();
    }
    for (const item of items) {
      const itemId = item.id;
      const exists = await env.DB.prepare(`SELECT id FROM ${cfg.table} WHERE id = ?`).bind(itemId).first();
      if (exists) {
        await env.DB.prepare(`UPDATE ${cfg.table} SET data = ? WHERE id = ?`).bind(JSON.stringify(item), itemId).run();
      } else {
        await env.DB.prepare(`INSERT INTO ${cfg.table} (id, data) VALUES (?, ?)`).bind(itemId, JSON.stringify(item)).run();
      }
    }
    return jsonResponse({ success: true });
  }

  // POST /api/data/:coll → upsert un item
  if (!id && request.method === 'POST') {
    const item = await request.json().catch(() => null);
    if (!item || !item.id) return jsonResponse({ success: false, error: 'Item invalide.' }, 400);
    const itemId = item.id;
    const exists = await env.DB.prepare(`SELECT id FROM ${cfg.table} WHERE id = ?`).bind(itemId).first();
    if (exists) {
      await env.DB.prepare(`UPDATE ${cfg.table} SET data = ? WHERE id = ?`).bind(JSON.stringify(item), itemId).run();
    } else {
      const extraCols = ['client_id','vehicule_id','statut','intervention_id'].filter(c => item[c] !== undefined);
      const cols = ['id', ...extraCols, 'data'];
      const vals = [itemId, ...extraCols.map(c => item[c]), JSON.stringify(item)];
      await env.DB.prepare(`INSERT INTO ${cfg.table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...vals).run();
    }
    return jsonResponse({ success: true });
  }

  // PUT /api/data/:coll/:id → update
  if (id && request.method === 'PUT') {
    const item = await request.json().catch(() => null);
    if (!item) return jsonResponse({ success: false, error: 'Item invalide.' }, 400);
    await env.DB.prepare(`UPDATE ${cfg.table} SET data = ? WHERE id = ?`).bind(JSON.stringify(item), id).run();
    return jsonResponse({ success: true });
  }

  // DELETE /api/data/:coll/:id
  if (id && request.method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM ${cfg.table} WHERE id = ?`).bind(id).run();
    return jsonResponse({ success: true });
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await routeRequest(request, env);
    } catch (err: any) {
      console.error('Worker error:', err);
      return jsonResponse({ success: false, error: `Erreur serveur: ${err?.message || 'inconnue'}` }, 500);
    }
  },
};

async function routeRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/scan-vehicle-registration') {
      if (request.method !== 'POST') {
        return jsonResponse({ success: false, error: 'Méthode non autorisée.' }, 405);
      }
      // La détection nécessite une session
      const user = await getSessionUser(request, env);
      if (!user) return jsonResponse({ success: false, error: 'Non authentifié.' }, 401);
      return handleScan(request, env);
    }

    const authRes = await handleAuth(request, env, url);
    if (authRes) return authRes;

    const usersRes = await handleUsers(request, env, url);
    if (usersRes) return usersRes;

    const settingsRes = await handleSettings(request, env, url);
    if (settingsRes) return settingsRes;

    const dataRes = await handleData(request, env, url);
    if (dataRes) return dataRes;

    // Seed admin au premier accès API
    if (env.DB && url.pathname.startsWith('/api/')) await seedAdminIfEmpty(env);

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
}
