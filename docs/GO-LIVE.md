# GO-LIVE : bascule du domaine nauticeayachting.fr

Checklist exécutable le jour de la récupération de l'accès IONOS.
Durée estimée : 30 minutes de manipulations, puis surveillance.
Règle d'or : les emails de Bruno ne bougent pas d'un millimètre, on
recopie les MX à l'identique avant tout changement.

## 0. Prérequis (avant le jour J)

- [ ] Accès au compte IONOS du domaine `nauticeayachting.fr` récupéré.
- [ ] Projet Vercel créé et relié au repo GitHub `nauticea-site`
      (branche de production : `main`), build vert.
- [ ] Compte Resend créé (plan gratuit suffisant au départ).

## 1. Inventaire de la zone DNS actuelle (10 min, AVANT tout changement)

- [ ] Dans IONOS, ouvrir la zone DNS de `nauticeayachting.fr` et
      exporter ou photographier TOUS les enregistrements.
- [ ] Noter en particulier, dans un fichier conservé :
  - les enregistrements **MX** (serveurs de mail de Bruno),
  - les **TXT** commençant par `v=spf1` (SPF existant),
  - tout TXT DKIM ou DMARC existant,
  - les A / AAAA / CNAME actuels de `@` et `www` (pour le rollback).

## 2. Domaine dans Vercel (5 min)

