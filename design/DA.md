# Direction artistique Nauticea : « La rade en lignes de sonde »

Version session A, 2026-08-14. Ce document précède et gouverne tout le
code DA. Toute exception s'écrit ici avant d'exister dans le code.
Choix de signature arbitré par un panel adversarial de trois
propositions jugées contre la directive (scores : isobathes 41/50,
shader d'eau 32/50, lignes de coque 33/50).

## Concept

Le site est construit comme une carte marine dessinée pour Nauticea :
des fonds, des courbes de sonde, l'univers du métier. Le tracé est
stylisé et déterministe, sans prétention de relevé : c'est un langage
graphique, pas une carte réelle. Les photos réelles du stock
(632 images, premier atout du site) flottent en surface ; ce qui
structure la page vit en dessous, en relief bathymétrique : les
isobathes dessinent la profondeur des sections, les chiffres en police
d'instrument portent les données (prix, longueurs, années), la lumière
rasante de fin de journée méditerranéenne souligne les crêtes. Un seul
endroit rend ce fond littéralement volumétrique : le hero de l'accueil,
où le champ d'isobathes est rendu en relief par un shader procédural
sous la photo phare. Un chantier naval générique montre des vagues ;
Nauticea montre son fond et ses sondes : une carte du métier, pas un
décor de yachting.

## Tokens couleur

Base existante approfondie, jamais remplacée :

| Token | Hex | Rôle |
|---|---|---|
| `abysse` | `#060f26` | sombre profond : encre et ombres uniquement, jamais en fond (décision finitions du 15/08) |
| `marine` | `#0e1a3c` | fond du logo, surfaces sombres (existant) |
| `azur` | `#35a8e0` | bleu du logo, traits d'isobathes sur sombre, accents (existant) |
| `azur-2` | `#166288` | liens, traits d'isobathes sur clair, contraste AA (existant) |
| `ecume` | `#f2f5f9` | fonds clairs, papier de la carte (existant) |
| `rase` | `#e9bd6a` | lumière chaude naturelle de soleil rasant : filets, sondes actives, crêtes du relief 3D ; jamais en aplat large, jamais terracotta |
| `pavillon` | `#001647` | fond réel du fichier logo, mesuré au pixel : l'unique sombre de fond du site (header, footer, theme-color) ; nuance `pavillon-2 #001034` pour le sous-bandeau copyright |

`encre #1c2434` (texte courant) reste le token de texte. `sable
#b98a5a` (hérité, écho des coques cuivre du corpus) garde un seul rôle
DA : la ligne de flottaison sous les prix (greffe du panel). Deux
accents chauds, deux rôles disjoints : `rase` pour la lumière, `sable`
pour la flottaison des prix.

## Typographie

- **Display : Archivo, axe wdth 125 (expanded), graisses 600 à 800.**
  Lettrage large de signalétique portuaire et d'immatriculation de
  coque ; continuité avec l'existant (déjà Archivo), on pousse l'axe de
  largeur au lieu de changer de famille.
- **Corps : Fira Sans, 400 et 600.** Humaniste de la lignée FF Meta :
  même registre et même lisibilité qu'Open Sans qu'elle remplace
  (retouche GO session B), dessin plus incarné, jamais en concurrence
  avec les photos.
- **Utilitaire specs et prix : IBM Plex Mono, 400 à 600.** Chiffres
  d'instruments et de sondes de carte marine, tabulaires par nature :
  prix, longueurs, années, tableaux de caractéristiques.

Rôles stricts : Archivo pour h1/h2 et les chiffres héros, Open Sans
pour tout le texte courant, Plex Mono pour toute valeur mesurée ou
monétaire (registre « sondes » généralisé aux tableaux de specs :
chiffres tabulaires, valeur en colonne droite `azur-2`).

## Échelle de relief

Ombres teintées marine (`rgba(6, 15, 38, alpha)`), jamais gris neutre.
Quatre niveaux nommés, du fond vers la surface :

| Niveau | Nom | Usage | Ombre |
|---|---|---|---|
| 0 | `fond` | arrière-plans, motif isobathes | aucune |
| 1 | `affleure` | cartes au repos, tableaux | `0 1px 2px rgba(6,15,38,.10), 0 1px 8px rgba(6,15,38,.06)` |
| 2 | `flotte` | cartes en hover, galerie, blocs contact | `0 4px 12px rgba(6,15,38,.14), 0 2px 4px rgba(6,15,38,.08)` |
| 3 | `domine` | photo phare du hero, modales | `0 12px 32px rgba(6,15,38,.22), 0 4px 8px rgba(6,15,38,.10)` |

Règles d'empilement : une section claire peut chevaucher la précédente
sombre de 3 rem au plus (la « surface » mord sur le « fond ») ; le
chevauchement porte toujours un niveau d'élévation >= 2 ; jamais deux
chevauchements consécutifs ; le motif isobathes vit uniquement au
niveau 0, sous le contenu, jamais sous un paragraphe de texte courant ;
au plus un champ d'isobathes visible par viewport (les séparateurs
comptent) ; opacité des traits <= 0,35 sur sombre, <= 0,5 sur clair.

