# Déploiement — état des lieux

**Aucun de ces fichiers n'est actif.** Ils ne sont pas dans
`.github/workflows/` et ne se déclenchent donc jamais. Ils sont conservés ici
parce qu'ils portent des décisions qu'il serait dommage de réinventer, pas
parce qu'ils sont prêts à servir.

Le seul workflow actif est `.github/workflows/ci.yml` : lint et build sur
`main` et sur les propositions de fusion. Il ne déploie rien.

## Pourquoi ils sont inactifs

Trois raisons, chacune suffisante :

1. **Les branches ont disparu.** Ils se déclenchent sur `preprod` et
   `production`, supprimées en même temps que l'ancien front.
2. **Railway est abandonné.** Les trois passent par `railway up`, et
   l'hébergement doit changer.
3. **Node 18 y est codé en dur**, alors que le projet exige Node 24
   (`engines`, `.nvmrc`).

## Ce que chacun faisait

| Fichier | Rôle |
|---|---|
| `deploy-railway.yml` | Déployait le front sur push vers `production` |
| `promote-preprod-to-production.yml` | Promotion manuelle, avec approbation via l'environnement GitHub `production` |
| `smoke-and-rollback.yml` | Après un déploiement : appel HTTP sur `PROD_URL`, et **revert automatique** du commit fautif en cas d'échec |

Le troisième mérite un regard avant d'être réactivé : il pousse un `git revert`
sur `production` sans intervention humaine. C'est un filet réel, mais qui agit
seul sur une branche de production — à n'accepter qu'en connaissance de cause.

## Ce qu'il faudrait pour les réactiver

- Choisir l'hébergement, et remplacer l'étape Railway en conséquence.
- Recréer les branches de déploiement, ou déclencher depuis `main` avec des
  environnements GitHub.
- Passer `node-version` à `node-version-file: .nvmrc` comme le fait déjà
  `ci.yml` — coder la version en dur est précisément ce qui a rendu `main`
  rouge le 5 août.
- Reposer les secrets : `RAILWAY_*` disparaissent, `PROD_URL` et `PAT`
  subsistent si le test de fumée est conservé.

Un point d'architecture qui vaut d'être tranché avant tout le reste : le cookie
de session est en `SameSite=Lax`. Front et back sur deux domaines distincts
donnent une connexion qui réussit puis des `401` partout. Servir le `dist/`
depuis le back, ou proxifier `/api` côté hébergeur du front, évite le problème
plutôt que d'avoir à le contourner.
