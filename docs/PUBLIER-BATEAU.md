# Publier un bateau sur le site

Le site se remplit depuis la fiche PDF de BoatWizard. Vous continuez à
saisir vos bateaux dans BoatWizard comme aujourd'hui, c'est là que tout
part et c'est ce qui alimente les réseaux d'annonces. Pour le site, il
suffit d'y ajouter une étape : déposer la fiche PDF dans le dépôt.

Tout passe par une demande de fusion, c'est-à-dire une proposition de
modification que vous relisez avant qu'elle ne parte en ligne. Rien ne
se publie sans votre clic.

## Réglage à faire une seule fois

Le dépôt ouvre les demandes de fusion tout seul, ce qui demande une
autorisation à cocher une fois pour toutes :

- GitHub, dépôt `nauticea-site`, Settings, Actions, General.
- Section « Workflow permissions », cocher « Allow GitHub Actions to
  create and approve pull requests », puis Save.

Sans cette case, le dépôt lit bien la fiche mais ne peut pas ouvrir la
demande de fusion : l'exécution échoue à la dernière étape, avec un
message de refus dans l'onglet Actions.

## Ajouter un bateau

1. **Générer la fiche dans BoatWizard.** Ouvrez le bateau, demandez la
   fiche PDF, enregistrez le fichier. Ne le renommez pas, ne le
   retouchez pas.
2. **Déposer la fiche dans le dépôt.** Ouvrez le dossier `ingest/` du
   dépôt GitHub, bouton « Add file », puis « Upload files », choisissez
   le PDF, et validez (« Commit changes »). Depuis un téléphone, le
   navigateur suffit : le site GitHub permet l'envoi de fichiers.
3. **Attendre deux à trois minutes.** Le dépôt lit la fiche, écrit
   l'annonce, rapatrie les photos, joue les tests, puis ouvre une
   demande de fusion nommée `ingest/<nom-du-bateau>`.
4. **Relire la demande de fusion.** Onglet « Pull requests ». Le premier
   bloc du message s'appelle « À confirmer par un humain » : c'est la
   liste de ce que la fiche ne disait pas clairement. Lisez-la en entier.
5. **Fusionner.** Bouton « Merge pull request ». La mise en ligne prend
   une à deux minutes ensuite.

La fiche déposée est déplacée dans `ingest/archive/` par le dépôt : c'est
la trace de ce qui a servi à écrire l'annonce.

## Modifier un bateau déjà en ligne

Corrigez d'abord dans BoatWizard, régénérez la fiche PDF, puis déposez-la
comme au premier jour. Le dépôt reconnaît le bateau à sa marque et à son
modèle, garde son adresse web, et remplace ses informations. La demande
de fusion porte alors un bloc « Différences avec l'annonce en ligne »,
champ par champ : c'est ce bloc qu'il faut lire.

Ce qui est conservé, jamais écrasé par une fiche qui ne le dit pas :

- l'adresse web de l'annonce, et donc son référencement,
- la catégorie et la sous-catégorie,
- les caractéristiques que la fiche ne donne pas,
- le marquage « vendu » s'il est posé,
- les photos, dès que la fiche n'offre pas une meilleure résolution.

## Marquer un bateau vendu

1. Onglet « Actions » du dépôt, puis « Gérer une annonce » dans la liste
   de gauche.
2. Bouton « Run workflow ». Renseignez le **slug**, c'est-à-dire la fin
   de l'adresse de l'annonce après `/annonces/`. Par exemple, pour
   `https://www.nauticeayachting.fr/annonces/ryck-280-508`, le slug est
   `ryck-280-508`.
3. Choisissez l'action `vendu`, lancez, puis relisez et fusionnez la
   demande de fusion.

Le bateau vendu reste visible : l'annonce reste listée et référencée, un
bandeau « Vendu » apparaît sur la carte et sur la fiche, et l'invitation
à décrire un projet est remplacée par un lien vers les bateaux
disponibles. C'est volontaire : ces pages continuent d'amener des
visiteurs, et un bateau vendu prouve que vous vendez.

Pour remettre un bateau en vente, même chemin avec l'action
`disponible`.

## Retirer une annonce

Même chemin, action `retirer`. L'annonce et ses photos sont supprimées,
et son ancienne adresse renvoie vers la liste des annonces, pour qu'aucun
lien ne tombe dans le vide.

À n'utiliser que si le bateau n'a jamais existé sur le site ou si vous ne
voulez plus aucune trace. Pour un bateau vendu, préférez `vendu` :
retirer une page perd son référencement.

## Ce que le dépôt lit dans la fiche, et ce qu'il ne lit pas

Lu et publié : marque, modèle, année, longueur, largeur, prix, devise,
statut fiscal, état neuf ou occasion, type de bateau, carburant,
emplacement, matériau de coque, type d'entraînement, cabines, toilettes,
tous les moteurs avec leurs heures et leur puissance, les
caractéristiques complémentaires (dimensions, poids, vitesses,
réservoirs), les équipements par sections, et la description entière,
mot pour mot, y compris celle du constructeur.