## LA signature : les isobathes (option b)

**Choix : le système d'isobathes de carte marine comme motif de relief
récurrent.** Générateur déterministe unique (`lib/da/isobathes.ts`,
bruit de valeur à graine fixe, identique au rendu serveur et à
l'hydratation) décliné en :

- champ de fond de section (courbes fermées niveau 0) ;
- séparateur horizontal entre sections (bande de 3 à 5 courbes) ;
- trace de hover (une courbe qui se dessine sous les titres de cartes) ;
- chiffres de sonde posés aux accalmies du champ (motif secondaire).

La composante 3D est dépensée une seule fois, au bon endroit : le hero
de l'accueil rend le même champ en relief volumétrique par un fragment
shader WebGL2 écrit à la main (~10 Ko gzip, zéro dépendance), dérive
très lente, sous la photo phare qui reste le LCP. Poster de secours :
le même champ en SVG statique, identique hors mouvement ; c'est aussi
la version `prefers-reduced-motion` et `Save-Data`, complète, pas
dégradée. three.js est refusé : 150 Ko gzip pour un quad, le budget
appartient aux photos.

Justification (panel) : seul candidat qui soit à la fois un système
(il porte le relief de toutes les pages en session B), un ancrage au
métier et au lieu (le fond de la rade, pas une mer générique), et un
budget quasi nul (SVG niveau 0, un seul canvas). Écartés :

- (a) surface d'eau en shader dans le hero : rendu par défaut des
  outils IA pour « yacht premium » (piège IA noté 3/10 par le juge),
  n'habille qu'une page et concurrence les photos au lieu de les porter.
- (c) lignes de coque en découpes de sections : à l'écran, des « wave
  dividers » de template ; la sémantique livet/bouchain est illisible
  pour le public.

Greffes retenues des perdants (deux, discrètes, zéro JS) : le registre
« sondes » des tableaux de caractéristiques (option a) et la ligne de
flottaison en `sable` sous les prix (option c).

Motif secondaire discret (le seul autorisé) : les **chiffres de sonde**
en Plex Mono posés sur les champs d'isobathes du hero et du pied de
page, avec parcimonie et `aria-hidden`.

Statut de la donnée (arbitré au GO session B, question fermée) : le
tracé stylisé déterministe est définitif, aucune extraction SHOM ou
EMODnet. Les chiffres de sonde sont une suite décorative arbitraire :
jamais présentés ni rattachés à des profondeurs réelles, aucune
référence à Fréjus ni à une carte réelle dans leur emploi.

Hiérarchie de retrait (arbitrée au GO session B) : si un écran est
chargé, la ligne de flottaison sable saute avant le registre sondes.
Un accessoire en moins, jamais deux de plus.

## Hero de l'accueil

La photo phare `sealine-c390-3.jpg` (la C390 coque cuivre en
navigation, la seule vraie photographie d'action du lot) devient
l'image signature unique du hero, cadrée en surface `domine` sur le
champ d'isobathes. Le carrousel disparaît (pattern concessionnaire
générique relevé par le panel) : les trois autres photos restent en
vignettes « À la une » sous le hero, cliquables vers les pages
concernées ; aucune photo n'est perdue, aucun contenu ne change.

## Carte des mouvements

| Élément | Déclencheur | Durée / easing | Reduced-motion et Save-Data |
|---|---|---|---|
| Relief 3D du hero | après `load` + `requestIdleCallback`, import dynamique client only, pointeur fin et >= 768 px seulement (mesure : la scène coûtait 17 points de Lighthouse mobile, le budget prime) | dérive continue lente (période ~30 s), 30 fps plafonnés, pause hors viewport et onglet caché | SVG statique identique, la scène n'est jamais téléchargée ; au tactile, même version statique complète |
| Reveals de section | entrée dans le viewport, une fois, orchestrés par section | translation 12 px + opacité, 500 ms, cubic-bezier(0.22, 1, 0.36, 1), enfants décalés de 60 ms | aucun masquage : tout est visible immédiatement |
| Tilt des cartes bateau | pointeur fin + hover, desktop seulement | 6° max, lissage rAF, retour 250 ms | désactivé (tactile : désactivé aussi) |
| Trace isobathe sous les titres | hover et focus-visible de carte | stroke-dashoffset 300 ms ease-out | apparition sans tracé (opacité seule) |
| Élévation au hover | hover et focus-visible | ombre + translation -2 px, 200 ms ease-out | changement d'ombre seul, sans translation |
| Galerie détail | clic vignette | crossfade 200 ms | inchangé (déjà quasi statique) |

Aucun mouvement au scroll en dehors des reveals ; rien ne bouge sans
interaction ou entrée de viewport, sauf la dérive du hero. Le kill
switch global `prefers-reduced-motion` de `globals.css` reste la
garantie de dernier ressort.

## Polarité inversée, décision client du 15/08

La carte marine reprend son sens d'origine : de l'encre bleue sur
papier clair. Le concept, les isobathes, le relief, le registre sonde,
les cartes et la typographie survivent intégralement ; seule la
polarité change.

- Fond des pages : blanc et écume très claire. Encre : marine profond.
- Filigrane d'isobathes : calibrage unique du site entier (finitions du
  15/08). Un seul fond porteur au niveau du layout, fixe et continu,
  marine à l'opacité du token `--filigrane-opacite` (6 %, cible 4 à
  6 %), dérive lente en CSS coupée par reduced-motion. Plus aucun
  filigrane par section, plus aucune coupure du motif à une frontière ;
  les chiffres de sonde sont absents sur fond clair (seule la trace
  isobathe de hover survit, en interaction).
