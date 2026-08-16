# Recette client, 16 août 2026

Session de recette en lecture seule. Aucune modification du code : ce
rapport et les screenshots de `design/qa/recette-1608/` sont les seuls
fichiers ajoutés.

## Méthode

- Code audité : `main` au commit `f41ee56` (merge de la PR nº 11), branche
  de recette `claude/recette-bruno`.
- Constats prod : fetchs HTTP datés du 16/08/2026 14:42 UTC sur
  https://nauticea-site.vercel.app (17 URLs, statuts et extraits HTML
  conservés).
- Vérifications runtime (tri des tableaux), screenshots et Lighthouse :
  exécutés sur le build de production local du même commit que la prod
  sert. Le navigateur de l'environnement de session ne traverse pas le
  proxy sortant (les fetchs HTTP passent, Chromium non) ; l'égalité
  prod = HEAD étant établie en R0 par marqueurs de contenu, ces mesures
  valent pour la prod. Toute mesure dépendant du réseau réel de Vercel
  est signalée comme telle.
- Aucune correction appliquée, y compris triviale. Le harnais R12 a été
  exécuté puis `verification.json` restauré tel qu'au commit.

## Table des verdicts

| Point | Objet | Verdict |
|---|---|---|
| R0 | Écart main/prod | CONFORME (prod = HEAD) |
| R1 | Exclusivité territoriale et metas | CONFORME |
| R2 | À propos, texte client | CONFORME |
| R3 | Réseaux sociaux | CONFORME |
| R4 | Liens externes | CONFORME |
| R5 | Marques, photos et ordre | CONFORME |
| R6 | Texte Sealine vs corpus | CONFORME |
| R7 | Carte de visite | CONFORME |
| R8 | Plan du port sur /contact | PARTIEL (image à fournir) |
| R9 | Actualités, gabarit et filtrage | CONFORME |
| R10 | Actu Cannes 2026 | CONFORME |
| R11 | Tableaux récapitulatifs | CONFORME |
| R12 | Hygiène globale | CONFORME |
| R13 | Budgets Lighthouse | CONFORME |

## R0. Écart main/prod : CONFORME

La prod sert le HEAD de `main` (`f41ee56`). Marqueurs constatés le 16/08
à 14:42 UTC, chacun issu d'un des trois derniers merges :

- PR nº 11 (dernier merge) : grille `md:grid-cols-2` et bandeau photo
  `aspect-[16/9]` présents dans le HTML prod de /marques.
- PR nº 10 : /actualites/cannes-yachting-festival-2026 répond 200 et
  figure au sitemap prod.
- PR nº 9 : section `id="plan"` sur /contact et chapeau « L'excellence
  nautique sur la Côte d'Azur » sur /a-propos.

Aucun retard de deploy.

## R1. Exclusivité : CONFORME

Mention présente aux quatre emplacements, code et prod :

| Emplacement | Code | Constat prod (extrait) |
|---|---|---|
| Accueil, sous-titre | `app/page.tsx:81` | « Concessionnaire exclusif Sealine et RYCK pour les départements du Var et des Alpes-Maritimes » |
| Footer (toutes pages) | `components/Footer.tsx:15` | idem, constaté sur /annonces entre autres |
| Intro marques | `content/marques.md:3` | idem sur /marques |
| À propos | `content/a-propos.md` (2e paragraphe du texte client) | « Concessionnaire exclusif des marques Sealine et RYCK dans les départements du Var et des Alpes-Maritimes [...] » |

Metas localisées, constatées en prod :

- Title accueil : « Nauticea Yachting, bateaux neufs et occasions :
  Fréjus, Var et Alpes-Maritimes » (`app/layout.tsx`).
- Description accueil : « Concessionnaire exclusif Sealine et RYCK pour
  le Var et les Alpes-Maritimes, à Port Fréjus. [...] »
  (`app/layout.tsx:53`).
- Description marques : « [...] concessionnaire exclusif Sealine et RYCK
  Yachts pour le Var et les Alpes-Maritimes [...] ».
