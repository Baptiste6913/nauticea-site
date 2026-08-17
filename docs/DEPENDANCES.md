# Dépendances : politique et décisions

Dependabot ouvre une PR par montée majeure et regroupe les mineures et
correctives. Ce fichier garde la trace des décisions prises sur les majeures,
avec la preuve qui les fonde et la condition de réexamen. Sans cette trace, la
même PR revient chaque semaine et se refait juger sans mémoire.

## Règles

1. Versions épinglées exactement dans `package.json`, sans `^` ni `~`. Le
   fichier `package-lock.json` est suivi en versionnement.
2. Une majeure n'est acceptée qu'après passage des quatre portes locales :
   `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run verifier`.
   Le harnais construit réellement le site, c'est la porte qui compte.
3. `@types/node` suit la majeure de l'exécution réellement utilisée, jamais la
   dernière publiée. Des types plus récents que l'exécution décrivent des API
   absentes à l'exécution : le typage passe, le site casse. Des types plus
   anciens ne font que masquer des API récentes, ce qui est sans danger.
4. Aucune règle `ignore` dans `.github/dependabot.yml` pour une majeure
   refusée. Le refus est documenté ici, la PR revient, et c'est ainsi qu'on
   voit le jour où le blocage amont est levé.

## Exécution de référence

Aucun champ `engines`, aucun `.nvmrc`, aucun `.node-version` dans le dépôt. La
seule version de Node déclarée est `node-version: 22` dans
`.github/workflows/sync-feed.yml`. L'environnement de développement tourne en
`v22.22.2`. La référence est donc Node 22.

Point à trancher par l'exploitant : déclarer explicitement l'exécution, par
`engines` ou `.nvmrc`, rendrait la référence opposable au build Vercel. Ce
n'est pas fait ici, car cela changerait la configuration de build d'un site en
production, ce qui mérite sa propre vérification.

## Décisions du 17/08

### Acceptée, `@types/node` 20.19.43 vers 22.20.1

La version installée, 20, était en retard sur l'exécution, 22. Dependabot
proposait 26.2.0 (PR #25) : refusé, car ce sont les types de Node 26 alors que
l'exécution est Node 22, exactement le cas décrit par la règle 3. La montée
retenue aligne les types sur l'exécution.

Vérifié : `tsc --noEmit` sortie 0, `npm run lint` sortie 0, 26 tests sur 26,
harnais `npm run verifier` sortie 0, statut OK, 44 routes, 717 liens internes,
945 images, 48 redirections.

### Refusée pour l'instant, TypeScript 5.9.3 vers 7.0.2 (PR #24)

Le typage passe, mais `npm run lint` ne démarre plus du tout :

```
typescript-eslint does not support TS 7.0.
Please see ... to run typescript-eslint using the TS 6 API.
```

`@typescript-eslint/parser`, embarqué par `eslint-config-next` 16.3.1, déclare
la plage `typescript >=4.8.4 <6.1.0`. Perdre le lint pour gagner une majeure de
compilateur est un mauvais échange.

Réexamen quand `eslint-config-next` embarquera un `typescript-eslint`
compatible TS 7. Suivi amont : typescript-eslint, question 10940.

### Refusée pour l'instant, ESLint 9.39.5 vers 10.8.1 (PR #26)

Le lint plante à la première page analysée :

```
TypeError: Error while loading rule 'react/display-name':
contextOrFilename.getFilename is not a function
  at resolveBasedir (node_modules/eslint-config-next/node_modules/
    eslint-plugin-react/lib/util/version.js)
```

ESLint 10 a retiré l'API de contexte historique que l'`eslint-plugin-react`
embarqué par `eslint-config-next` 16.3.1 appelle encore. Le blocage est en
aval de nous : rien à corriger dans ce dépôt.

Réexamen quand `eslint-config-next` embarquera un `eslint-plugin-react`
compatible ESLint 10.

## Décisions du 17/08 sur les actions

Traitées à part, dans `.github/workflows/`, et validées par une exécution
réelle sur runner plutôt que sur lecture de notes de version :
`actions/checkout` v4 vers v7.0.1, `actions/setup-node` v4 vers v7.0.0. Toute
référence d'action doit porter un condensat de commit de 40 hexadécimaux, ce
que le contrôle 6c du harnais impose.
