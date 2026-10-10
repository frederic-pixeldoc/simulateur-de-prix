# Formules du simulateur

Implémentées dans [`calculs.js`](calculs.js) (fonctions pures, sans DOM), testées par
[`calculs.test.js`](calculs.test.js) : `npm test` (Node ≥ 18, aucune dépendance).
Taux en pourcentage (8,5 = 8,5 %). Aucun arrondi dans les calculs, seulement à l'affichage.

## Valeur de revente (prix conseillé)

`valeur = max(30, base[modèle][processeur] + bonusRAM + bonusStockage + ajustÉtat + Σ défauts)`

- `base` : table de prix marché saisie à la main (RAM 4 Go, HDD, état « correct »), 80 € si absent.
- Bonus RAM/SSD, ajustement d'état et défauts : montants fixes en €. Plancher 30 €.
- Fourchette de négociation : `valeur × [0,9 ; 1,1]`.
- **Ce ne sont pas des données officielles** : à recaler régulièrement sur les annonces réelles.

## Mode « Calculer ma marge »

```
octroi     = pièces × tauxOctroi / 100
mo         = heures × tauxHoraire
coûtTotal  = achat + pièces + octroi + mo
recettes   = valeur / (1 + TVA/100)          (TVA = 0 si « sans TVA »)
marge      = recettes − coûtTotal
ROI        = marge / coûtTotal × 100          (marge sur coût, « markup »)
tauxMarge  = marge / recettes × 100           (marge sur prix de vente)
```
Alerte de perte : `prixHT(valeur × 0,9) < coûtTotal`.

## Mode « Prix d'achat max »

```
recettes       = prixVente / (1 + TVA/100)
coûtTotalCible = recettes / (1 + ROImin/100)     car recettes = coût × (1 + ROI)
achatMax       = max(0, coûtTotalCible − (pièces + octroi + mo))
```
Si `coûtTotalCible − coûtHorsAchat ≤ 0` l'objectif est irréalisable : achat max 0 et marge négative affichée.
Contrôle : acheter à `achatMax` redonne exactement `ROImin` (test de cohérence).

## TVA (8,5 %)

L'ancienne version n'appliquait **aucune TVA**. Elle est désormais optionnelle (défaut : « sans TVA »,
résultats identiques à avant). Si activée : prix de vente saisis/conseillés = TTC, marge calculée sur le HT.
Non modélisé : TVA déductible sur achats/pièces (un assujetti la récupère ; hors scope tant que le
régime de l'entreprise n'est pas confirmé).

## Octroi de mer

Appliqué aux **pièces importées uniquement** : `pièces × taux`. Le champ est libre (défaut 2,5 %).

- **Assiette** : valeur en douane des biens importés (loi n° 2004-639 du 2 juillet 2004, art. 9-1°),
  c.-à-d. en pratique prix + transport/assurance jusqu'à l'arrivée à La Réunion, pas le seul prix facture.
- **Taux** : fixés par délibération du Conseil régional **par code douanier** ; il n'existe pas de taux unique.
  L'octroi de mer régional (OMR) est plafonné à 2,5 % à La Réunion (même loi, art. 37-II). Le défaut 2,5 %
  correspond donc au plafond de l'OMR seul : il **sous-estime** l'octroi de mer principal si la pièce en supporte un.
- Un tableau des services de l'État à La Réunion (2016, obsolète) donne pour les portables (8471.30) 4 % + OMR 2,5 %.
  Pour une pièce précise (8473.30, SSD 8523.51, batteries 8507…), consulter le tarif en vigueur
  (délibération DCP2024_0826, tarif applicable depuis le 01/03/2025) ou la base RITA des douanes.

## Sources

- TVA DOM : [impots.gouv.fr — taux de TVA applicables dans les DOM](https://www.impots.gouv.fr/portail/professionnel/questions/quels-sont-les-differents-taux-de-tva-applicables-dans-les-dom) — consulté : 8,5 % normal, 2,1 % réduit à La Réunion ; voir aussi [BOFiP BOI-TVA-GEO-20-10](https://bofip.impots.gouv.fr/bofip/343-PGP.html/identifiant=BOI-TVA-GEO-20-10-20190605).
- Octroi de mer, assiette (art. 9) et plafond OMR (art. 37) : [Légifrance — loi 2004-639, titre Ier](https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000253374/LEGISCTA000006099294/) — consulté.
- Fiscalité douanière dans les DOM : [douane.gouv.fr](https://www.douane.gouv.fr/fiche/fiscalite-douaniere-dans-les-departements-doutre-mer) — page indisponible (HTTP 503) lors de la vérification, résumé issu de la recherche seulement.
- Exemples de taxations (2016) : [reunion.gouv.fr](https://www.reunion.gouv.fr/Actions-de-l-Etat/Economie-commerce-exterieur-et-fiscalite-locale/Info-Douanes-pratiques/Exemples-de-taxations) — indisponible (503), chiffres relayés par la recherche, **non revérifiés**.
- Tarif 2025 : [International Pratique](https://international-pratique.com/2025/02/03/la-reunion-les-taxes-doctroi-de-mer-applicables-au-1er-mars-2025/) — source secondaire.

## Corrections apportées

| Avant | Maintenant |
|---|---|
| `parseFloat(x) \|\| 30` : une marge min. saisie à 0 devenait 30 %, un prix de vente 0 devenait la valeur estimée | saisie vide seulement → défaut ; 0 respecté |
| Mode inversé : marge toujours affichée avec « + » (`+-16€` si objectif irréalisable), `achatMax` forcé à 0 masquait la perte | signe correct, marge négative visible |
| « Marge min souhaitée » = en réalité ROI (marge ÷ coût) | libellé « Marge min. sur coût » + indication |
| Coût nul → ROI affiché 100 % | « — » / n/a |
| Taux horaire en double (2 champs synchronisés) | un seul champ |
| Aucune TVA | option TVA 8,5 % (défaut inchangé) |