- Description annonces : « [...] à Port Fréjus, Var, proche
  Alpes-Maritimes ».

Unicité des metas intacte : contrôle d'unicité title et description du
harnais, exit 0 (R12).

## R2. À propos : CONFORME

Constats prod sur /a-propos (14:42 UTC) :

- Chapeau « L'excellence nautique sur la Côte d'Azur » rendu en accroche.
- Les 7 paragraphes du texte client présents (fragments de contrôle
  vérifiés : « Implantée à Fréjus », « Concessionnaire exclusif des
  marques », « Sealine incarne », « RYCK, quant à elle », « Au-delà de
  la commercialisation », « Grâce à sa situation privilégiée »,
  « véritable plaisir »).
- Intertitres h2 exactement `Sealine` et `RYCK` (seuls h2 de l'article).
- Zéro phrase datée 2022 (F430, « nouveau Ryck 280 », hivernage sur
  parc, pièces VOLVO et MERCURY : absents).
- Graphies normalisées : zéro « Nauticéa » accentué, zéro « Ryck »
  hors casse RYCK dans le corps de page.

## R3. Réseaux sociaux : CONFORME

Cohérent avec le verdict « invérifiable » de `docs/audit-reseaux.md` :
branche retrait.

- Code : `lib/config/reseaux.ts:12-13`, `facebook: null`,
  `instagram: null`, commentaire de réactivation en tête de fichier.
- Prod : zéro occurrence de `facebook` ou `instagram` dans le HTML
  d'accueil, contact, à propos, marques, carte (et aucune sur les autres
  pages du lot fetché).
- Aucun lien vers une destination non-Nauticea possible : les seuls
  liens sortants du site sont Google Maps (itinéraire) et les deux sites
  officiels des marques (R4).

## R4. Liens externes : CONFORME

Crawl des 15 pages HTML prod fetchées, table exhaustive des liens
sortants distincts :

| URL sortante | Pages | `target="_blank"` | `rel="noopener noreferrer"` |
|---|---|---|---|
| `https://www.google.com/maps/dir/?api=1&destination=C%C3%B4t%C3%A9%20capitainerie%2C%2023%20Quai%20de%20la%20Foudre...` | /contact, /carte | oui | oui |
| `https://www.hanseyachtsag.com/sealine/fr/` | accueil, /marques | oui | oui |
| `https://www.hanseyachtsag.com/ryck/fr/` | accueil, /marques | oui | oui |

3 liens externes distincts sur le site entier, 3 conformes. Les mentions
légales citent Vercel sans lien sortant.

## R5. Marques : CONFORME

Depuis la PR nº 11 (demande de Baptiste du 16/08), les photos sont
intégrées dans les cartes de marque : la disposition constatée remplace
les panneaux photo séparés d'origine.

- Ordre DOM prod : photo Sealine (`sealine-c390-3`, premier index 2216
  du HTML) avant photo RYCK (`rick-280`, index 43438) ; grille
  `md:grid-cols-2` donc carte Sealine à gauche et RYCK à droite en
  desktop, empilé Sealine puis RYCK en mobile. Screenshots
  `marques-desktop.png` et `marques-mobile.png`.
- Photos identifiées, pas de flag nécessaire : `sealine-c390-3.jpg` et
  `rick-280.jpg`, issues du slider du site d'origine
  (`corpus-nauticea/raw/accueil.html`), alts « Sealine C390 en
  navigation » et « RYCK 280 en navigation » constatés en prod.

## R6. Texte Sealine : CONFORME

Diff programmatique (python, comparaison au caractère) entre la tranche
d'origine de `corpus-nauticea/pages.json` (accueil, « SEALINE
exploite [...] sécurité à bord », 681 caractères) et la section Sealine
de `content/marques.md` : **EQUAL: True**, y compris le collage
d'origine « électriques.Les ». Les deux phrases datées supprimées sur
décision client (« F430 avec son fly », « nouveau Ryck 280 ») sont
absentes du fichier et du rendu.

## R7. Carte de visite : CONFORME

