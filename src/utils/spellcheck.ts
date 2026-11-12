import Typo from 'typo-js';

// French dictionary-backed spellchecker (client-side, no network)
// Dictionnaire fr hébergé dans public/dictionaries/fr (servi par Vite)
const typo = new Typo('fr', undefined, undefined, {
  dictionaryPath:
    typeof window !== 'undefined' ? '/dictionaries' : undefined,
});

// Jargon automobile marocain / français — ces termes ne sont pas dans le dictionnaire classique
const AUTOMOTIVE_TERMS = new Set([
  // Mécanique moteur
  'moteur', 'piston', 'pistons', 'segmentation', 'vilebrequin', 'bielle', 'bielles',
  'soupape', 'soupapes', 'soupapes', 'carter', 'carters', 'cylindre', 'cylindres',
  'injecteur', 'injecteurs', 'injection', 'turbo', 'turbocharger', 'turbocompresseur',
  'compresseur', 'turbocompresseur', 'alternateur', 'démarreur', 'demarreur',
  'volant', 'volant-moteur', 'embrayage', 'embrayages', 'mécanisme', 'disque',
  'plateau', 'butée', 'butee', 'butées', 'butees', 'kit', 'kit-embrayage',
  'distribution', 'courroie', 'courroies', 'poulie', 'galet', 'tendeur',
  'pompe', 'pompes', 'pompe-à-eau', 'pompe-a-eau', 'thermostat', 'radiateur',
  'durite', 'durites', 'flexible', 'flexibles', 'récupérateur', 'recuperateur',
  'batterie', 'batteries', 'bougie', 'bougies', 'bobine', 'bobines',
  'filtre', 'filtres', 'filtre-huile', 'filtre-air', 'filtre-habitacle',
  'huile', 'huiles', 'vidange', 'vidanges', 'graisse', 'graisses', 'liquide',
  'frein', 'freins', 'freinage', 'plaquette', 'plaquettes', 'disque', 'disques',
  'amortisseur', 'amortisseurs', 'amorto', 'suspension', 'suspensions',
  'rotule', 'rotules', 'silentbloc', 'silent-bloc', 'silentblocs', 'silent-blocs',
  'roulement', 'roulements', 'rotule', 'biellette', 'biellettes', 'barre',
  'barres', 'barre-stabilisateur', 'triangle', 'bras', 'bras-oscillant',
  'fusée', 'fusee', 'fusées', 'fusees', 'molette', 'molette',
  'direction', 'boîtier', 'boitier', 'crémaillère', 'cremaillere',
  'électronique', 'electronique', 'capteur', 'capteurs', 'sonde', 'sondes',
  'calculateurs', 'calculateur', 'centralite', 'centralité', 'alarme',
  'autoradio', 'radio', 'gps', 'camera', 'caméra', 'pare-brise', 'parebrise',
  'essuie', 'essuie-glace', 'essuie-glace', 'balai', 'balais', 'essuie-glaces',
  'feu', 'feux', 'phare', 'phares', 'clignotant', 'clignotants', 'rétroviseur',
  'retroviseur', 'rétroviseurs', 'retroviseurs', 'grille', 'calandre',
  'hayon', 'capot', 'portière', 'portiere', 'vitre', 'vitres', 'lève-vitre',
  'leve-vitre', 'serrure', 'serrures', 'poignée', 'poignee', 'contacteur',
  'contacteurs', 'neiman', 'clé', 'cle', 'clés', 'cles', 'clé-contact',
  'compresseur-clim', 'climatisation', 'clim', 'condenseur', 'évaporateur',
  'evaporateur', 'pulseur', 'pulseurs', 'ventilateur', 'ventilateurs',
  // Transmission / châssis
  'boîte', 'boite', 'boîtes', 'boites', 'vitesse', 'vitesses', 'rapport',
  'différentiel', 'differentiel', 'cardan', 'joint', 'joints', 'sellet',
  'suspension', 'châssis', 'chassis', 'arbre', 'arbres', 'transmission',
  'pont', 'ponts', 'roue', 'roues', 'jante', 'jantes', 'pneu', 'pneus',
  'crevaison', 'crevaison', 'equilibrage', 'équilibrage', 'parallélisme',
  'parallellisme', 'parallelogramme', 'parallélogramme', 'carrossage',
  // Électricité / éclairage
  'ampoule', 'ampoules', 'halogène', 'halogene', 'xénon', 'xenon', 'led',
  'feu-de-croisement', 'feu-de-route', 'stop', 'feu-stop', 'antibrouillard',
  'antibrouillards', 'feu-arrière', 'feux-arrière', 'projecteur',
  'projecteurs', 'optique', 'optique', 'lanterne', 'lanternes',
  // Carrosserie / esthétique
  'aile', 'ailes', 'rétroviseur', 'retroviseur', 'pare-chocs', 'parechocs',
  'enjoliveur', 'enjoliveurs', 'calandre', 'calandres', 'toit', 'toits',
  'antenne', 'antennes', 'baguette', 'baguettes', 'bavette', 'bavettes',
  'cache', 'caches', 'habillage', 'habillages', 'sellerie', 'selleries',
  'siège', 'siege', 'sièges', 'sieges', 'volant', 'tableau', 'tableau-de-bord',
  // Consommables / entretien
  'entretiens', 'entretien', 'révision', 'revision', 'contrôle-technique',
  'controle-technique', 'ct', 'vidange-huile', 'filtre-carburant',
  'filtre-particules', 'fap', 'catalyseur', 'catalyseurs', 'pot', 'pots',
  'echappement', 'échappement', 'silencieux', 'silencieux', 'collecteur',
  // Marques / termes techniques courants
  'abs', 'esp', 'airbag', 'airbags', 'tpms', 'start-stop', 'hybride',
  'hybrides', 'électrique', 'electrique', 'electriques', 'rechargeable',
  'rechargeables', 'puissance', 'couple', 'consommation', 'kilometrage',
  'kilométrage', 'compteur', 'compteurs', 'chronotaxe', 'tachymètre',
  // Abréviations / références fréquentes
  'ht', 'ttc', 'cv', 'ch', 'kw', 'bar', 'psi', 'rpm', 'obd', 'diag',
  'diag', 'multimètre', 'multimetre', 'valise', 'clé-britannique',
]);

