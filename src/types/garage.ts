export type PaymentMethod = 'especes' | 'carte' | 'cheque' | 'virement';

export interface Client {
  id: string;
  nom: string;
  prenom?: string;
  nomComplet: string;
  telephone: string;
  email?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  notes?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  clientId: string;
  immatriculation: string;
  marque: string;
  modele: string;
  vin?: string;
  annee?: number | string;
  dateMiseEnCirculation?: string;
  carburant?: string;
  kilometrageActuel?: number;
  couleur?: string;
  photoVehiculeUrl?: string;
  photoCarteGriseUrl?: string;
  photoCarteGriseVersoUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface ReplacedPart {
  id: string;
  designation: string;
  reference?: string;
  quantite: number;
  prixUnitaireHT: number;
  totalHT: number;
  garantieMois?: number;
}

export type InterventionStatus = 'en_attente' | 'en_cours' | 'termine' | 'facture' | 'annule';

export interface Intervention {
  id: string;
  numeroIntervention: string;
  vehiculeId: string;
  clientId: string;
  dateDebut: string;
  dateFin?: string;
  statut: InterventionStatus;
  motif: string;
  diagnostic?: string;
  kilometrage: number;
  pieces: ReplacedPart[];
  mainDOeuvreHeures: number;
  tauxHoraireHT: number;
  totalPiecesHT: number;
  totalMainDOeuvreHT: number;
  remiseHT: number;
  totalHT: number;
  tauxTva: number; // e.g. 20 for 20%
  totalTva: number;
  totalTTC: number;
  observations?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  numeroRecu: string;
  clientId: string;
  interventionId?: string;
  montant: number;
  mode: PaymentMethod;
  date: string;
  reference?: string; // n° chèque ou virement
  notes?: string;
  createdAt: string;
}

export interface ClientBalance {
  clientId: string;
  totalFacture: number;
  totalPaye: number;
  soldeDu: number; // totalFacture - totalPaye
  statut: 'regle' | 'en_attente' | 'crediteur';
}

export interface ScanRegistrationResult {
  immatriculation: string;
  nomProprietaire: string;
  prenomProprietaire?: string;
  adresseProprietaire?: string;
  marque: string;
  modele: string;
  vin?: string;
  dateMiseEnCirculation?: string;
  carburant?: string;
  puissanceFiscale?: string;
  genreVehicule?: string;
  rawObservations?: string;
  confiance?: 'haute' | 'moyenne' | 'faible';
}
