# Rapport final : session unique vers l'état publiable

Date : 2026-08-15. Branche `claude/nauticea-finale` depuis `main`
(`d6bdc78`). Toutes les preuves ci-dessous sont datées du 2026-08-15,
issues du harnais `npm run verifier` (verification.json committé), de
Lighthouse 12 (émulation mobile) et du balayage navigateur.

## Definition of done, cochée point par point

1. **Polarité claire appliquée partout, carrousel en accueil, titre
   centré, budgets tenus : FAIT.** Fonds blanc/écume, encre marine,
   filigrane 4-8 %, footer abysse unique ancrage sombre, header clair,
   scène WebGL retirée, dérive CSS coupée par reduced-motion (DA.md,
   section « Polarité inversée, décision client du 15/08 »).
   Carrousel Embla 8.6.0 (MIT, épinglé), titre et eyebrow centrés, H1
   inchangé au caractère près, CTA sous le titre. Budgets : table
   ci-dessous.
2. **Aucune page vide dans la navigation ni le sitemap, URLs
   préservées : FAIT.** Inventaire ci-dessous ; vérifié par le harnais
   (pages masquées servies en 200, absentes du sitemap et de
   l'accueil).
3. **Formulaire de conversion opérationnel dès le merge en mode
   mailto, automatique dès les variables d'env : FAIT.** `/projet`
   rendu en mode mailto sans variable (« Envoyer par email », corps
   pré-rempli complet), bascule automatique sur `/api/projet` (Resend)
   quand `RESEND_API_KEY` + `CONTACT_TO_EMAIL` existent. Blocs d'appel
   sur l'accueil, le hero et chaque fiche (pré-remplie).
4. **SEO et GEO au maximum du code, le reste identifié hors code :
   FAIT.** Détail en W4 ; hors code : bascule DNS avec 301, Search
   Console, fiche Google, notoriété locale (GO-LIVE.md).
5. **Surface durcie : FAIT.** Headers (HSTS, nosniff, Referrer-Policy,
   Permissions-Policy, CSP stricte, frame-ancestors none), routes API
   validées et limitées, `npm audit` 0 vulnérabilité, lockfile
   committé, versions épinglées à l'exact.
6. **Qualité prouvée par `npm run verifier` : FAIT.** Exit 0 ;
   44 routes, 710 liens internes, 944 images, 48 redirections 301,
   unicité des title et description, canonicals, JSON-LD, chaînes
   interdites, pages masquées, en-têtes. Exit non nul au moindre échec
   (vérifié en cours de session : le harnais a détecté ses propres
   motifs avant son auto-exclusion).
7. **docs/GO-LIVE.md et docs/FLUX.md livrés : FAIT.** Checklists
   pas-à-pas : bascule IONOS/Vercel/Resend avec MX intouchés et
   rollback ; message prêt à envoyer par Bruno pour l'URL du flux,
   activation du workflow, critères de validation du premier run.

Il ne manque donc au site que les deux éléments hors code annoncés :
l'URL du flux Boats Group (Bruno) et la zone DNS (IONOS).

## W0-W1 : polarité et hero

- Tokens et rôles documentés dans DA.md ; contrastes AA revérifiés
  (accessibilité Lighthouse 100 sur les 5 pages mesurées).
- Carrousel : swipe (Embla), flèches, points (cibles 24 px), autoplay
  6 s avec pause au survol, au toucher et au focus ; reduced-motion :
  image fixe + navigation manuelle (vérifié au navigateur : index
  stable sur 7 s, 16/16 routes sans masque ni canvas).
- CLS 0 partout ; LCP = première diapo (`priority` sur elle seule).
- Poids ajouté par le carrousel : +6,0 Ko gzip sur l'accueil
  (187,2 Ko contre 181,2 Ko avant, scripts réellement servis mesurés ;
  la scène WebGL différée de 2,2 Ko disparaît en contrepartie).

## W2 : inventaire des pages

| Page | État factuel | Décision |
|---|---|---|
| /annonces/voiliers | 0 annonce | hors nav (déjà) et hors sitemap ; URL servie (cible 301), état vide propre |
| /annonces/catamaran | 1 annonce | conservée |
| /stock-neuf | 9 annonces neuves | conservée |
| /occasions | 19 annonces | conservée |
| /actualites | 2 actus avec contenu réel sur 4 | liste et sitemap réduits aux 2 réelles |
| /actualites/sealine-s430-la-visite et /actualites/sealine-c335 | titre seul (vidéos exclues en amont) | hors liste et sitemap, noindex, URL servie avec état propre |
| /gamme-neuve | aucun contenu constructeur (pas de kit média) | squelette derrière `NEXT_PUBLIC_GAMME_NEUVE=1`, 404 sinon, hors nav et sitemap |

Fraîcheur du stock : l'actualisation automatique (annonces et photos)
est la Phase B, flux Boats Group via `sync-feed.yml` déjà livré
inactif ; aucun code de cette session ne rafraîchit le stock.

## W3 : conversion

Champs : nature (achat neuf, achat occasion, vente ou reprise), type
recherché (optionnel), tranche de budget, horizon, nom, téléphone,
email, message optionnel. RGPD sous le bouton, relié aux mentions
légales. Mentions légales : hébergeur Vercel Inc. (coordonnées
publiées), section données personnelles ; paragraphe 1&1 obsolète
retiré ; coordonnées de l'éditeur inchangées (corpus).
Anti-abus : honeypot, délai minimal 4 s, débit 5 requêtes / 10 min par
IP en fenêtre glissante (état par instance serverless : borne réelle,
pas une garantie distribuée), Turnstile optionnel derrière variables
d'env, désactivé par défaut, CSP à étendre si activé (documenté).
Expéditeur : nauticeayachting.fr exclusivement, SPF/DKIM post-IONOS.

## W4 : SEO avant/après

| Point | Avant | Après |
|---|---|---|
| Sitemap | 46 URLs dont pages vides | 44 URLs, aligné sur le contenu réel |
| Pages vides indexables | voiliers + 2 actus vides | noindex + hors sitemap, URLs servies |
| llms.txt | 5 liens | navigation réelle complète (9 liens + email) |
| Maillage accueil | annonces seules | + catégories avec stock, projet |
| Titles/descriptions | non prouvés uniques | unicité prouvée par harnais |
| Canonicals, OG par annonce, BreadcrumbList, alt | présents | vérifiés par harnais |

Hors code (assumé) : bascule du domaine avec les 301, Search Console,
fiche d'établissement Google, notoriété locale.

## W5 : durcissement

Headers servis vérifiés par le harnais. CSP : `default-src 'self'`,
aucune source externe ; compromis documenté : `'unsafe-inline'` sur
script-src et style-src (pages statiques sans nonce par requête, les
scripts d'amorçage Next sont inline). `npm audit` : 0 vulnérabilité.
Périmètre honnête : la principale exposition du domaine reste l'ancien
Joomla en ligne, hors repo, traité par GO-LIVE.md (étape extinction).

## W8 : mesures finales (2026-08-15)

### Lighthouse mobile

| Page | Perf | Access | BP | SEO | CLS | Plancher perf |
|---|---|---|---|---|---|---|
| Accueil | 90 | 100 | 100 | 100 | 0 | >= 85 |
| Liste annonces | 94 | 100 | 100 | 100 | 0 | >= 90 |
| Détail annonce | 93 | 100 | 100 | 100 | 0 | >= 90 |
| Projet | 99 | 100 | 100 | 100 | 0 | (aucun) |
| Contact | 97 | 100 | 100 | 100 | 0 | (aucun) |

(Le seul écart rencontré en session : cibles de 10 px des points du
carrousel, corrigées en 24 px, accessibilité revenue à 100.)

### npm run verifier (sortie finale)

```text
verification.json écrit : OK (0 échec)
{
 "routes_sitemap": 44,
 "liens_internes_verifies": 710,
 "images_verifiees": 944,
 "redirections": 48,
 "fichiers_sources_scannes": 60
}
```

### Reduced-motion

16/16 routes : zéro canvas, zéro contenu masqué, carrousel sans
autoplay (index stable sur 7 s), navigation manuelle intacte.

### Screenshots

`design/qa/session-finale/avant/` (28, état sombre) et
`design/qa/session-finale/apres/` (30, état clair, /projet inclus),
desktop et mobile.

## NON VÉRIFIÉ

- Envoi Resend réel de bout en bout (aucune clé en session ; le
  câblage est testé, le test réel est l'étape 5 de GO-LIVE.md).
- Appareils réels et Save-Data en conditions réelles (préview Vercel).
- Comportement DNS/emails le jour de la bascule (checklist GO-LIVE.md,
  MX recopiés avant tout).

## Questions ouvertes

1. L'URL du flux Boats Group : demande à envoyer par Bruno
   (docs/FLUX.md, message prêt).
2. La zone DNS IONOS : récupération d'accès, puis docs/GO-LIVE.md.
3. Turnstile : à activer seulement si du spam passe l'anti-abus de
   base (variables documentées dans .env.example).

STOP.