- Touches bleues : boutons et liens (azur-2), badges d'état (marine),
  ligne de flottaison, bandes d'isobathes de séparation (azur-2).
- Le footer est en pavillon : unique ancrage sombre du site (le
  sous-bandeau copyright en pavillon-2).
- L'en-tête passe en clair (blanc, encre marine, actif azur-2).
- La scène WebGL du hero est retirée : un relief lumineux sous photo
  n'a pas de sens sur papier clair. Le hero devient un carrousel des
  photos à la une (photo phare en tête, LCP), titre centré au-dessus.
- Rôles inchangés pour `rase` (filets, jamais en aplat) et `sable`
  (flottaison des prix).

## Rollout session B (application page par page)

- Listes d'annonces, catégories, stock neuf, occasions : cartes
  `BoatCardDA` (l'ancienne carte est supprimée), compteur et tris en
  registre sonde, reveal orchestré sur la grille, état vide au niveau
  DA (courbe + lien retour).
- Actualités (liste) : cartes en relief `affleure`, trace isobathe
  sous les titres. Détail actualité : typographie seule.
- Marques : cartes en relief `affleure`, reveal.
- Places de port : tableau en relief `affleure`, dimensions et
  amodiations en registre sonde.
- Contact : panneau dégradé en relief `flotte`, téléphones en registre
  sonde ; le formulaire garde ses styles de champs (lisibilité avant
  décor).
- Carte de visite : fond marine avec champ d'isobathes (seul champ de
  la page), carte blanche en relief `domine`, téléphones en sonde.
- Pied de page : fond abysse, bande d'isobathes avec sondes
  décoratives en tête, téléphones en sonde. Constante de toutes les
  pages.
- 404 : « Hors des sondes », une seule courbe, retour au mouillage.
- Exceptions assumées : mentions légales et à propos reçoivent la
  typographie seule (pages de texte, le décor n'y apporte rien) ;
  l'en-tête de navigation reste inchangé (constante déjà sobre).

## Ce qu'on ne fera pas

Glassmorphism, radial glows, gradient mesh, dégradés violets, pill
badges décoratifs, serif italique doré, look SaaS templated, crème +
serif + terracotta, scroll-jacking, curseurs custom, spinners 3D,
parallax généralisé, Lottie, three.js (150 Ko pour ce qu'un shader de
10 Ko rend), vidéo de fond, particules flottantes, compteurs animés,
skeletons décoratifs, grain photographique ajouté, vagues SVG molles de
bas de section (le cliché inverse de l'isobathe : une vague décorative
ne mesure rien), carrousel auto en hero.

## Autocritique (obligatoire avant code)

Revue du plan contre le rendu par défaut « site de yachts premium »
d'un outil IA, avec panel adversarial en appui :

1. Premier réflexe écarté : shader d'eau plein hero avec photo fondue
   dedans. C'est exactement le rendu par défaut IA du secteur, le juge
   l'a noté 3/10 sur ce critère malgré une proposition sophistiquée.
   Remplacé par le relief bathymétrique.
2. Piège repéré : multiplier les isobathes en filigrane les banalise en
   « texture topographique » de template (tendance packaging outdoor).
   Règles ajoutées : un champ par viewport maximum, opacités plafonnées,
   jamais sous du texte courant, séparateurs comptés.
3. Piège repéré : la lumière chaude en aplats ou dégradé doré vire au
   « luxe IA ». Règle : `rase` uniquement en trait, chiffre ou filet,
   moins de 10 % d'une surface ; `sable` uniquement en flottaison de
   prix.
4. Le tilt 3D des cartes est un motif répandu : conservé car il sert la
   photo du bateau, mais bridé à 6°, desktop pointeur fin seulement,
   sans reflet spéculaire.
5. Le carrousel auto du hero était lui-même un pattern générique de
   concessionnaire : remplacé par une photo signature et des vignettes.
6. Sondes : prétendre à des profondeurs réelles sans source serait un
   simulacre ; assumé comme stylisé et documenté, vraie donnée en
   question ouverte session B.
