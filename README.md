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
npm test        # tests unitaires : canal PDF, flux, formulaire projet
npm run lint    # ESLint
```

## Sources de données

`getBoats()` de `lib/sources/corpus.ts` est le point d'entrée unique des
pages. Il assemble trois choses :

- **Corpus historique** : `corpus-nauticea/` (annonces `bateaux.json`,
  pages `pages.json`, actualités `actualites.json`, redirections
  `redirects.csv`), extrait du site précédent. Photos versionnées dans
  `public/annonces/`. Ce corpus n'est jamais modifié par le code.
- **Canal fiche PDF, actif depuis le 17/08** : `content/annonces/<slug>.json`,
  écrit par l'ingestion d'une fiche PDF BoatWizard déposée dans `ingest/`.
  Une annonce ingérée remplace celle du corpus au même slug. Chaîne de
  lecture dans `lib/ingest/`, mode d'emploi humain dans
  `docs/PUBLIER-BATEAU.md`.
- **Cycle de vie** : `content/annonces-etats.json`, deux listes de slugs,
  `vendus` et `retirees`, tenues par le workflow « Gérer une annonce ».

Le flux payant Boats Group est écarté (décision du 17/08). Son parseur
`lib/sources/boatsgroup.ts` et son workflow `sync-feed.yml` restent en
place, dormants sans le secret `FEED_URL` : voir `docs/FLUX.md`.

## Formulaire de contact

Copier `.env.example` vers `.env.local`. Avec `RESEND_API_KEY`,
`CONTACT_TO_EMAIL` et `EMAIL_FROM` renseignés, le formulaire envoie via Resend
(honeypot anti-spam inclus). Sans clé, la page contact affiche les
téléphones cliquables à la place du formulaire.

## Déployer sur Vercel

1. Pousser le dépôt sur GitHub.
2. Sur [vercel.com](https://vercel.com), « Add New Project », importer le
   dépôt : le framework Next.js est détecté automatiquement, aucun
   réglage de build à changer.
3. Dans « Environment Variables », ajouter si souhaité `RESEND_API_KEY`,
   `CONTACT_TO_EMAIL`, `EMAIL_FROM`, `NEXT_PUBLIC_CONTACT_EMAIL`.
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