const SKIP_PATTERN = /[\d_]|^[A-Z]{2,}[-\s]?[A-Z0-9]*$|[-/]/;

const MIN_WORD_LENGTH = 3;

function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zàâäéèêëïîôùûüçœ]/gi, '');
}

/**
 * Vérifie si un mot est correctement orthographié
 * (dictionnaire français + jargon automobile autorisé).
 */
export function isWordCorrect(word: string): boolean {
  const cleaned = word.trim();
  if (!cleaned || cleaned.length < MIN_WORD_LENGTH) return true;
  if (SKIP_PATTERN.test(cleaned)) return true; // codes, références, sigles

  const lower = normalizeWord(cleaned);
  if (!lower) return true;
  if (AUTOMOTIVE_TERMS.has(lower) || AUTOMOTIVE_TERMS.has(cleaned.toLowerCase())) return true;

  return typo.check(lower);
}

export interface SpellSuggestion {
  original: string;
  corrected: string;
  changes: { from: string; to: string }[];
}

/**
 * Retourne une suggestion de correction pour une désignation de pièce.
 * null si le texte est déjà correct ou trop court.
 */
export function suggestCorrection(text: string): SpellSuggestion | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 4) return null;

  const words = trimmed.split(/(\s+)/); // conserve les espaces
  const changes: { from: string; to: string }[] = [];
  let corrected = '';

  for (const token of words) {
    if (!token.trim()) {
      corrected += token;
      continue;
    }
    if (isWordCorrect(token)) {
      corrected += token;
      continue;
    }

    const lower = normalizeWord(token);
    const suggestions = typo.suggest(lower);
    // Préfère une suggestion qui est un terme automobile connu
    const best =
      suggestions.find((s) => AUTOMOTIVE_TERMS.has(s)) ||
      suggestions[0];

    if (best && best !== lower) {
      // Conserve la casse approximative du mot d'origine
      const replacement =
        token[0] === token[0].toUpperCase()
          ? best.charAt(0).toUpperCase() + best.slice(1)
          : best;
      corrected += replacement;
      changes.push({ from: token, to: replacement });
    } else {
      corrected += token;
    }
  }

  if (changes.length === 0 || corrected === trimmed) return null;
  return { original: trimmed, corrected, changes };
}
