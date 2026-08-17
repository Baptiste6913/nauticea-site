# Audit de sécurité post-livraison, 17 août 2026

Audit en lecture seule mené le jour de la mise en production du domaine
`nauticeayachting.fr`. Aucune modification de code : ce document est le
seul fichier ajouté.

## Méthode et périmètre

- Code audité : `main` au commit `7a16ef2`.
- Constats en production : requêtes HTTP datées du 17/08 entre 12:00 et
  12:25 UTC sur `https://www.nauticeayachting.fr`.
- Sondes actives réalisées : 14 requêtes POST à corps vide sur
  `/api/projet` (aucun mail ne peut partir, la validation rejette avant
  l'appel à Resend), téléchargement et analyse des 9 fichiers
  JavaScript servis au navigateur, interrogations DNS et API GitHub.
- Hors périmètre, et c'est le rappel le plus important de ce document :
  **l'ancien site Joomla reste l'exposition principale historique du
  domaine**, il n'est pas dans ce dépôt et son hébergement n'est pas
  encore résilié. Voir la section 7.

## Verdicts

| Point | Objet | Verdict |
|---|---|---|
| 1 | En-têtes servis par la production | CONFORME |
| 2 | Secrets dans le dépôt et l'historique | CONFORME |
| 3 | Permissions des workflows GitHub | PARTIEL |
| 4 | Route API : fuites, bornes, clé côté client | PARTIEL |
| 5 | Surface d'ingestion et protection de `main` | NON CONFORME |
| 6 | Risques acceptés | documenté |

Deux constats méritent une action rapide : la **branche par défaut du
dépôt pointe sur une branche périmée** (section 5) et la **limitation de
débit ne freine rien en pratique**, mesuré (section 4).

## 1. En-têtes réellement servis : CONFORME

Quatre pages testées en production, plus la route API et une 404 :
accueil, fiche annonce `/annonces/sealine-c390-539`, `/projet`,
`/mentions-legales`.

| En-tête | Valeur servie, identique sur les 6 réponses |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | 11 directives, voir ci-dessous |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `frame-ancestors` | `'none'`, porté par la CSP |

CSP servie : `default-src 'self'` ; `script-src 'self' 'unsafe-inline'` ;
`style-src 'self' 'unsafe-inline'` ; `img-src 'self' data:` ;
`font-src 'self'` ; `connect-src 'self'` ;
`frame-src https://www.google.com https://maps.google.com` ;
`frame-ancestors 'none'` ; `base-uri 'self'` ; `form-action 'self'` ;
`object-src 'none'`.

**Aucun écart local/production.** Les 11 directives déclarées dans
`next.config.ts` se retrouvent une à une dans la réponse HTTP, dans le
même ordre. Les 5 en-têtes sont présents sur la route API (405 sur GET)
et sur une page inexistante (404), ce qui confirme que la règle
`source: "/(.*)"` couvre bien tout le site et pas seulement les pages.

Trois points à connaître, sans gravité :

- **`X-Frame-Options` est absent**, volontairement : `frame-ancestors
  'none'` le remplace sur tout navigateur moderne. L'ajouter
  couvrirait en plus quelques navigateurs anciens, à coût nul.
- **`'unsafe-inline'` sur `script-src`** est le compromis documenté dans
  `next.config.ts` : les scripts d'amorçage de Next sont en ligne et un
  export statique ne peut pas porter de nonce par requête. C'est la
  limite réelle de cette CSP, connue et acceptée.
- **`preload` est déclaré mais le domaine n'est pas inscrit** : l'API de
  `hstspreload.org` répond `unknown` pour `nauticeayachting.fr`.
  L'en-tête est valide et protège dès la première visite en HTTPS, mais
  l'inscription à la liste embarquée dans les navigateurs est une
  démarche séparée. Attention avant de la faire : `includeSubDomains`
  plus `preload` est un engagement difficile à défaire, tout
  sous-domaine devra rester en HTTPS.

## 2. Secrets dans le dépôt et l'historique : CONFORME

Recherche par motifs sur l'arbre de travail complet, `corpus-nauticea`
inclus (le « data/raw » de la directive), puis sur les 30 derniers
commits de toutes les références.

Motifs cherchés : clés Resend (`re_…`), Stripe (`sk_live_…`), OpenAI
(`sk-…`), jetons GitHub (`ghp_…`, `github_pat_…`), clés AWS (`AKIA…`),
Google (`AIza…`), Slack (`xox…`), blocs `BEGIN … PRIVATE KEY`, jetons
JWT, et assignations en clair de `password`, `secret`, `api_key`,
`token`.

**Résultat : zéro occurrence**, dans les fichiers comme dans les diffs
de l'historique récent. Aucun fichier `.env` n'est suivi par git, et
`.gitignore` couvre `.env*`.

Deux observations :

- **`.env.example` n'est pas versionné** : il existe sur le poste mais
  le motif `.env*` du `.gitignore` l'exclut. Ce n'est pas un risque,
  plutôt l'inverse, mais la liste des variables attendues n'est donc
  pas dans le dépôt. Elle est heureusement documentée dans
  `docs/GO-LIVE.md`, qui est versionné. À arbitrer : dégager
  `.env.example` de l'exclusion, ou s'en tenir au go-live comme source
  unique.
- **La clé Resend qui a circulé en conversation le 17/08 a été
  remplacée** dans Vercel, mais elle était encore active lors de cet
  audit. Sa révocation est en cours côté Resend. Contrôle à refaire
  après suppression : un appel à l'API Resend avec l'ancienne clé doit
  répondre 401.

## 3. Permissions des workflows GitHub : PARTIEL

Un seul workflow : `.github/workflows/sync-feed.yml`.

**Ce qui est bien.** Les permissions sont déclarées explicitement au
niveau du job, `contents: write` et rien d'autre : ni `packages`, ni
`id-token`, ni `actions`, ni `issues`. Le workflow est inerte par
défaut grâce à un garde qui vérifie la présence du secret `FEED_URL`
avant toute étape, et les six exécutions planifiées depuis le 14/08 se
sont toutes terminées en « success » sans rien faire, ce qui valide le
garde en conditions réelles.

**Trois durcissements manquants.**

1. **Pas de bloc `permissions` au niveau du workflow.** Ajouter
   `permissions: {}` en tête, puis n'accorder qu'au job qui en a
   besoin, garantit qu'un futur second job n'héritera pas des droits
   par défaut du dépôt.
2. **Actions épinglées sur des étiquettes mobiles** :
   `actions/checkout@v4` et `actions/setup-node@v4`. Une étiquette peut
   être déplacée par son mainteneur ; l'épinglage sur un condensat
   (`@<sha>`) est la seule forme immuable. C'est le point de chaîne
   d'approvisionnement le plus concret de ce dépôt, dans un workflow
   qui a le droit d'écrire.
3. **`curl -sSf "$FEED_URL"` sans borne** : ni `--max-time`, ni
   `--max-filesize`. Un flux hostile ou une URL qui ne répond jamais
   bloque ou remplit le disque du runner. Impact limité à la CI, mais
   corrigible en deux options.

`contents: write` est en revanche légitime : le workflow committe le
JSON normalisé. La vraie question n'est pas le droit mais sa cible,
traitée au point suivant.

## 4. Route API : PARTIEL

### Aucune fuite d'information interne : CONFORME

Les deux routes ne renvoient que des libellés génériques, sans détail
technique, sans trace d'exécution, sans corps de réponse de Resend :
« Service indisponible. » (503), « Trop de requêtes. » (429), « Requête
invalide. » (400 et 413), « Vérification échouée. » (403), « Champs
invalides. » (400), « Envoi impossible. » (502). Vérifié ligne par ligne
dans `app/api/projet/route.ts` et `app/api/contact/route.ts` : aucun
`console.log`, aucun renvoi du corps de la réponse Resend au client.

### La clé n'est jamais côté client : CONFORME, vérifié en production

Les 9 fichiers JavaScript servis par `/projet`, soit 716 Ko
téléchargés, ont été analysés : **zéro occurrence** de `re_…`, de
`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `EMAIL_FROM`,
`TURNSTILE_SECRET_KEY`, ou de l'URL `resend.com/emails`. L'appel à
Resend est bien confiné au serveur.

Les seules variables exposées au navigateur portent le préfixe
`NEXT_PUBLIC_` et aucune n'est un secret : `NEXT_PUBLIC_GAMME_NEUVE`
(drapeau de page), `NEXT_PUBLIC_CONTACT_EMAIL` (adresse déjà publique)
et `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, qui est publique par conception,
son pendant secret `TURNSTILE_SECRET_KEY` restant côté serveur.

### Bornes de taille : CONFORME avec une réserve

Corps limité à 8 Kio sur `/api/projet`, 16 Kio sur `/api/contact`, et
chaque champ borné individuellement (30 à 254 caractères selon le
champ, message tronqué à 4 000 et 10 000). Réserve : le corps est lu
intégralement par `request.text()` **avant** le contrôle de taille, donc
un envoi volumineux est mis en mémoire avant d'être rejeté. La limite de
corps propre à la plateforme (de l'ordre de quelques mégaoctets sur une
fonction serverless) borne les dégâts, mais tester
`content-length` avant lecture serait plus propre.

### La limitation de débit ne freine rien : NON CONFORME, mesuré

C'est le constat le plus important de cette section. **14 requêtes POST
consécutives sur `/api/projet` n'ont jamais déclenché de 429**, ni avec
un `X-Forwarded-For` constant sur 7 requêtes, ni avec une valeur
différente à chaque requête sur 7 autres. Toutes ont répondu 400, donc
sont passées par le contrôle de débit sans être bloquées, alors que le
code prévoit 5 requêtes par tranche de 10 minutes.

L'explication la plus probable est celle que le code anticipait :
l'état vit dans une `Map` en mémoire, et chaque requête peut être servie
par une instance serverless différente, chacune avec son compteur
vierge. Le commentaire de `lib/anti-abus.ts` parlait d'« une borne
réelle mais pas une garantie distribuée » : la mesure montre qu'en
pratique, sur ce déploiement, **la borne n'existe pas**.

Ce qui protège donc réellement le formulaire aujourd'hui : le champ
piège, le délai minimal de 4 secondes, et la validation stricte des
champs. Ces trois contrôles arrêtent les robots opportunistes mais pas
un acteur déterminé, qui pourrait épuiser le quota Resend (3 000 mails
par mois sur le plan gratuit) et inonder la boîte de Bruno.

Deux corrections possibles, aucune ne demande d'écrire du code :

- **Activer Turnstile** : le code est déjà en place, il suffit de poser
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` et `TURNSTILE_SECRET_KEY`. Attention,
  la vérification n'est câblée que sur `/api/projet` ; `/api/contact`
  ne l'appelle pas. Un durcissement complet demanderait de l'y ajouter.
- **Utiliser la limitation de débit du pare-feu Vercel**, disponible sur
  le plan Pro souscrit ce jour : une règle sur `/api/*` s'applique en
  amont des fonctions, donc sans le problème d'état par instance.

Note annexe : `ipDeLaRequete` retient la valeur la plus à gauche de
`x-forwarded-for`. Selon la façon dont la plateforme renseigne cet
en-tête, cette valeur peut être fournie par le client. Préférer
`x-real-ip` ou la dernière valeur de la chaîne serait plus robuste, mais
c'est secondaire tant que le compteur lui-même ne borne rien.

## 5. Surface d'ingestion et protection de `main` : NON CONFORME

### Le répertoire `ingest/` n'existe pas

La directive demande d'auditer `ingest/` et le traitement d'un « PDF
hostile ». Ni l'un ni l'autre n'existent dans ce dépôt : aucun
répertoire `ingest/`, et aucune mention de PDF dans le code, les
scripts ou les dépendances. La surface équivalente, auditée ici, est la
chaîne d'ingestion du flux Boats Group : `sync-feed.yml`, puis
`scripts/normalise-feed.mts`, qui appelle `parseOpenMarine` dans
`lib/sources/boatsgroup.ts`.

### Qui peut déclencher

Deux déclencheurs : la planification (05:00 et 17:00 UTC) et
`workflow_dispatch`, donc un déclenchement manuel réservé aux personnes
ayant les droits d'écriture sur le dépôt. Aucun déclencheur ouvert de
type `pull_request_target`, `issue_comment` ou `repository_dispatch`,
qui sont les vecteurs classiques d'exécution par un tiers. Sur ce point,
la surface est saine.

### Ce que le parseur fait d'une entrée hostile

Le parseur est volontairement sans dépendance et fonctionne par
expressions régulières, ce qui lui donne une propriété défensive
inattendue mais réelle : **il n'interprète ni DTD ni entités externes,
donc il est insensible aux attaques XXE et à l'expansion d'entités**
(« billion laughs »). `decoderEntites` ne décode que cinq entités
fixes, sans récursion. Le résultat est écrit en JSON, et les textes sont
rendus par React qui les échappe : pas de vecteur XSS par le flux.

Trois fragilités subsistent si la phase B est activée un jour :

1. **`devise` n'est pas validée** et alimente
   `Intl.NumberFormat(..., { currency })` dans `formatPrix`. Un code
   devise invalide dans le flux fait lever une exception à la
   génération de la page concernée.
2. **Les `ImageURL` du flux ne sont ni validées ni restreintes** : une
   URL arbitraire finirait en source d'image. Sans `remotePatterns`
   déclaré, l'optimiseur d'images refuserait les hôtes externes, mais
   une liste blanche explicite serait plus saine.
3. **Coût de retour arrière des expressions régulières** sur une entrée
   très volumineuse ou malformée (balise ouvrante sans fermante). Sans
   `--max-filesize` sur le téléchargement, un flux gigantesque peut
   faire tourner le runner longtemps. Impact CI uniquement.

### La branche par défaut du dépôt est périmée

C'est le constat central de cet audit, et il n'était pas anticipé par la
directive.

**La branche par défaut de `Baptiste6913/nauticea-site` est
`claude/nauticea-nextjs-refonte-b4m2hx`**, dont le dernier commit
(`e14581d`) date du 14/08. Elle est **en retard de 42 commits sur
`main`**, qui est la branche déployée par Vercel et la cible de toutes
les PR.

Conséquences constatées, pas hypothétiques :

- **Les exécutions planifiées tournent depuis cette branche périmée** :
  les six exécutions du workflow relevées dans l'API GitHub portent
  toutes `head_branch: claude/nauticea-nextjs-refonte-b4m2hx`. Le code
  exécuté deux fois par jour est celui du 14/08, sans aucun des
  durcissements apportés depuis.
- **Si la phase B était activée, le commit du flux irait sur cette
  branche morte**, jamais en production, tout en affichant « success ».
  La synchronisation semblerait fonctionner sans que rien n'arrive sur
  le site.
- **Toute PR ouverte sans base explicite viserait cette branche.** Nos
  17 PR ont toutes visé `main` explicitement, donc aucun dégât, mais
  c'est un piège permanent pour un futur contributeur ou un outil
  automatisé.
- Quiconque consulte le dépôt voit du code de trois jours comme état
  canonique du projet.

### Rien ne touche `main` sans PR : vrai aujourd'hui, par accident

Sur les 47 commits de `main`, 18 sont des commits de fusion et les
seuls commits poussés directement sont les **4 commits de fondation**
des 13 et 14/08, antérieurs à l'adoption du circuit par PR. Depuis la
PR nº 1, tout passe par une PR. Tous les commits sont signés du même
auteur, `Baptiste6913`.

Mais cette propriété n'est **garantie par aucun mécanisme** : le
workflow détient `contents: write` et exécute `git push` sans passer par
une PR. Il ne touche pas `main` aujourd'hui seulement parce qu'il tourne
sur la mauvaise branche. Corriger la branche par défaut sans changer le
workflow rendrait donc possible un commit automatique direct sur `main`.

L'existence d'une protection de branche sur `main` n'est pas vérifiable
avec les outils de cette session ; à confirmer dans les réglages du
dépôt.

## 6. Risques acceptés

- **Limitation de débit non distribuée**, désormais mesurée comme
  inopérante sur ce déploiement (section 4). Accepté tant que le volume
  reste faible, à corriger par Turnstile ou le pare-feu Vercel si le
  formulaire est visé.
- **`'unsafe-inline'` sur `script-src`**, imposé par l'amorçage de Next
  en export statique (section 1).
- **Dépendance à trois services tiers** : Vercel pour l'exécution,
  Resend pour l'envoi, Google Maps chargé au clic sur `/contact`. Le
  troisième est le seul à déposer des cookies, et seulement après action
  explicite du visiteur, ce que les mentions légales décrivent.
- **19 branches distantes subsistent**, dont toutes les branches de
  fonctionnalités déjà fusionnées. Sans risque en soi, mais elles
  entretiennent la confusion avec la branche par défaut périmée.

## 7. Rappel de périmètre : l'ancien site

L'exposition la plus significative du domaine n'est pas dans ce dépôt.
L'ancien site Joomla, servi jusqu'à ce matin depuis une plateforme
mutualisée IONOS (`217.160.0.61`, dont le nom inverse est
`217-160-0-61.elastic-ssl.ui-r.com`), n'est plus atteignable par le
domaine mais **son hébergement n'est pas résilié**. Un Joomla non
maintenu est une cible courante ; il n'est plus lié au domaine, donc son
exploitation n'affecterait plus le site public, mais elle resterait un
incident pour le client. Sa résiliation, une fois la question des boîtes
mail réglée, fermera définitivement ce chapitre.

À noter, côté positif : le contenu de l'ancien site est archivé dans ce
dépôt (56 pages HTML, 632 photos), sa disparition ne fait donc perdre
aucune donnée.

## Recommandations, par ordre de priorité

1. **Faire de `main` la branche par défaut** du dépôt, puis supprimer
   les branches fusionnées. Corrige d'un geste les quatre conséquences
   de la section 5.
2. **Décider du circuit du workflow de flux avant d'activer la phase
   B** : soit il ouvre une PR (`pull-requests: write`) au lieu de
   pousser, soit la poussée directe est assumée et documentée.
3. **Poser une protection de branche sur `main`** exigeant une PR, pour
   que la règle repose sur un mécanisme et non sur la discipline.
4. **Traiter la limitation de débit** si le formulaire subit du bruit :
   Turnstile (deux variables, code déjà en place, à étendre à
   `/api/contact`) ou une règle de pare-feu Vercel sur `/api/*`.
5. **Épingler les actions GitHub sur des condensats** et borner le
   `curl` du flux en durée et en taille.
6. **Finir la révocation de l'ancienne clé Resend** et vérifier qu'elle
   répond 401.
7. **Résilier l'hébergement de l'ancien Joomla** une fois les boîtes
   mail sécurisées.
8. Points de confort : ajouter `X-Frame-Options: DENY`, arbitrer le sort
   de `.env.example`, et ne soumettre le domaine à la liste HSTS preload
   qu'en connaissance de l'engagement que cela représente.

---

# Ajout du 18/08 : espace de gestion privé

L'espace `/gestion` ajoute au site sa première surface authentifiée. Cette
section complète l'audit du 17/08 plutôt que de la laisser dans un corps
de demande de fusion, où elle n'aurait servi qu'une fois.

## Ce qui protège l'espace

- **Authentification par lien signé**, HMAC-SHA256, valable 15 minutes,
  puis cookie de session signé, `HttpOnly`, `SameSite=Lax`, `Secure` en
  production, 7 jours. Aucun mot de passe, donc rien à voler, à réutiliser
  ailleurs ni à faire tourner en force brute.
- **Liste blanche d'adresses** en variable d'environnement, relue à chaque
  vérification de jeton : retirer une adresse coupe l'accès immédiatement,
  même cookie en cours.
- **Aucune énumération possible.** La demande de lien rend le même corps
  et le même code qu'une adresse soit autorisée ou non, y compris quand
  l'envoi du courriel échoue. Le premier jet renvoyait 200 pour une
  adresse inconnue et 502 pour une adresse autorisée dont l'envoi avait
  échoué : le code HTTP suffisait alors à dresser la liste des
  administrateurs. Corrigé, et vérifié en permanence par le harnais, qui
  compare les deux réponses.
- **Secret court refusé** : sous 32 caractères, l'espace ne se sert pas du
  tout, plutôt que de se protéger mal.
- **Contrôle de session en première ligne** de chaque route de données, et
  vérification permanente que ces routes répondent 401 sans cookie.
- **Jeton GitHub à portée fine** sur ce seul dépôt, trois permissions,
  jamais servi au client. Le harnais relit à chaque exécution les scripts
  réellement servis, pages publiques et page de gestion, et échoue si un
  nom de secret y apparaît.
- **Aucune écriture sur la branche par défaut** : tout geste passe par une
  branche puis une demande de fusion relue. C'est aussi ce qui rend
  l'espace inoffensif en cas de session volée : au pire, une proposition
  de modification à refuser.

## Faiblesses assumées, et pourquoi

- **Pas de révocation d'une session isolée.** Sans base de données, la
  seule révocation est la rotation de `SESSION_SECRET`, qui déconnecte
  tout le monde. Acceptable pour deux ou trois administrateurs, et c'est
  le geste à faire si un téléphone connecté est perdu. Documenté dans
  `docs/GESTION.md` et `docs/GO-LIVE.md`.
- **Lien de connexion réutilisable pendant 15 minutes.** Un lien
  intercepté dans cette fenêtre ouvre une session. Le rendre à usage
  unique demanderait un stockage d'état, donc une base : la fenêtre courte
  est le compromis retenu.
- **Limitation de débit toujours en mémoire.** Le constat du point 4 de
  l'audit vaut pour `/api/gestion/lien` comme pour les formulaires
  publics : la borne du code ne garantit rien de distribué. Les règles de
  pare-feu à poser sont listées dans `docs/GO-LIVE.md`, et cette route est
  la seule de l'espace ouverte sans session, donc la seule à mériter une
  règle stricte.
- **Le chemin `/gestion` n'est pas un secret.** Il n'est publié nulle
  part, mais la sécurité ne repose pas là-dessus : elle repose sur
  l'authentification. Il n'est volontairement pas déclaré dans
  `robots.txt`, qui est public et le révélerait ; l'effet voulu est obtenu
  par l'en-tête `X-Robots-Tag: noindex, nofollow, noarchive`.

## Ce que cet ajout change aux recommandations du 17/08

Le point 4 gagne une raison de plus d'être traité, et une cible
supplémentaire : `/api/gestion/lien`. Le point 8, qui demandait d'arbitrer
le sort de `.env.example`, est tranché : le gabarit est désormais
versionné, sans aucune valeur, parce que son absence faisait échouer le
harnais sur tout clone neuf.
