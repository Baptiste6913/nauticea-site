# Publier une actualité depuis un téléphone

Pas à pas GitHub mobile (app GitHub ou navigateur), sans session de
développement. Dès la première actualité datée de 2026 ou plus, la
section Actualités réapparaît toute seule dans le menu et le sitemap :
rien d'autre à activer.

## 1. Dupliquer le gabarit (2 min)

1. Ouvrir le repo `nauticea-site` dans l'app GitHub (ou le navigateur).
2. Aller dans `content/actualites/`, ouvrir `_gabarit.md`.
3. Copier tout son contenu (bouton Raw puis tout sélectionner).
4. Revenir dans `content/actualites/`, bouton « + » puis
   « Create new file ».
5. Nommer le fichier en minuscules avec des tirets, terminé par `.md`,
   sans tiret bas au début. Exemple : `salon-cannes-2026.md`.

## 2. Remplir le front matter (2 min)

Coller le gabarit et remplacer les valeurs entre les `---` :

```
---
titre: Nauticea au salon de Cannes 2026
date: 2026-09-09
image: /actualites/images/salon-cannes-2026.jpg
cta_texte: Voir les annonces
cta_lien: /annonces
---
```

- `titre` : le titre affiché.
- `date` : au format AAAA-MM-JJ. C'est elle qui réveille la section
  (2026 ou plus).
- `image` : chemin de la photo (étape 3), ou ligne supprimée si pas de
  photo.
- `cta_texte` et `cta_lien` : le bouton en fin d'actu (une fiche
  bateau, `/annonces`, `/contact`...), lignes supprimables.

Écrire ensuite le corps sous le second `---` : un paragraphe par bloc,
séparés par une ligne vide.

## 3. Ajouter la photo (2 min)

1. Dans `public/actualites/images/`, bouton « + » puis « Upload files ».
2. Choisir la photo depuis le téléphone (nom simple, sans espaces ni
   accents : `salon-cannes-2026.jpg`).
3. Commit direct sur `main` (bouton vert).
4. Vérifier que le chemin `image:` du front matter correspond au nom
   du fichier téléversé.

## 4. Committer et vérifier (1 min)

1. Committer le fichier `.md` (bouton vert, message court, par exemple
   « Actu salon de Cannes 2026 »).
2. Le déploiement part tout seul ; deux minutes plus tard :
   - l'entrée « Actualités » est revenue dans le menu,
   - l'actualité est en ligne et au sitemap.

## En cas de doute

- La section ne revient pas : vérifier la `date` (2026 ou plus, format
  AAAA-MM-JJ) et que le nom du fichier ne commence pas par `_`.
- La photo ne s'affiche pas : vérifier que le chemin `image:`
  correspond exactement au fichier dans `public/actualites/images/`.
- Pour dépublier : supprimer le fichier `.md` (l'entrée de menu
  disparaît d'elle-même s'il n'en reste aucune de 2026 ou plus).
