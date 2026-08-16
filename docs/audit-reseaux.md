# Audit des liens réseaux sociaux, 16/08/2026

Audit demandé par la directive consolidation suite au retour de Bruno.
Méthode : inventaire code, historique et prod, puis vérification de
chaque URL avec chaîne de redirections, en user-agent desktop puis
mobile, capture du statut final, de l'URL finale, du title et des
métadonnées Open Graph.

## Inventaire

| Source | Facebook | Instagram |
|---|---|---|
| Code `main` (`lib/site.ts:22-23`) | `https://www.facebook.com/nauticea/` | `https://www.instagram.com/nauticeayachting/` |
| Site historique (`corpus-nauticea/raw/*.html`) | identique | identique |
| Prod `https://nauticea-site.vercel.app` (rendu servi) | identique | identique |

Aucun écart entre code, historique et prod : les URLs viennent du
footer du site d'origine, inchangées depuis.

## Vérification lien par lien

| Lien | UA | Redirections | Statut final | URL finale | Constat |
|---|---|---|---|---|---|
| facebook.com/nauticea/ | desktop | 1 | 200 | `facebook.com/login/?next=...nauticea` | title « Facebook », og:title « Log in or sign up to view » : mur de connexion, aucun nom de page visible |
| facebook.com/nauticea/ | mobile | 1 | 200 | `m.facebook.com/login/?next=...nauticea` | title « Log into Facebook » : mur de connexion |
| instagram.com/nauticeayachting/ | desktop | 0 | 200 | inchangée | title « Instagram » générique, aucune métadonnée de profil (coquille JS, profil non exposé sans session) |
| instagram.com/nauticeayachting/ | mobile | 1 | 429 | `instagram.com/accounts/login/?next=...` | mur de connexion + limitation de débit |

## Verdicts

- **Facebook `/nauticea/` : invérifiable** (mur de connexion sur les
  deux passes ; la page peut exister comme ne pas exister ou appartenir
  à un tiers, rien ne le prouve de l'extérieur).
- **Instagram `/nauticeayachting/` : invérifiable** (aucune métadonnée
  de profil exposée, mur de connexion en mobile).

Aucun des deux liens n'apporte la preuve positive « la destination
affiche Nauticea Yachting ».

## Action appliquée

Conformément à la règle « destination autre ou invérifiable » :

- retrait des liens Facebook et Instagram de tout le site (footer,
  page contact, `sameAs` du JSON-LD de l'accueil) ;
- centralisation dans `lib/config/reseaux.ts` avec valeurs `null` et
  commentaire de réactivation : dès que Bruno confirme les URLs
  officielles, une seule ligne à remplir et tout revient (footer et
  JSON-LD lisent cette source unique).

## Hypothèse d'écart (pourquoi Bruno a pu voir autre chose)

Constats factuels possibles, sans certitude sur ce que Bruno a testé :

- **Test sur l'ancien site** : `nauticeayachting.fr` en ligne porte les
  mêmes liens ; un clic là-bas aboutit au même endroit, l'écart ne
  viendrait alors pas du nouveau site.
- **Ouverture dans l'app connectée** : sur téléphone, Facebook et
  Instagram s'ouvrent dans l'app avec un compte connecté ; une page
  supprimée, renommée ou en revue s'y présente autrement que pour un
  visiteur anonyme (nos passes anonymes ne voient qu'un mur de
  connexion).
- **Handle recyclé** : `/nauticea/` est un nom court ; si la page
  d'origine a été supprimée, le handle a pu être repris par un tiers.
  Invérifiable sans session, d'où le retrait par précaution.

## Source de vérité finale

Les URLs officielles confirmées par Bruno (ou sa confirmation
d'abandon) restent la décision finale ; ce document et
`lib/config/reseaux.ts` s'alignent dessus dès réception.
