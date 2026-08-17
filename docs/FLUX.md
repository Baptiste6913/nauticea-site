# FLUX : le flux payant Boats Group, option écartée

## Décision du 17/08 : ce n'est plus le canal du site

Le flux XML Boats Group est payant. La négociation tarifaire n'a pas
abouti, donc le canal officiel d'alimentation du site est désormais la
fiche PDF BoatWizard, décrite dans `docs/PUBLIER-BATEAU.md`.

BoatWizard reste la source de vérité et l'outil de diffusion réseau :
Bruno continue d'y saisir ses bateaux, et il en exporte une fiche PDF
qu'il dépose dans `ingest/`. Le site se remplit depuis cette fiche.

Ce document reste en place, et le code du flux avec lui, parce que
l'option peut se rouvrir :

- `lib/sources/boatsgroup.ts` : parseur du format Open Marine, durci le
  17/08 (liste blanche de devises, liste blanche de domaines d'images,
  téléchargements bornés), couvert par `tests/durcir-flux.test.mjs`.
- `.github/workflows/sync-feed.yml` : synchronisation planifiée, dormante
  tant que le secret `FEED_URL` est absent, donc sans effet aujourd'hui.

Rien à faire pour désactiver quoi que ce soit : sans `FEED_URL`, le
workflow s'arrête à sa première étape. Les deux canaux ne peuvent pas se
marcher dessus, car ils n'écrivent pas au même endroit : le flux
produirait `corpus-nauticea/bateaux-boatsgroup.json`, alors que le canal
PDF écrit `content/annonces/<slug>.json`.

Si la négociation aboutit un jour, la suite du document donne la marche à
suivre, telle qu'elle avait été préparée. Avant toute activation, il
faudra trancher lequel des deux canaux fait foi pour un même bateau : en
l'état, l'annonce ingérée depuis une fiche PDF est celle que le site
sert.

## 0. Objectif d'origine (si le flux est réactivé)

Le stock du site se met à jour tout seul depuis la plateforme où Bruno
gère déjà ses annonces. Une seule chose manque et elle est hors code :
l'URL du flux, à demander par Bruno à son contact Boats Group.

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

## 3 bis. Autoriser les domaines d'images (après le premier run)

Le flux est une source externe : par défaut **aucune image n'est
téléchargée**, tant que les domaines n'ont pas été autorisés
explicitement (durcissement du 17/08).

- [ ] Lancer une première synchronisation à la main (Actions >
      Synchronisation flux Boats Group > Run workflow).
- [ ] Lire la fin du journal du run : il affiche les hôtes d'images
      rencontrés et la ligne à recopier, par exemple
      `FEED_IMAGE_HOSTS=images.boatsgroup.com`.
- [ ] Vérifier que ces domaines appartiennent bien à Boats Group, puis
      les poser dans Settings > Secrets and variables > Actions >
      onglet **Variables** (pas Secrets, ce n'est pas confidentiel), nom
      `FEED_IMAGE_HOSTS`, valeurs séparées par des virgules.
- [ ] Relancer le workflow : les photos sont alors rapatriées dans
      `public/annonces/<slug>/` et versionnées.

Les bornes appliquées à chaque synchronisation, non configurables sans
modifier le code : 5 Mo par image, 15 secondes par image, 48 photos par
annonce, 50 Mo et 120 secondes pour le flux lui-même. Une image qui
dépasse une borne ou qui échoue est simplement absente, signalée au
rapport, et n'interrompt jamais la synchronisation.

Le rapport `corpus-nauticea/rapport-sync-flux.json`, committé à chaque
run, liste les anomalies : devise inconnue (le prix passe alors en
« Prix sur demande »), hôte refusé, schéma d'URL refusé, photos
tronquées, téléchargement échoué.

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
