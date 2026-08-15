# Rapport session B : rollout de la DA

Date : 2026-08-14. Branche `claude/nauticea-da`, PR #2. GO de Baptiste
reçu avec 4 retouches.

## W3 : retouches du GO : FAIT

1. **Corps humaniste** : Fira Sans (lignée FF Meta) remplace Open Sans,
   mêmes graisses 400/600, justification d'une ligne dans DA.md.
2. **Bathymétrie stylisée définitive** : question fermée dans DA.md,
   aucune extraction SHOM/EMODnet.
3. **Sondes purement décoratives** : DA.md et commentaires de code
   reformulés, aucune référence à un lieu ou à une carte réelle ; le
   concept parle désormais d'« une carte marine dessinée pour
   Nauticea », tracé assumé comme langage graphique.
4. **Hiérarchie de retrait** écrite dans DA.md : sur un écran chargé,
   la flottaison sable saute avant le registre sondes.
5. Retouches QA propres : unités en bas de casse dans les cartes
   (« 12,82 m », plus « M »), virgule décimale dans les
   caractéristiques (« 11,99 »), compteur de galerie en registre
   sonde, survol des vignettes de galerie.

## W4 : rollout : FAIT

Toutes les pages sont au niveau DA, application documentée page par
page dans DA.md (section « Rollout session B ») :

- listes, catégories, stock neuf, occasions : `BoatCardDA` unifiée
  (ancienne carte supprimée), tri et compteur en sonde, reveal, état
  vide au niveau DA ;
- actualités : cartes en relief avec trace isobathe ; marques : cartes
  en relief ; places de port : tableau en relief, valeurs en sonde ;
- contact : panneau en relief, téléphones en sonde, cibles tactiles
  corrigées ; carte de visite : champ d'isobathes sur marine, carte
  blanche en relief `domine` ;
- footer : fond abysse, bande d'isobathes avec sondes décoratives,
  constante de toutes les pages ;
- exceptions écrites dans DA.md : mentions légales et à propos en
  typographie seule, header inchangé.

## W5 : motion et finitions : FAIT (avec un refus documenté)

- Micro-interactions : élévation et translation au hover des cartes
  (motion-safe), trace isobathe au hover et au focus-visible, survol
  des vignettes de galerie, boutons cohérents.
- États vides et 404 au niveau DA : état vide avec courbe et lien de
  retour, page 404 « Hors des sondes ».
- View Transitions : NON FAIT, volontairement. La seule voie App
  Router passe par un flag expérimental de Next 16 : ce n'est pas un
  coût nul, donc rien, conformément à la directive.

## W6 : budgets, accessibilité, QA : FAIT

### Lighthouse mobile (Lighthouse 12, émulation mobile par défaut, build de production, 2026-08-14)

| Page | Perf | Access | Best practices | SEO | CLS | Plancher perf |
|---|---|---|---|---|---|---|
| Accueil | 92 | 100 | 100 | 100 | 0 | >= 85 |
| Liste annonces | 95 | 100 | 100 | 100 | 0 | >= 90 |
| Détail annonce | 96 | 100 | 100 | 100 | 0 | >= 90 |
| Contact | 98 | 100 | 100 | 100 | 0 | (aucun) |

Le point dur du wagon : les premières mesures donnaient liste 89 et
détail 86. Causes mesurées puis corrigées : vignettes de cartes lazy
au-dessus de la ligne de flottaison (Load Delay 1 954 ms sur le LCP,
corrigé par `priority` sur les 3 premières cartes) et 152 Ko de
polices préchargées en priorité haute qui concurrençaient l'image LCP
(Archivo variable 88 Ko : `preload: false` sur display et mono, swap
tardif des titres assumé et commenté ; Plex Mono réduit à 2 graisses).

### Poids JS (gzip, scripts servis)

| Page | Base avant DA | Session B | Delta |
|---|---|---|---|
| Accueil | 179,5 Ko | 181,2 Ko | +1,7 Ko |
| Liste annonces | 179,5 Ko | 182,4 Ko | +2,9 Ko |
| Détail | 179,5 Ko | 180,2 Ko | +0,7 Ko |
| Scène 3D (différée après LCP, desktop pointeur fin) | 0 | 2,2 Ko | budget 200 Ko |

### Reduced-motion page par page

Balayage automatisé au navigateur (`reducedMotion: "reduce"`) sur les
14 routes : 14/14 OK, zéro canvas monté, zéro élément masqué, traces
dessinées d'office. Sortie complète dans le rapport de commande du
2026-08-14.

### Grille de screenshots

`design/qa/session-b/avant/` et `design/qa/session-b/apres/` :
14 pages x desktop et mobile (56 captures). Note de lecture : sur
quelques captures pleine page, les dernières vignettes lazy
apparaissent vides ; artefact de l'outil de capture, pas du site.

### Invariance

- Aucun fichier de contenu, corpus, redirection, sitemap, robots,
  llms.txt ou next.config dans le diff de la session.
- JSON-LD Product + BreadcrumbList vérifiés sur le détail après
  rollout ; LocalBusiness inchangé sur l'accueil.
- Aucun em-dash dans les fichiers texte du diff (une occurrence
  détectée par grep est un octet de PNG binaire).
- Typographie française conservée (typoFr et formatPrix inchangés,
  virgule décimale ajoutée à l'affichage des specs).

## NON VÉRIFIÉ

- Rendu sur appareils réels et Save-Data en conditions réelles : QA
  sur la préview Vercel de la PR.
- Comportement du swap tardif d'Archivo sur connexions très lentes
  (choix assumé : les titres s'affichent d'abord dans la police de
  secours système).

## Questions ouvertes

1. `origin/main` toujours à `2f8fbf3` : le merge de la PR #2 apportera
   aussi `e14581d` (arbitrages corpus). Inchangé depuis la session A.
2. Les captures « avant » de la session B figent l'état session A ;
   celles de `design/qa/session-a/avant` gardent l'état pré-DA.

PR #2 prête au merge. STOP.