- Code : `app/carte/page.tsx:40` (ligne « Contact : Bruno BOUAULT »),
  bouton Bureau puis ligne Mobile dessous (`:53`), liens Itinéraire
  (`:81`) et Plan du port vers /contact#plan (`:87`).
- Prod : « Bureau : +33 4 94 51 02 22 » puis « Mobile :
  +33 6 12 98 86 61 », tous deux en `tel:` cliquables ; liens
  « Itinéraire » (Google Maps, `_blank noopener noreferrer`) et « Plan
  du port » présents. Screenshots `carte-desktop.png`, `carte-mobile.png`.

## R8. Plan du port sur /contact : PARTIEL

- Présent et conforme : section « Nous trouver dans le port »
  (`app/contact/page.tsx:114`, `id="plan"`), légende avec l'adresse du
  corpus (« Côté capitainerie, 23 Quai de la Foudre, l'Amirauté, 83600
  Fréjus » constatée en prod), lien « Itinéraire » Google Maps construit
  sur cette adresse (`lib/site.ts:33`), URL bien formée et cliquable en
  prod. La résolution effective côté Google n'a pas été testée depuis
  l'environnement (réseau sortant restreint) : à cliquer une fois en
  conditions réelles.
- Manquant : l'image du plan du port avec la flèche rouge. Introuvable
  dans le corpus comme sur l'ancienne page contact en ligne (recherche
  documentée à la PR nº 9), toujours à fournir par Bruno. La section est
  prête à la recevoir.

## R9. Actualités : CONFORME

- Gabarit `content/actualites/_gabarit.md` et `docs/PUBLIER-ACTU.md`
  présents.