Jamais publié : le pied de page de la fiche, avec vos coordonnées, et
l'avis de non-responsabilité en fin de document. Ils appartiennent à la
fiche, pas au bateau, et le site a déjà ses propres pages pour cela.

Jamais deviné : un champ absent ou illisible n'est pas rempli au hasard,
il est marqué `a_confirmer` et listé dans la demande de fusion.

## Les photos

Les photos viennent de la fiche, dans l'ordre où elles y figurent. Le
logo est écarté automatiquement.

Point de vigilance mesuré sur les fiches réelles : les photos incluses
dans le PDF sont **de plus faible résolution que celles du site
actuel**. Sur la fiche du Monte Carlo 42, les photos font 480 par 320 ou
600 par 400 pixels, contre 700 par 525 en ligne. Les photos sous
400 pixels sont écartées, et celles sous 800 pixels sont signalées dans
la demande de fusion.

**Une photo en ligne n'est jamais remplacée par une version moins
bonne.** À chaque re-dépôt, le dépôt compare photo par photo : il ne
remplace que si la fiche fait strictement mieux, garde l'existante sinon,
et conserve les photos au-delà de ce que la fiche fournit. Les textes,
eux, sont toujours mis à jour. Vous pouvez donc redéposer une fiche sans
craindre d'appauvrir la galerie.

La demande de fusion porte un tableau « Décision photo par photo » qui
dit, pour chaque photo, ce qui a été fait et pourquoi. Sur le Monte
Carlo 42, ce tableau donne 1 photo remplacée, 27 conservées, 0 perdue.

## Désigner soi-même l'annonce à mettre à jour

Cas rare, utile quand le rapprochement automatique refuse de choisir :
onglet « Actions », « Ingestion d'une fiche PDF », « Run workflow ». Un
champ facultatif y apparaît, le slug de l'annonce à mettre à jour : le
renseigner force la cible, sans rapprochement automatique. La fiche
traitée est celle qui attend dans `ingest/`, il faut donc l'y avoir
laissée.

## Voir ce qu'une fiche donnerait, sans rien publier

Sur un poste avec le dépôt installé :

```
node --experimental-strip-types scripts/ingest-fiche.mts chemin/vers/fiche.pdf --essai
```

Rien n'est écrit hors d'un rapport dans `rapports/`. C'est le mode de
relecture.

## Quand quelque chose ne marche pas

- **Aucune demande de fusion n'apparaît.** Vérifiez que le fichier est
  bien un `.pdf`, déposé à la racine de `ingest/` et non dans
  `ingest/archive/`. Onglet « Actions » : l'exécution « Ingestion d'une
  fiche PDF » indique ce qui a échoué.
- **La fiche est refusée.** Le dépôt refuse une fiche au-delà de 30 Mo
  ou de 40 pages, et un fichier qui n'est pas un PDF. Le message dit
  laquelle de ces bornes est dépassée.
- **Beaucoup de champs en `a_confirmer`.** La fiche est probablement
  incomplète dans BoatWizard. Complétez-la là-bas, régénérez, redéposez :
  la nouvelle fiche remplace la précédente.
- **Le bateau apparaît en double.** Cela veut dire que la marque ou le
  modèle diffère de l'annonce déjà en ligne, et que le rapprochement n'a
  donc pas été fait. Signalez-le plutôt que de fusionner.
- **« Plusieurs annonces portent la même marque et le même modèle ».**
  Le dépôt refuse alors de choisir, plutôt que de risquer d'écraser la
  mauvaise annonce, et il liste les candidates avec leur année et leur
  prix. C'est le cas des deux Sealine C335, un neuf de 2026 et une
  occasion de 2021 : l'année les distingue d'ordinaire, mais si elle
  manque, il faut trancher à la main. Relancez alors l'ingestion depuis
  l'onglet Actions en renseignant le slug de l'annonce à mettre à jour.

## Fiches de référence

`ingest-fixtures/` garde cinq vraies fiches, qui servent de base aux
tests automatiques : un bi-moteur d'occasion, un bateau neuf mono-moteur,
un grand yacht avec nom de bateau et pavillon, un catamaran, et une fiche
sans nombre de toilettes. Toute modification du lecteur est vérifiée
contre ces cinq fiches.

Fiches encore utiles à fournir, pour couvrir des cas non rencontrés :

- une fiche **sans prix**, ou avec « prix sur demande »,
- une fiche **de voilier**, pour vérifier le classement en catégorie,
- une fiche **sans aucune photo**,
- une fiche **en devise étrangère**, livre ou dollar,
- une fiche **sans bloc moteur**.

Déposez-les dans `ingest-fixtures/` par une demande de fusion, ou
transmettez-les : chaque nouveau cas devient un test, et le lecteur cesse
alors de pouvoir régresser dessus.
