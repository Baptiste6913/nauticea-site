# Rapport global : refonte Next.js nauticeayachting.fr

Date d'exécution : 2026-08-14. Environnement : session Claude Code
distante (cloud), Node v22.22.2, npm 10.9.7, git 2.43.0.

## Écart d'environnement (à lire en premier)

La directive prévoyait une exécution locale sur la machine de Baptiste
(RACINE = `C:\Users\bapti`, miroir + script d'inventaire). Cette session
s'exécute dans un conteneur cloud éphémère où ni le miroir ni le corpus
n'existent. Adaptations, toutes documentées ci-dessous :

1. Corpus construit depuis le site live `www.nauticeayachting.fr`
   (téléchargé le 2026-08-14) au lieu du miroir local. Script
   d'inventaire recréé : `corpus-nauticea/extract.py`.
2. Le conteneur étant éphémère, le travail est committé et poussé sur la
   branche `claude/nauticea-nextjs-refonte-b4m2hx` du dépôt
   `Baptiste6913/nauticea-site` (branche de travail dédiée, pas de merge,
   pas de deploy). Sans push, tout serait perdu à la fermeture de la
   session. Baptiste garde la main sur merge et déploiement.
3. Identité git : `Baptiste6913 <Baptiste6913@users.noreply.github.com>`
   (compte perso, adresse noreply GitHub ; aucune identité Syntexia).

## W0 : préflight : FAIT

- Node v22.22.2 (>= 20), npm 10.9.7, git 2.43.0 : OK (sortie du
  2026-08-14 11:45 UTC).
- Miroir dans RACINE : ABSENT (machine locale inaccessible). Corpus,
  redirects.csv : absents. Repo `nauticea-site` : vide (aucun commit).
- Site live joignable (HTTP 200), retenu comme source de substitution.

## W1 : corpus : FAIT

RAPPORT.txt intégral : voir `corpus-nauticea/RAPPORT.txt`. Synthèse :

- 28 annonces extraites (attendu ~28) : 19 occasions, 9 neufs.
- 3 liens morts détectés sur le site actuel (522-f42, 524-excellence-38,
  527-v53 : liés depuis stock-neuf mais dépubliés, la page renvoie
  l'accueil) : exclus et signalés, non corrigés.
- 632 photos téléchargées (632/632, 135 Mo), 0 échec.
- `redirects.csv` : 45 redirections (13 pages + 28 annonces + 4 actus).
- Pages statiques extraites : accueil, a-propos, contact,
  mentions-legales, places-de-port, stock-neuf, occasions.
- 4 actualités ; leurs dates ne figurent pas dans le HTML public :
  `a_confirmer`.
- Vidéos des actualités trop lourdes pour git (825 Mo, 95 Mo, 48 Mo) :
  référencées en URL absolue vers le site actuel (question ouverte).
- Champs manquants flagués : 0 (chaque annonce a prix, photos, état,
  description).

## W2 : init repo et modèle : FAIT

- `create-next-app` : Next.js 16.3.1, App Router, TypeScript, Tailwind 4,
  ESLint. Commit initial `2bb4a9b` avec l'identité perso.
- Type `Boat` (`lib/types.ts`) : id, slug, titre, categorie,
  sous_categorie, etat neuf/occasion, prix number|null, devise, specs,
  equipements[], photos[], description, updated_at, source.
- `lib/sources/corpus.ts` : `getBoats()`, `getPages()`, `getActualites()`.
- `scripts/sync-images.mjs` : corpus vers `public/annonces/` (644
  fichiers copiés). Photos sources hors git, copies publiques versionnées.
- Preuve : `npm run build` vert (2026-08-14 12:03 UTC).

## W3 : structure des pages et redirections : FAIT

Routes livrées : `/`, `/a-propos`, `/actualites` (+ 4 détails),
`/marques` (liens externes Hanse conservés), `/annonces` (+ catégories
bateaux-moteur, voiliers, catamaran, + 28 détails), `/stock-neuf`,
`/occasions`, `/places-de-port`, `/contact`, `/mentions-legales`,
`/carte`. Le lien « connexion » de l'ancien footer n'est pas reproduit.

Redirections 301 générées depuis `redirects.csv` dans `next.config.ts` :
45 règles (`statusCode: 301` explicite ; Next émettait 308 avec
`permanent: true`). Vérifié sur serveur local le 2026-08-14 12:11 UTC :

| Ancienne URL | Nouvelle route | Code |
|---|---|---|
| /contact.html | /contact | 301 |
| /annonces-bateaux-occasion.html | /annonces | 301 |
| /annonces-bateaux-occasion/29-vedette/539-c390.html | /annonces/sealine-c390-539 | 301 |
| /bateaux-neufs.html | /stock-neuf | 301 |
| /stock-neuf/occasions.html | /occasions | 301 |
| /accueil/a-propos.html | /a-propos | 301 |
| /sitemap.html | /sitemap.xml | 301 |

Table complète (45 lignes) : `corpus-nauticea/redirects.csv`.

## W4 : annonces : FAIT

- Liste : vignette, titre, catégorie, état, prix formaté
  (« 700 000 € », espaces insécables) ou « Prix sur demande » ; tri prix
  asc/desc et filtre état (client, sans rechargement).
- Détail : galerie (photos du corpus, navigation + vignettes), specs en
  tableau, équipements, description, bloc contact (tél cliquable
  +33 6 12 98 86 61 + lien formulaire pré-rempli avec le slug).
- Preuves : `rapports/screenshots/annonces-desktop-nouveau.png`,
  `detail-desktop-nouveau.png` (+ variantes mobile), 2026-08-14.

## W5 : design : FAIT

- Tokens (`app/globals.css`) : marine `#0e1a3c` (fond du logo), azur
  `#35a8e0` (logo), azur-2 `#166288` (liens, contraste AA), écume
  `#f2f5f9`, encre `#1c2434`, sable `#b98a5a` (réservé). Open Sans
  (corps, police de l'existant) + Archivo (titres), échelle typo définie
  une fois.
- Aucun glassmorphism, glow, gradient, pill décoratif ni serif doré.
- Mobile-first, focus visibles (`:focus-visible` azur), 
  `prefers-reduced-motion` respecté (slider figé, transitions coupées).
- QA visuelle : 16 screenshots (8 nouveau site, 8 miroir de référence)
  dans `rapports/screenshots/`. Écarts relevés :
  - le slider du miroir de référence est vide (son JS Joomla ne tourne
    pas hors ligne) ; sur le site live il affiche les mêmes 4 photos
    reprises dans le nouveau slider ;
  - l'accueil actuel alterne photo/texte en pleine largeur, la refonte
    présente les deux marques en cartes côte à côte (modernisation
    assumée, contenus identiques) ;
  - la liste des annonces actuelle est un tableau dense, la refonte une
    grille de cartes (structure et données identiques).

## W6 : SEO et GEO : FAIT

- `generateMetadata` par page : title, description, canonical, OG
  (photo du bateau en détail).
- JSON-LD : `LocalBusiness` (accueil, données des mentions légales),
  `Product` + `Offer` EUR + `BreadcrumbList` (par annonce).
- `sitemap.xml` (46 URLs) et `robots.txt` générés ; `llms.txt` sobre.
- Alt text des photos : titre + catégorie/position.
- Lighthouse local (2026-08-14, production build) :

| Page | Perf | Access | Best practices | SEO |
|---|---|---|---|---|
| Accueil | 93 | 96 | 100 | 100 |
| Annonces | 94 | 98 | 100 | 100 |
| Détail annonce | 99 | 100 | 100 | 100 |
| Contact | 99 | 96 | 100 | 100 |

## W7 : contact et formulaire : FAIT

- `app/api/contact/route.ts` : Resend si `RESEND_API_KEY` +
  `CONTACT_TO_EMAIL` présents, sinon 503 et la page affiche les
  téléphones cliquables (dégradation propre). Honeypot (champ caché
  `societe`). Aucun secret en dur, `.env.example` fourni.
- Tests locaux du 2026-08-14 12:26 UTC : sans clé, page sans formulaire
  avec `tel:` cliquables et API 503 ; avec clé factice, formulaire rendu,
  honeypot rempli 200 (spam ignoré), envoi réel 502 (clé invalide,
  câblage vérifié), champs manquants 400.
- NON VÉRIFIÉ : envoi réel d'un email via Resend (aucune clé valide dans
  l'environnement, comportement attendu).

## W8 : stub Phase B, build final : FAIT

- `lib/sources/boatsgroup.ts` : parseur Open Marine vers `Boat[]`, non
  branché (`getBoats()` lève une erreur explicite). 3 tests unitaires
  verts (`npm test`, fixture XML minimal écrit à la main et marqué comme
  fixture : `tests/fixtures/openmarine-minimal.xml`).
- `.github/workflows/sync-feed.yml` : cron 05h00 et 17h00 UTC, garde sur
  le secret `FEED_URL` (livré inactif tant que le secret est absent),
  normalisation via `scripts/normalise-feed.mts`, commit si diff.
  Documenté dans le README.
- README : lancement local, swap de source, déploiement Vercel.
- `npm run lint` sans erreur, `npm test` 3/3, `npm run build` vert :
  52 pages statiques (dont 28 annonces et 4 actualités en SSG),
  2 routes dynamiques (`/contact`, `/api/contact`). Sortie complète des
  routes ci-dessous.

```text
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /a-propos
├ ○ /actualites
├   /actualites/[slug]  (4 pages SSG)
├ ○ /annonces
├   /annonces/[slug]    (28 pages SSG)
├ ○ /annonces/bateaux-moteur
├ ○ /annonces/catamaran
├ ○ /annonces/voiliers
├ ƒ /api/contact
├ ○ /carte
├ ƒ /contact
├ ○ /marques
├ ○ /mentions-legales
├ ○ /occasions
├ ○ /places-de-port
├ ○ /robots.txt
├ ○ /sitemap.xml
└ ○ /stock-neuf
```

## Typographie française

Espaces fines insécables avant les ponctuations hautes et dans les prix
via `lib/format.ts` (`typoFr`, `formatPrix` sur `Intl fr-FR`), guillemets
« » dans les textes. Aucun em-dash dans le code, la copy ni les
commentaires (vérifié par grep sur `app/`, `components/`, `lib/`,
`scripts/`, `tests/`, `README.md`, `.github/`).

## Questions ouvertes (aucune bloquante)

1. Vidéos des actualités (S430 825 Mo, C335 95 Mo, S390 48 Mo) :
   référencées en URL absolue vers l'ancien site ; à héberger ailleurs
   (YouTube, Vercel Blob) avant l'extinction du site Joomla.
2. Adresse email publique : absente du corpus ; à renseigner via
   `NEXT_PUBLIC_CONTACT_EMAIL` (et `CONTACT_TO_EMAIL` pour le
   formulaire) pour activer mailto et envoi Resend.
3. Dates des 4 actualités : absentes du HTML public (`a_confirmer`),
   non affichées.
4. 3 annonces dépubliées mais encore liées sur le site actuel
   (522-f42, 524-excellence-38, 527-v53) : exclues de la refonte ;
   aucune redirection créée pour ces URLs.
5. Description AdsManager brute : certaines annonces contiennent
   « Catégorie -1 » ou des listes dupliquées dans la description
   (déjà le cas sur le site actuel) ; conservé tel quel, aucun
   nettoyage silencieux.
6. Champ voiliers : aucune annonce voilier dans le corpus au 2026-08-14 ;
   la page `/annonces/voiliers` affiche un état vide propre.
7. `/carte` : page cible du QR livrée ; le QR imprimé doit pointer vers
   `https://www.nauticeayachting.fr/carte` une fois le domaine basculé.