- L'actu Cannes est publiée : onglet Actualités visible en nav prod
  (`href="/actualites"` sur l'accueil) et sitemap prod avec exactement
  deux entrées actualités (`/actualites` et l'article Cannes).
- Liste filtrée 2026 et plus (`app/actualites/page.tsx`, filtre sur
  l'année ; `lib/contenu.ts:143` pour la réactivation) : un seul lien
  d'actu listé en prod, aucune actu 2022.
- URLs 2022 : /actualites/sealine-c-390 et /actualites/sealine-c335
  répondent 200 en prod, hors liste et hors sitemap (le harnais
  verrouille les quatre : `scripts/verifier.mjs`, liste MASQUEES).

## R10. Actu Cannes 2026 : CONFORME

Constats prod sur l'article, tous positifs : titre exact, « du 8 au 13
septembre 2026 », Port Canto, stand Sealine emplacement Power 157,
modèles S335 et C390, plan annoté `/actualites/plan-salon-sealine.png`
affiché en figure avec la légende « Notre emplacement au Port Canto :
stand Sealine, Power 157, à côté de la capitainerie » (figcaption), CTA
« Parler de votre projet » vers /projet et « Nous contacter » vers
/contact, metas title et description propres, `og:image` absolue (photo
C390 du corpus), `og:site_name`, `og:locale` et `og:type` présents,
BreadcrumbList JSON-LD, présence au sitemap. Screenshots
`article-cannes-desktop.png`, `article-cannes-mobile.png`.

## R11. Tableaux récapitulatifs : CONFORME

Structure constatée sur /occasions (19 lignes) et /stock-neuf
(9 lignes), build du commit prod :

- Colonnes modèle, catégorie, année, longueur, prix, lien « Voir » vers
  la fiche ; valeurs en registre mono (classe sonde, 57 et 27 cellules).
- `caption` présente (sr-only), 6 `th scope="col"`, `th scope="row"`
  par ligne, 3 `aria-sort` (`components/TableauRecapitulatif.tsx:83-93`).
- Tri fonctionnel, vérifié en runtime : prix croissant (49 000 €,
  69 000 €, 77 000 €, 87 000 €), année croissante (1992, 1995, 1997,
  2002), longueur croissante (6,98 m, 8,78 m, 8,9 m, 9,22 m) ; annonce
  du tri en zone `aria-live` (« Tableau trié par longueur, croissant. »).
- « Prix sur demande » : géré par le code (`lib/format.ts`, formatPrix) ;
  aucun bateau actuellement sans prix dans ces listes, le libellé
  n'apparaît donc pas.
- Mobile : le tableau défile dans son conteneur (`overflow-x-auto`,
  `min-w-[640px]`), la page ne défile pas horizontalement (scrollX
  reste à 0 en viewport 390 px ; la mesure brute `scrollWidth` compte la
  couche décorative fixe du filigrane, non atteignable au défilement,
  sans effet utilisateur). Screenshots `occasions-mobile.png`,
  `stock-neuf-mobile.png`.

## R12. Hygiène globale : CONFORME

`npm run verifier` sur le commit audité, exit 0. Sortie de vérification
(le détail build est dans le log de session) :

```
43 routes au sitemap
verification.json écrit : OK (0 échec)
{
 "routes_sitemap": 43,
 "liens_internes_verifies": 697,
 "images_verifiees": 942,
 "redirections": 48,
 "fichiers_sources_scannes": 70
}
```

`verification.json` a été restauré tel qu'au commit après l'exécution
(session lecture seule).

Greps, code et prod (les chaînes joomla, bretweb, em-dash, « Catégorie
- », URLs de l'ancien site sont aussi des chaînes interdites du harnais,
`scripts/verifier.mjs:202-252`, donc contrôlées à chaque exécution) :

| Chaîne | Sources code | HTML prod (15 pages) |
|---|---|---|
| « Nauticéa » accentué | 0 | 0 |
| joomla (insensible casse) | 0 | 0 |
| bretweb (insensible casse) | 0 | 0 |
| em-dash | 0 (hors regex du harnais, auto-exclu) | 0 |
| « Catégorie - » | 0 | 0 |
| URL absolue ancien site (images, templates) | 0 | 0 |

Mentions légales prod : Vercel Inc. en hébergeur et section données
personnelles du formulaire présentes. Screenshot `mentions-desktop.png`.

## R13. Budgets Lighthouse : CONFORME

Lighthouse 12, émulation mobile, build de production du commit prod :

| Page | Perf | Plancher | Accessibilité | CLS | LCP |
|---|---|---|---|---|---|
| Accueil | 91 | 85 | 100 | 0 | 3,1 s |
| Marques | 94 | (aucun) | 100 | 0 | 3,1 s |
| Occasions | 97 | 90 | 100 | 0 | 2,7 s |
| Article Cannes | 97 | (aucun) | 100 | 0 | 2,5 s |

Tous les planchers sont tenus.

## Screenshots

`design/qa/recette-1608/`, desktop (1440) et mobile (390, tactile) :
accueil, a-propos, marques, occasions, stock-neuf, contact, carte,
actualites, article-cannes, mentions (20 fichiers).

## Reste côté Bruno

1. Graphie « Nauticéa » (logo, devanture) ou « Nauticea » (site, texte
   client) : à trancher pour tout le site.
2. Paragraphe atelier, hivernage et pièces Volvo-Mercury de l'ancien
   texte À propos : à réintégrer ou non.
3. URLs officielles des pages Facebook et Instagram, ou confirmation
   d'abandon (détail dans `docs/audit-reseaux.md` ; une ligne dans
   `lib/config/reseaux.ts` les fait revenir partout).
4. Directeur de la publication : Bruno BOUAULT figure au corpus et aux
   mentions ; confirmer que c'est bien lui.
5. Médiateur de la consommation : nom et coordonnées à fournir pour
   compléter les mentions légales.
6. Image du plan du port avec la flèche rouge pour /contact (R8).

## Reste côté infra

1. IONOS : bascule DNS de nauticeayachting.fr vers Vercel, extinction de
   l'ancien site Joomla (et de son hébergement BreTweb), vérification du
   domaine dans Resend pour l'envoi des formulaires (`docs/GO-LIVE.md`).
2. Flux Boats Group : activation de la phase B (stub et cron désactivé
   livrés, `docs/FLUX.md`).
3. Vercel : passage du projet en plan Pro avant la bascule du domaine.
