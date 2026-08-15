# Nauticea Yachting : refonte Next.js

Refonte du site [nauticeayachting.fr](https://www.nauticeayachting.fr)
(concessionnaire Sealine et RYCK Yachts à Port Fréjus) en Next.js
App Router, TypeScript et Tailwind, en remplacement du site historique.

## Lancer en local

Prérequis : Node >= 20.

```bash
npm install
npm run sync-images   # copie les photos du corpus vers public/ (si corpus présent)
npm run dev           # http://localhost:3000
```

Autres commandes :

```bash
npm run build   # build de production (SSG)
npm start       # sert le build
npm test        # tests unitaires du parseur Open Marine
npm run lint    # ESLint
```

## Sources de données

- **Phase A (active)** : `lib/sources/corpus.ts` lit `corpus-nauticea/`
  (annonces `bateaux.json`, pages `pages.json`, actualités
  `actualites.json`, redirections `redirects.csv`), extrait du site
  historique. Les photos sont versionnées dans `public/annonces/`.
- **Phase B (stub, non branché)** : `lib/sources/boatsgroup.ts`, même
  signature (`getBoats()`), alimenté par le flux XML Open Marine de
  Boats Group.

### Basculer de source (Phase B)

1. Renseigner le secret `FEED_URL` dans GitHub (Settings > Secrets and
   variables > Actions) : le workflow `.github/workflows/sync-feed.yml`
   (cron 2 fois par jour, inactif tant que le secret est absent) se met
   à produire `corpus-nauticea/bateaux-boatsgroup.json`.
2. Brancher `getBoats()` de `lib/sources/boatsgroup.ts` sur ce JSON.
3. Dans les pages, remplacer l'import `@/lib/sources/corpus` par
   `@/lib/sources/boatsgroup` (une ligne par fichier).

## Formulaire de contact

Copier `.env.example` vers `.env.local`. Avec `RESEND_API_KEY` et
`CONTACT_TO_EMAIL` renseignés, le formulaire envoie via Resend
(honeypot anti-spam inclus). Sans clé, la page contact affiche les
téléphones cliquables à la place du formulaire.

## Déployer sur Vercel

1. Pousser le dépôt sur GitHub.
2. Sur [vercel.com](https://vercel.com), « Add New Project », importer le
   dépôt : le framework Next.js est détecté automatiquement, aucun
   réglage de build à changer.
3. Dans « Environment Variables », ajouter si souhaité `RESEND_API_KEY`,
   `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `NEXT_PUBLIC_CONTACT_EMAIL`.
4. Déployer, puis pointer le domaine `www.nauticeayachting.fr` vers le
   projet (Settings > Domains) : les redirections 301 des anciennes URLs
   `.html` sont servies par `next.config.ts`.

## Structure

- `app/` : pages (App Router) ; annonces en SSG via `generateStaticParams`
- `components/` : Header, Footer, Slider, galerie, cartes et liste d'annonces
- `corpus-nauticea/` : données extraites du site historique et rapport
  d'inventaire (photos sources non versionnées ; copies dans `public/`)
- `scripts/` : `sync-images.mjs`, `normalise-feed.mts`, `qa-screenshots.mjs`
- `rapports/` : rapports de wagons et screenshots QA
