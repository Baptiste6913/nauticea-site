# FLUX : branchement du flux Boats Group (Phase B)

Objectif : le stock du site se met à jour tout seul depuis la
plateforme où Bruno gère déjà ses annonces. Une seule chose manque et
elle est hors code : l'URL du flux, à demander par Bruno à son contact
Boats Group.

## 1. Le message à envoyer par Bruno (prêt à copier)

> Bonjour,
>
> Je souhaite récupérer le flux d'export de mes annonces pour alimenter
> automatiquement mon site internet. Pouvez-vous m'indiquer l'URL du
> flux export « site web » de mon compte (format XML Open Marine), ou
> me dire comment l'activer ?
>
> Merci d'avance,
> Bruno Bouault, Nauticea Yachting, Port-Fréjus

Le fournisseur répond en général avec une URL du type
`https://.../export/xxxx.xml`, parfois protégée par un jeton dans
l'URL. Cette URL est un secret : ne pas la publier.

## 2. Poser l'URL en secret GitHub (2 min)

- [ ] GitHub > repo `nauticea-site` > Settings > Secrets and
      variables > Actions > New repository secret.
- [ ] Nom : `FEED_URL` ; valeur : l'URL fournie par Boats Group.

## 3. Activer la synchronisation (déjà livrée, inactive sans secret)

Le workflow `.github/workflows/sync-feed.yml` tourne deux fois par jour
(05h00 et 17h00 UTC) et ne fait rien tant que `FEED_URL` est absent.
Dès que le secret existe :

- [ ] GitHub > Actions > « Synchronisation flux Boats Group » >
      Run workflow (premier run manuel).
- [ ] Le run télécharge le flux, le normalise et committe
      `corpus-nauticea/bateaux-boatsgroup.json` si le contenu change.

## 4. Valider le premier run (critères)

- [ ] Le nombre d'annonces du JSON correspond au stock affiché sur la
      plateforme Boats Group (à quelques unités près si des annonces
      sont en cours de publication).
- [ ] Chaque annonce a un titre, un prix cohérent avec la plateforme
      (ou null pour « prix sur demande ») et des URLs de photos.
- [ ] Échantillon : comparer 3 annonces avec la plateforme (prix,
      année, longueur).

## 5. Basculer la source du site (une ligne par page)

Quand le JSON est validé :

- [ ] Brancher `getBoats()` de `lib/sources/boatsgroup.ts` sur
      `corpus-nauticea/bateaux-boatsgroup.json` (le parseur et ses
      tests existent déjà : `npm test`).
- [ ] Dans les pages, remplacer l'import `@/lib/sources/corpus` par
      `@/lib/sources/boatsgroup` (une ligne par fichier, la signature
      est identique).
- [ ] `npm run verifier` doit rester vert, puis merge : le site suit
      désormais la plateforme automatiquement, photos comprises.

## 6. Ce que la Phase B ne change pas

Pages statiques (à propos, marques, places de port, mentions légales),
actualités et redirections restent gérées dans le repo. Seul le stock
d'annonces devient automatique.
