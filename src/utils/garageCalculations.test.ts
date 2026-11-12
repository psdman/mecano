import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePartLineTotal,
  calculateInterventionTotals,
  calculateClientBalance,
  formatMoroccanLicensePlate,
  formatPrice,
} from './garageCalculations';

test('calculatePartLineTotal computes line in Moroccan Dirhams', () => {
  assert.equal(calculatePartLineTotal(2, 250), 500);
  assert.equal(calculatePartLineTotal(1, 380), 380);
});

test('calculateInterventionTotals computes parts, labor and discount', () => {
  const parts = [
    { quantite: 1, prixUnitaireHT: 380 }, // Vidange
    { quantite: 1, prixUnitaireHT: 250 }, // Plaquettes
  ];
  // MO: 2 hours at 100 DH/h = 200 DH
  // Subtotal: 830 DH, remise: 30 DH -> 800 DH
  const totals = calculateInterventionTotals(parts, 2, 100, 30, 0);

  assert.equal(totals.totalPiecesHT, 630);
  assert.equal(totals.totalMainDOeuvreHT, 200);
  assert.equal(totals.remiseHT, 30);
  assert.equal(totals.totalHT, 800);
  assert.equal(totals.totalTTC, 800);
});

test('calculateClientBalance manages client credit / debt in DH', () => {
  const interventions = [
    { clientId: 'c1', totalTTC: 1500, statut: 'termine' },
    { clientId: 'c1', totalTTC: 800, statut: 'facture' },
  ];
  const payments = [
    { clientId: 'c1', montant: 1000 },
  ];

  const ledger = calculateClientBalance('c1', interventions, payments);
  assert.equal(ledger.totalFacture, 2300);
  assert.equal(ledger.totalPaye, 1000);
  assert.equal(ledger.soldeDu, 1300);
  assert.equal(ledger.statut, 'en_attente');
});

test('formatMoroccanLicensePlate handles Moroccan plate formats', () => {
  assert.equal(formatMoroccanLicensePlate('54321-A-6'), '54321 | A | 6');
  assert.equal(formatMoroccanLicensePlate('12345-أ-26'), '12345 | أ | 26');
  assert.equal(formatMoroccanLicensePlate('54321 | أ | 6'), '54321 | أ | 6');
  assert.equal(formatMoroccanLicensePlate('eb456jk'), 'EB-456-JK');
});

test('formatPrice displays Moroccan DH and Arabic Dirham', () => {
  assert.ok(formatPrice(1250, false).includes('DH'));
  assert.ok(formatPrice(1250, true).includes('درهم'));
});
