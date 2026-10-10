'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./calculs.js');

const proche = (a, b, eps = 0.005) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test('parseNombre : virgule, vide, zéro conservé, négatif ramené à 0', () => {
  assert.equal(C.parseNombre('2,5', 0), 2.5);
  assert.equal(C.parseNombre('', 30), 30);
  assert.equal(C.parseNombre('abc', 30), 30);
  assert.equal(C.parseNombre('0', 30), 0); // l'ancien `|| 30` écrasait ce 0
  assert.equal(C.parseNombre('-5', 0), 0);
});

test('estimerValeur : ThinkPad T / i3 6e gen, 8 Go, SSD 256, état bon = 65+15+20+15 = 115 €', () => {
  assert.equal(C.estimerValeur({ modele: 'thinkpad_t', gen: 'i3_6', ram: 15, ssd: 20, etat: 15, defauts: [] }), 115);
});
test('estimerValeur : défauts soustraits (dalle −30, batterie −15)', () => {
  assert.equal(C.estimerValeur({ modele: 'thinkpad_t', gen: '8', ram: 30, ssd: 30, etat: 0, defauts: [-30, -15] }), 130 + 30 + 30 - 45); // 145
});
test('estimerValeur : plancher à 30 €, base 80 € si modèle inconnu', () => {
  assert.equal(C.estimerValeur({ modele: 'autre_fixe', gen: 'i3_6', ram: 0, ssd: 0, etat: -20, defauts: [-30, -25] }), 30);
  assert.equal(C.baseMarche('inconnu', 'x'), 80);
});

test('octroi de mer : 20 € de pièces × 2,5 % = 0,50 €', () => {
  assert.equal(C.coutOctroi(20, 2.5), 0.5);
  assert.equal(C.coutOctroi(100, 0), 0);
});
test('main d\'œuvre : 1,5 h × 35 €/h = 52,50 €', () => {
  assert.equal(C.coutMainOeuvre(1.5, 35), 52.5);
});

test('TVA 8,5 % : 108,50 € TTC = 100 € HT + 8,50 € de TVA', () => {
  proche(C.prixHT(108.5, 8.5), 100);
  proche(C.montantTVA(108.5, 8.5), 8.5);
  assert.equal(C.prixHT(115, 0), 115);
});

test('calculerMarge sans TVA : valeur 115, achat 30, pièces 20, octroi 2,5 %, 1 h × 35', () => {
  const r = C.calculerMarge({ valeur: 115, achat: 30, pieces: 20, octroiPct: 2.5, heures: 1, taux: 35, tvaPct: 0 });
  assert.equal(r.coutTotal, 85.5);
  assert.equal(r.marge, 29.5);
  proche(r.roi, 34.50);          // 29,5 / 85,5
  proche(r.margeSurPrix, 25.65); // 29,5 / 115
  proche(r.fourchetteBasse, 103.5);
  proche(r.fourchetteHaute, 126.5);
  assert.equal(r.perteNegociation, false);
});
test('calculerMarge avec TVA 8,5 % : 108,50 € TTC → recettes 100 € HT', () => {
  const r = C.calculerMarge({ valeur: 108.5, achat: 40, pieces: 0, octroiPct: 0, heures: 0, taux: 0, tvaPct: 8.5 });
  proche(r.recettes, 100);
  proche(r.tva, 8.5);
  proche(r.marge, 60);
  proche(r.roi, 150);
});
test('calculerMarge : alerte de perte seulement si la fourchette basse (−10 %) passe sous le coût', () => {
  const r = C.calculerMarge({ valeur: 100, achat: 50, pieces: 20, octroiPct: 0, heures: 0.5, taux: 35, tvaPct: 0 });
  assert.equal(r.coutTotal, 87.5);
  assert.equal(r.marge, 12.5);
  assert.equal(r.perteNegociation, false); // fourchette basse 90 € ≥ coût 87,50 €
  const r2 = C.calculerMarge({ valeur: 100, achat: 55, pieces: 20, octroiPct: 0, heures: 0.5, taux: 35, tvaPct: 0 });
  assert.equal(r2.coutTotal, 92.5);
  assert.equal(r2.perteNegociation, true); // 90 € < 92,50 €
});
test('calculerMarge : opération déficitaire, ROI négatif', () => {
  const r = C.calculerMarge({ valeur: 60, achat: 50, pieces: 20, octroiPct: 2.5, heures: 1, taux: 35, tvaPct: 0 });
  proche(r.marge, -45.5);
  assert.ok(r.roi < 0);
  assert.equal(r.perteNegociation, true);
});
test('calculerMarge : coût nul → ROI non défini (null)', () => {
  const r = C.calculerMarge({ valeur: 50, achat: 0, pieces: 0, octroiPct: 0, heures: 0, taux: 0, tvaPct: 0 });
  assert.equal(r.roi, null);
});

test('calculerAchatMax : vente 120, ROI 30 %, pièces 20, octroi 2,5 %, 1 h × 35 → achat max 36,81 €', () => {
  const r = C.calculerAchatMax({ prixVente: 120, roiMin: 30, pieces: 20, octroiPct: 2.5, heures: 1, taux: 35, tvaPct: 0 });
  proche(r.coutHorsAchat, 55.5);
  proche(r.coutTotalCible, 92.31); // 120 / 1,3
  proche(r.achatMax, 36.81);
  assert.equal(r.realisable, true);
  proche(r.marge, 27.69);
  proche(r.roi, 30);               // l'objectif est bien atteint, à l'identique
});
test('calculerAchatMax avec TVA 8,5 % : 120 € TTC = 110,60 € HT → achat max 29,58 €', () => {
  const r = C.calculerAchatMax({ prixVente: 120, roiMin: 30, pieces: 20, octroiPct: 2.5, heures: 1, taux: 35, tvaPct: 8.5 });
  proche(r.recettes, 110.60);
  proche(r.achatMax, 29.58);
  proche(r.roi, 30);
});
test('calculerAchatMax : cohérence avec calculerMarge (acheter au max donne le ROI visé)', () => {
  const p = { pieces: 15, octroiPct: 4, heures: 2, taux: 30 };
  const inv = C.calculerAchatMax({ ...p, prixVente: 200, roiMin: 45, tvaPct: 8.5 });
  const m = C.calculerMarge({ ...p, valeur: 200, achat: inv.achatMax, tvaPct: 8.5 });
  proche(m.roi, 45, 1e-9);
});
test('calculerAchatMax : coûts hors achat trop élevés → irréalisable, achat max 0, marge négative non masquée', () => {
  const r = C.calculerAchatMax({ prixVente: 60, roiMin: 30, pieces: 40, octroiPct: 2.5, heures: 1, taux: 35, tvaPct: 0 });
  assert.equal(r.realisable, false);
  assert.equal(r.achatMax, 0);
  proche(r.achatMaxBrut, 60 / 1.3 - 76); // −29,85
  proche(r.marge, 60 - 76);              // −16 : l'ancien code affichait « +-16€ »
});
test('calculerAchatMax : ROI visé à 0 % est accepté (l\'ancien `|| 30` le transformait en 30 %)', () => {
  const r = C.calculerAchatMax({ prixVente: 100, roiMin: 0, pieces: 0, octroiPct: 0, heures: 0, taux: 0, tvaPct: 0 });
  assert.equal(r.achatMax, 100);
});