- [ ] Vercel > projet > Settings > Domains : ajouter
      `nauticeayachting.fr` et `www.nauticeayachting.fr`
      (www en domaine principal, l'apex redirige vers www).
- [ ] Vercel affiche les enregistrements attendus : les poser dans
      IONOS :
  - `@` : enregistrement A vers l'IP indiquée par Vercel,
  - `www` : CNAME vers la cible indiquée par Vercel.
- [ ] Ne toucher à AUCUN enregistrement MX ni TXT existant : les mails
      continuent de fonctionner pendant et après la bascule.

## 3. Domaine dans Resend (10 min, peut se faire en parallèle)

- [ ] Resend > Domains > Add domain : `nauticeayachting.fr`.
- [ ] Poser dans IONOS les enregistrements demandés par Resend :
  - le TXT DKIM (`resend._domainkey...`),
  - le SPF : si un TXT `v=spf1` existe déjà, NE PAS en créer un
    second ; ajouter `include:amazonses.com` (ou la valeur exacte
    indiquée par Resend) dans le TXT existant,
  - le MX de bounce éventuel demandé par Resend sur un sous-domaine
    (jamais sur `@`).
- [ ] Attendre le statut « Verified » dans Resend.

## 4. Variables d'environnement Vercel (2 min)

Vercel > projet > Settings > Environment Variables (Production) :

- [ ] `RESEND_API_KEY` : clé API créée dans Resend.
- [ ] `CONTACT_TO_EMAIL` : `contact@nauticeayachting.fr`.
- [ ] `EMAIL_FROM` : `site@nauticeayachting.fr` (adresse d'envoi sur
      le domaine vérifié ; pas besoin de boîte mail, c'est un
      expéditeur ; obligatoire, aucune valeur par défaut dans le code).
- [ ] `NEXT_PUBLIC_CONTACT_EMAIL` : `contact@nauticeayachting.fr`.
- [ ] Redéployer (Deployments > Redeploy) pour prendre les variables.

### Espace de gestion privé (facultatif, activable plus tard)

Quatre variables de plus, toutes côté serveur, aucune préfixée
`NEXT_PUBLIC` :

- [ ] `SESSION_SECRET` : chaîne aléatoire de 32 caractères au moins.
      Génération : `openssl rand -base64 48`.
- [ ] `ADMIN_EMAILS` : adresses autorisées, séparées par des virgules.
- [ ] `GITHUB_GESTION_TOKEN` : jeton GitHub à portée fine (voir plus bas).
- [ ] `GITHUB_GESTION_REPO` : `Baptiste6913/nauticea-site`.

Sans les deux premières, `/gestion` se déclare inactive et aucune
connexion n'est possible. Mode d'emploi pour Bruno : `docs/GESTION.md`.

## 4 bis. Jeton GitHub de l'espace de gestion

Création, sur le compte qui possède le dépôt : GitHub > Settings >
Developer settings > Personal access tokens > Fine-grained tokens.

- [ ] Resource owner : le propriétaire du dépôt.
- [ ] Repository access : **Only select repositories**, `nauticea-site`
      uniquement.
- [ ] Permissions : Contents **Read and write**, Pull requests
      **Read and write**, Actions **Read and write**. Rien d'autre.
- [ ] Expiration : 90 jours. Un jeton sans expiration est un jeton qu'on
      oublie.
- [ ] Coller la valeur dans `GITHUB_GESTION_TOKEN` sur Vercel, puis
      redéployer.

### Rotation du jeton (tous les 90 jours, ou immédiatement si doute)

1. [ ] Créer un nouveau jeton avec exactement les mêmes portées.
2. [ ] Remplacer `GITHUB_GESTION_TOKEN` sur Vercel (Production), puis
       redéployer.
3. [ ] Vérifier depuis `/gestion` qu'un geste aboutit : marquer un bateau
       vendu, puis fermer la proposition ouverte sans la fusionner.
4. [ ] Supprimer l'ancien jeton sur GitHub. C'est cette étape qui coupe
       réellement l'accès de l'ancien.

Rotation de `SESSION_SECRET` : même chemin, en sachant qu'elle déconnecte
tout le monde. C'est le seul moyen de révoquer une session en cours, et
c'est le geste à faire si un téléphone connecté est perdu. Retirer une
adresse d'`ADMIN_EMAILS` coupe en revanche l'accès de cette seule
personne, immédiatement.

### Limitation de débit à poser sur le pare-feu Vercel

La limitation de débit du code est en mémoire, donc par instance : elle
borne, mais ne garantit rien de distribué (constat de l'audit du 17/08).
À poser dans Vercel > projet > Firewall :

- [ ] Règle sur `/api/gestion/lien` : 5 requêtes par 10 minutes et par IP.
      C'est la seule route de l'espace ouverte sans session, donc la seule
      qui mérite une règle stricte.
- [ ] Règle sur `/api/gestion/*` : 60 requêtes par 10 minutes et par IP,
      pour borner un cookie volé.
- [ ] Règles existantes sur `/api/contact` et `/api/projet` : inchangées.

## 5. Tests post-bascule (10 min, dès la propagation DNS)

- [ ] `https://www.nauticeayachting.fr` sert le nouveau site en HTTPS.
- [ ] Anciennes URLs : tester 3 ou 4 redirections 301, par exemple
      `/contact.html`, `/bateaux-neufs.html`,
      `/annonces-bateaux-occasion/29-vedette/539-c390.html`.
- [ ] Formulaire réel de bout en bout : envoyer un projet de test
      depuis `/projet`, vérifier la réception sur
      `contact@nauticeayachting.fr` et que « répondre » écrit bien au
      prospect.
- [ ] Envoyer et recevoir un email normal sur la boîte de Bruno
      (preuve que les MX n'ont pas bougé).

## 6. Référencement (15 min, dans la semaine)

- [ ] Google Search Console : ajouter la propriété
      `https://www.nauticeayachting.fr` (validation DNS via IONOS),
      soumettre `https://www.nauticeayachting.fr/sitemap.xml`.
- [ ] Fiche d'établissement Google (Google Business Profile) : mettre à
      jour l'URL du site.
- [ ] Surveiller Search Console 2 à 3 semaines : les 301 depuis les
      anciennes URLs `.html` transfèrent l'historique.

## 7. Extinction de l'ancien hébergement (après 2 à 4 semaines calmes)

- [ ] Vérifier dans Search Console qu'il ne reste pas d'erreurs
      massives d'exploration.
- [ ] Le HTML de l'ancien site est déjà sauvegardé dans le repo
      (`corpus-nauticea/raw/` et `corpus-nauticea/raw-mirror/`), les
      photos dans `public/annonces/` : rien à récupérer de plus.
- [ ] Résilier l'ancien hébergement du site historique (il reste la
      principale surface d'attaque du domaine tant qu'il est en ligne).

## 8. Rollback (si problème majeur pendant la bascule)

- [ ] Dans IONOS, remettre les enregistrements A / AAAA / CNAME de
      `@` et `www` notés à l'étape 1 : l'ancien site répond à nouveau
      (propagation quelques minutes à quelques heures).
- [ ] Les MX n'ayant jamais bougé, les emails ne sont jamais affectés.
