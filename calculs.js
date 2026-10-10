/* PixelDoc — Simulateur de prix : calculs purs (aucun accès au DOM).
   Chargé par index.html (global `PDCalc`) et testé sous Node (`npm test`).
   Chaque formule est documentée dans CALCULS.md ; les sources officielles y sont citées.

   Conventions : montants en euros ; taux en POURCENTAGE (8.5 = 8,5 %) ; aucun arrondi ici
   (l'arrondi est fait uniquement à l'affichage). */
(function (root) {
'use strict';

/* ===== PARAMÈTRES ===== */
const PLANCHER_VALEUR = 30;   // € — une machine n'est jamais estimée sous ce prix
const ECART_FOURCHETTE = 0.10; // ±10 % autour du prix conseillé (marge de négociation)
const BASE_PAR_DEFAUT = 80;   // € — si modèle/processeur absent de la table
const TVA_REUNION = 8.5;      // % — taux normal TVA à La Réunion (CGI art. 296)
const TVA_FRANCHISE = 0;      // % — pas de TVA (franchise en base / prix sans TVA)

/* ===== BASE PRIX MARCHÉ — prix de revente estimé d'une machine de référence (RAM 4 Go,
   HDD, état « correct »), par modèle puis par processeur. Données saisies à la main. ===== */
const BASE = {
  thinkpad_t:   { i3_6:65, i3_8:80,  i3_10:95,  i3_12:115,
                  6:90,  7:100, 8:130, 9:140, 10:155, 11:170, 12:185, 13:200, 14:210,
                  '6i7':115, '8i7':160, '10i7':185, '12i7':215, '13i7':230,
                  r3_3:80, r5_3:100, r5_5:130, r7_3:120, r7_5:155 },

  thinkpad_x:   { i3_6:60, i3_8:75,  i3_10:90,  i3_12:110,
                  6:85,  7:95,  8:125, 9:135, 10:150, 11:165, 12:180, 13:195, 14:205,
                  '6i7':110, '8i7':155, '10i7':180, '12i7':210, '13i7':225,
                  r3_3:75, r5_3:95,  r5_5:125, r7_3:115, r7_5:150 },

  ideapad:      { i3_6:50, i3_8:65,  i3_10:80,  i3_12:95,
                  6:70,  7:80,  8:105, 9:115, 10:130, 11:145, 12:160, 13:175, 14:185,
                  '6i7':90,  '8i7':130, '10i7':155, '12i7':180, '13i7':195,
                  r3_3:65, r5_3:85,  r5_5:110, r7_3:100, r7_5:135 },

  dell_latitude:{ i3_6:55, i3_8:70,  i3_10:85,  i3_12:105,
                  6:80,  7:90,  8:120, 9:130, 10:145, 11:160, 12:175, 13:190, 14:200,
                  '6i7':105, '8i7':150, '10i7':175, '12i7':205, '13i7':220,
                  r3_3:70, r5_3:90,  r5_5:120, r7_3:110, r7_5:145 },

  dell_optiplex:{ i3_6:45, i3_8:60,  i3_10:75,  i3_12:90,
                  6:70,  7:80,  8:110, 9:120, 10:135, 11:150, 12:165, 13:180, 14:190,
                  '6i7':95,  '8i7':140, '10i7':165, '12i7':190, '13i7':205,
                  r3_3:60, r5_3:80,  r5_5:105, r7_3:95,  r7_5:130 },

  hp_elite:     { i3_6:55, i3_8:70,  i3_10:85,  i3_12:105,
                  6:80,  7:90,  8:120, 9:130, 10:145, 11:160, 12:175, 13:190, 14:200,
                  '6i7':105, '8i7':150, '10i7':175, '12i7':205, '13i7':220,
                  r3_3:70, r5_3:90,  r5_5:120, r7_3:110, r7_5:145 },

  acer:         { i3_6:45, i3_8:58,  i3_10:72,  i3_12:88,
                  6:65,  7:75,  8:100, 9:110, 10:125, 11:138, 12:152, 13:165, 14:175,
                  '6i7':85,  '8i7':125, '10i7':148, '12i7':172, '13i7':185,
                  r3_3:60, r5_3:78,  r5_5:102, r7_3:92,  r7_5:125 },

  asus:         { i3_6:48, i3_8:62,  i3_10:76,  i3_12:92,
                  6:68,  7:78,  8:105, 9:115, 10:128, 11:142, 12:156, 13:170, 14:180,
                  '6i7':88,  '8i7':130, '10i7':152, '12i7':176, '13i7':190,
                  r3_3:62, r5_3:82,  r5_5:108, r7_3:96,  r7_5:130 },

  autre_laptop: { i3_6:40, i3_8:52,  i3_10:65,  i3_12:80,
                  6:60,  7:70,  8:90,  9:100, 10:115, 11:128, 12:142, 13:155, 14:165,
                  '6i7':80,  '8i7':110, '10i7':135, '12i7':158, '13i7':172,
                  r3_3:55, r5_3:72,  r5_5:95,  r7_3:85,  r7_5:115 },

  autre_fixe:   { i3_6:35, i3_8:45,  i3_10:58,  i3_12:70,
                  6:50,  7:60,  8:80,  9:90,  10:100, 11:112, 12:125, 13:138, 14:148,
                  '6i7':70,  '8i7':100, '10i7':120, '12i7':142, '13i7':155,
                  r3_3:48, r5_3:62,  r5_5:82,  r7_3:72,  r7_5:102 },
};

/* ===== UTILITAIRES ===== */

/* Lit un nombre saisi (virgule ou point). Vide / illisible → `defaut`. Jamais négatif.
   Différent de `parseFloat(x) || defaut` : un 0 saisi volontairement est conservé. */
function parseNombre(saisie, defaut) {
  if (saisie === null || saisie === undefined) return defaut;
  const s = String(saisie).trim().replace(',', '.');
  if (s === '') return defaut;
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(0, n) : defaut;
}

/* Prix de base du marché pour un modèle et un processeur. */
function baseMarche(modele, gen) {
  return (BASE[modele] && BASE[modele][gen] !== undefined) ? BASE[modele][gen] : BASE_PAR_DEFAUT;
}

/* ===== FORMULES ===== */

/* Valeur de revente estimée (prix conseillé, TTC si la TVA s'applique) :
     valeur = max(30, base + bonusRam + bonusStockage + ajustEtat + Σ défauts)
   Les défauts et l'état « abîmé » sont négatifs. */
function estimerValeur(o) {
  const defauts = (o.defauts || []).reduce((s, d) => s + d, 0);
  return Math.max(PLANCHER_VALEUR,
    baseMarche(o.modele, o.gen) + (o.ram || 0) + (o.ssd || 0) + (o.etat || 0) + defauts);
}

/* Octroi de mer sur les pièces importées : pièces × taux / 100.
   Assiette = valeur en douane des pièces (art. 9-1° loi 2004-639), ici le montant saisi. */
function coutOctroi(pieces, tauxPct) {
  return pieces * (tauxPct / 100);
}

/* Main d'œuvre : heures × taux horaire. */
function coutMainOeuvre(heures, tauxHoraire) {
  return heures * tauxHoraire;
}

/* Prix hors taxe à partir d'un prix TTC : TTC / (1 + tva/100). tva = 0 → inchangé. */
function prixHT(prixTTC, tvaPct) {
  return prixTTC / (1 + tvaPct / 100);
}

/* Montant de TVA contenu dans un prix TTC. */
function montantTVA(prixTTC, tvaPct) {
  return prixTTC - prixHT(prixTTC, tvaPct);
}

/* Coût de revient hors achat : pièces + octroi de mer + main d'œuvre. */
function coutHorsAchat(o) {
  return o.pieces + coutOctroi(o.pieces, o.octroiPct) + coutMainOeuvre(o.heures, o.taux);
}

/* Retour sur investissement (« marge sur coût », markup) en % : marge / coût × 100.
   null si le coût est nul (rapport non défini). */
function roiPct(marge, cout) {
  return cout > 0 ? (marge / cout) * 100 : null;
}

/* Mode « Calculer ma marge ».
   entrées : valeur (prix de vente TTC conseillé), achat, pieces, octroiPct, heures, taux, tvaPct
     recettes   = prixHT(valeur, tva)            (ce que l'entreprise encaisse réellement)
     coutTotal  = achat + pieces + octroi + MO
     marge      = recettes − coutTotal
     roi        = marge / coutTotal × 100
     margeSurPrix (taux de marge) = marge / recettes × 100
     fourchette = valeur × [0,9 ; 1,1] ; perteNegociation si recettes(fourchette basse) < coutTotal */
function calculerMarge(o) {
  const tva = o.tvaPct || 0;
  const octroi = coutOctroi(o.pieces, o.octroiPct);
  const mo = coutMainOeuvre(o.heures, o.taux);
  const coutTotal = o.achat + o.pieces + octroi + mo;
  const recettes = prixHT(o.valeur, tva);
  const marge = recettes - coutTotal;
  const basse = o.valeur * (1 - ECART_FOURCHETTE);
  const haute = o.valeur * (1 + ECART_FOURCHETTE);
  return {
    recettes, tva: montantTVA(o.valeur, tva), coutOctroi: octroi, coutMO: mo, coutTotal, marge,
    roi: roiPct(marge, coutTotal),
    margeSurPrix: recettes > 0 ? (marge / recettes) * 100 : null,
    fourchetteBasse: basse, fourchetteHaute: haute,
    perteNegociation: prixHT(basse, tva) < coutTotal,
  };
}

/* Mode « Prix d'achat max ».
   entrées : prixVente (TTC), roiMin (% de marge sur coût visée), pieces, octroiPct, heures, taux, tvaPct
     recettes        = prixHT(prixVente, tva)
     coutTotalCible  = recettes / (1 + roiMin/100)      (car recettes = coût × (1 + roi))
     achatMaxBrut    = coutTotalCible − coutHorsAchat
     achatMax        = max(0, achatMaxBrut)
   realisable = achatMaxBrut > 0. Marge / ROI sont recalculés avec l'achat max retenu. */
function calculerAchatMax(o) {
  const tva = o.tvaPct || 0;
  const hors = coutHorsAchat(o);
  const recettes = prixHT(o.prixVente, tva);
  const coutTotalCible = recettes / (1 + o.roiMin / 100);
  const achatMaxBrut = coutTotalCible - hors;
  const achatMax = Math.max(0, achatMaxBrut);
  const coutTotal = achatMax + hors;
  const marge = recettes - coutTotal;
  return {
    recettes, coutHorsAchat: hors, coutTotalCible, achatMaxBrut, achatMax,
    realisable: achatMaxBrut > 0, coutTotal, marge, roi: roiPct(marge, coutTotal),
  };
}

const PDCalc = {
  PLANCHER_VALEUR, ECART_FOURCHETTE, BASE_PAR_DEFAUT, TVA_REUNION, TVA_FRANCHISE, BASE,
  parseNombre, baseMarche, estimerValeur, coutOctroi, coutMainOeuvre, prixHT, montantTVA,
  coutHorsAchat, roiPct, calculerMarge, calculerAchatMax,
};
if (typeof module !== 'undefined' && module.exports) module.exports = PDCalc;
else root.PDCalc = PDCalc;
})(typeof self !== 'undefined' ? self : this);
