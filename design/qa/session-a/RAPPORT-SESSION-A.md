# Rapport session A : direction artistique et tranche verticale

Date : 2026-08-14. Branche `claude/nauticea-da`, basée sur `e14581d`
(état complet validé, incluant les arbitrages post-livraison ;
note : `origin/main` est resté à `2f8fbf3`, il lui manque ce commit,
voir questions ouvertes).

## W0 : DA.md : FAIT

`design/DA.md` committé avant tout code (commit `7b30928`) : concept
« La rade en lignes de sonde », 6 tokens (abysse et rase ajoutés à la
base existante), typographie trois rôles (Archivo wdth 125, Open Sans,
IBM Plex Mono), échelle de relief 4 niveaux à ombres teintées marine,
signature isobathes justifiée avec les deux options écartées, carte des
mouvements avec colonne reduced-motion, liste des refus, autocritique
en 6 points.

Le choix de signature a été arbitré par un panel adversarial de trois
propositions (une par option) jugées contre la directive : isobathes
41/50, shader d'eau 32/50 (piège IA 3/10), lignes de coque 33/50.
Deux greffes des perdants retenues : registre sondes des tableaux de
specs, ligne de flottaison sable sous les prix.

## W1 : système : FAIT

- Tokens et utilitaires dans `app/globals.css` (`abysse`, `rase`,
  ombres `affleure`/`flotte`/`domine`, `.sonde`, reveals CSS, trace
  isobathe).
- `lib/da/champ.ts` : champ bathymétrique déterministe (mulberry32 +
  bruit de valeur + marching squares), partagé entre le SVG serveur et
  le shader.
- `components/da/` : `Isobathes` (fond, séparateur, trace),
  `Surface` (4 niveaux), `Tilt` (6° max, pointeur fin desktop, rAF,
  coupé en reduced-motion et tactile), `Reveal` (orchestration par
  section, IntersectionObserver, rien de masqué sans JS ni en
  reduced-motion), `ReliefRade` + `ReliefRadeScene` (WebGL2 maison,
  ~200 lignes, zéro dépendance).
- Polices : Archivo variable avec axe wdth, IBM Plex Mono 400 à 600,
  via next/font, catalogue Google Fonts uniquement.

## W2 : tranche verticale : FAIT

- **Accueil** : hero abysse avec champ d'isobathes (poster SVG serveur,
  sondes décoratives) animé en relief par le shader quand les
  conditions le permettent ; photo phare C390 en surface `domine`
  (LCP) ; le carrousel générique est remplacé, les 3 autres photos
  restent « À la une » (aucune photo ni contenu perdu, H1 identique) ;
  sections marques en relief `affleure` avec reveals orchestrés ; un
  séparateur isobathes ; dernières annonces en `BoatCardDA` (tilt,
  trace au hover, prix en sonde).
- **Détail annonce** (`sealine-c390-539` et toutes) : galerie en
  surface `flotte`, badge état sans pill (bord azur), prix en Plex Mono
  souligné de la flottaison sable, specs en registre sondes (valeurs
  tabulaires azur-2), bloc contact en relief, section « Voir aussi »
  de 3 cartes liées avec tilt.
- Le reste du site reste dans l'ancien style, comme demandé (le
  contraste fait partie de la review).

## Livrables et mesures (2026-08-14, build de production local)

### Lighthouse mobile (émulation Lighthouse 12 par défaut)

| Page | Avant | Après | Plancher | Statut |
|---|---|---|---|---|
| Accueil | perf 93 | perf 89, access 100, BP 100, SEO 100 | >= 85 | FAIT |
| Détail annonce | perf 99 | perf 92, access 100, BP 100, SEO 100 | >= 90 | FAIT |

LCP : la photo (jamais le canvas), 3,8 s accueil / 3,7 s détail.
CLS : 0 sur les deux pages (canvas en calque absolu, espace réservé).
TBT accueil : 40 ms.

Allègements imposés par le budget (écrits dans DA.md) : la scène WebGL
ne se monte que sur pointeur fin >= 768 px (elle coûtait 17 points de
perf mobile via le TBT : 1 740 ms mesurés avant l'allègement) ; champ
SVG échantillonné à 40 px au lieu de 24.

### Poids JS mesuré (gzip, scripts réellement servis)

| Page | Avant | Après | Delta |
|---|---|---|---|
| Accueil | 179,5 Ko | 181,2 Ko | +1,7 Ko |
| Détail | 179,5 Ko | 180,2 Ko | +0,7 Ko |
| Scène 3D (différée, après LCP) | 0 | 2,2 Ko | budget 200 Ko |

### Screenshots committés

`design/qa/session-a/avant/` et `design/qa/session-a/apres/` :
accueil et détail, desktop 1440 et mobile 390, plus
`hero-canvas-actif.png` (hero avec la scène WebGL montée).

### Vérifications d'invariance

- Diff (`git diff e14581d`) : 24 fichiers, tous UI/design/scripts
  (`app/page.tsx`, `app/annonces/[slug]/page.tsx`, `globals.css`,
  `layout.tsx` (polices), `components/da/*`, `lib/da/*`, `design/*`,
  2 scripts de mesure). Aucun fichier de contenu, SEO, redirection ou
  config serveur touché.
- `sitemap.xml`, `robots.txt`, `llms.txt` : fichiers générateurs
  inchangés dans le diff.
- JSON-LD : LocalBusiness présent sur l'accueil, Product +
  BreadcrumbList sur le détail, canonical présent.
- H1 accueil inchangé au caractère près.
- Reduced-motion vérifié au navigateur : aucun canvas monté, zéro
  élément masqué (`masques: 0`), tilt inactif.
- Aucun em-dash dans les fichiers du diff.
- Sans JS : contenu entièrement visible (les reveals ne masquent que si
  la classe `reveal-arme` est posée par le JS).

## NON FAIT / NON VÉRIFIÉ

- NON VÉRIFIÉ : rendu sur appareils réels (tactile bas de gamme,
  wide-gamut) ; la préview Vercel de la PR est prévue pour cette QA.
- NON VÉRIFIÉ : Save-Data (testé par code, pas en conditions réelles).
- NON FAIT (hors périmètre session A) : rollout aux autres pages,
  états vides et 404, View Transitions : session B après GO.

## Questions ouvertes

1. `origin/main` est à `2f8fbf3` : il lui manque `e14581d`
   (arbitrages : vidéos exclues, redirections des 3 dépubliées,
   nettoyage AdsManager). La branche DA inclut ce commit ; au merge de
   la PR DA tout arrive sur main, mais si la PR #1 doit rester la
   référence, un merge de `e14581d` dans main serait plus propre.
2. Tracé bathymétrique : stylisé et déterministe en session A (assumé
   dans DA.md). Extraction du trait réel du golfe (EMODnet ou SHOM,
   licence à vérifier) : décision pour la session B.
3. Les chiffres de sonde sont décoratifs (aria-hidden) ; si Baptiste
   veut afficher les profondeurs réelles d'approche de Port-Fréjus, il
   faut une source (capitainerie).

STOP : session A terminée, en attente du GO de Baptiste sur la préview
Vercel de la PR pour la session B.
