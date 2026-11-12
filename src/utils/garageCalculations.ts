import { ClientBalance } from '../types/garage';

/**
 * Calcule le montant total d'une ligne de pièce (quantité * prix unitaire) arrondi à 2 décimales.
 */
export function calculatePartLineTotal(quantite: number, prixUnitaire: number): number {
  if (quantite < 0 || prixUnitaire < 0) return 0;
  return Math.round(quantite * prixUnitaire * 100) / 100;
}

/**
 * Calcule l'ensemble des totaux d'une intervention de mécanique :
 * total pièces, main d'œuvre, sous-total, remise, total net, et optionnellement TVA (en général 0% ou forfaitaire dans les ateliers marocains, configurable).
 */
export function calculateInterventionTotals(
  pieces: Array<{ quantite: number; prixUnitaireHT: number }>,
  mainDOeuvreHeures: number = 0,
  tauxHoraireHT: number = 0,
  remiseHT: number = 0,
  tauxTva: number = 0 // Par défaut 0% pour les garages marocains artisanaux
) {
  const totalPiecesHT = pieces.reduce((sum, p) => sum + calculatePartLineTotal(p.quantite, p.prixUnitaireHT), 0);
  const totalMainDOeuvreHT = Math.round(Math.max(0, mainDOeuvreHeures) * Math.max(0, tauxHoraireHT) * 100) / 100;
  const sousTotalHT = Math.round((totalPiecesHT + totalMainDOeuvreHT) * 100) / 100;
  const remiseApplicable = Math.min(sousTotalHT, Math.max(0, remiseHT));
  const totalHT = Math.round((sousTotalHT - remiseApplicable) * 100) / 100;
  const totalTva = Math.round((totalHT * (Math.max(0, tauxTva) / 100)) * 100) / 100;
  const totalTTC = Math.round((totalHT + totalTva) * 100) / 100;

  return {
    totalPiecesHT,
    totalMainDOeuvreHT,
    sousTotalHT,
    remiseHT: remiseApplicable,
    totalHT,
    tauxTva,
    totalTva,
    totalTTC,
  };
}

/**
 * Calcule le solde d'un client (Total facturé - Total des paiements reçus).
 */
export function calculateClientBalance(
  clientId: string,
  interventions: Array<{ clientId: string; totalTTC: number; statut: string }>,
  payments: Array<{ clientId: string; montant: number }>
): ClientBalance {
  const validInterventions = interventions.filter(
    (i) => i.clientId === clientId && i.statut !== 'annule'
  );
  const totalFacture = validInterventions.reduce((sum, i) => sum + (i.totalTTC || 0), 0);
  const totalPaye = payments
    .filter((p) => p.clientId === clientId)
    .reduce((sum, p) => sum + (p.montant || 0), 0);

  const soldeDu = Math.round((totalFacture - totalPaye) * 100) / 100;

  let statut: ClientBalance['statut'] = 'regle';
  if (soldeDu > 0.01) {
    statut = 'en_attente';
  } else if (soldeDu < -0.01) {
    statut = 'crediteur';
  }

  return {
    clientId,
    totalFacture: Math.round(totalFacture * 100) / 100,
    totalPaye: Math.round(totalPaye * 100) / 100,
    soldeDu,
    statut,
  };
}

/**
 * Normalise et formate les plaques marocaines (ex: 54321-A-6 ou 54321 | أ | 6)
 * ainsi que les plaques européennes / SIV.
 */
export function formatMoroccanLicensePlate(plate: string): string {
  if (!plate) return '';
  const clean = plate.trim();

  // Déjà au format marocain avec séparateur pipe : 12345 | أ | 6
  if (clean.includes('|')) {
    return clean;
  }

  // Format marocain tirets : 12345-A-6 ou 12345-أ-6
  const moroccanRegex = /^(\d{1,6})\s*[-/]\s*([A-Za-z\u0600-\u06FF])\s*[-/]\s*(\d{1,2})$/;
  const match = clean.match(moroccanRegex);
  if (match) {
    const letter = match[2].toUpperCase();
    return `${match[1]} | ${letter} | ${match[3]}`;
  }

  // Format standard français SIV (ex: AB-123-CD ou plaque garage W-123-AA)
  const cleanUpper = clean.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const sivRegex = /^([A-Z]{1,2})([0-9]{3})([A-Z]{2})$/;
  if (sivRegex.test(cleanUpper)) {
    return cleanUpper.replace(sivRegex, '$1-$2-$3');
  }

  return clean;
}

// Alias
export const formatLicensePlate = formatMoroccanLicensePlate;

/**
 * Formatage monétaire adapté en Dirhams marocains (DH ou درهم).
 */
export function formatPrice(amount: number, isArabic: boolean = false): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);

  if (isArabic) {
    return `${formatted} درهم`;
  }
  return `${formatted} DH`;
}
