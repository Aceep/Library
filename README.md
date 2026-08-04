# Médiathèque — front

Interface de la médiathèque partagée, branchée sur l'API `bibliotheque-back`.
React 18 + TypeScript + Vite, TanStack Query et CSS Modules. Tout est en
français, sans i18n.

## Démarrer

Le projet exige **Node 20** (voir `.nvmrc`). Vite 5 et `openapi-typescript` ne
tournent pas sur les versions antérieures.

```bash
nvm use            # ou : export PATH=$HOME/.nvm/versions/node/v20.19.0/bin:$PATH
npm install
npm run dev        # http://localhost:5173
```

Comptes de développement : `alice` / `alice-dev-password`,
`bob` / `bob-dev-password`.

## Le proxy n'est pas optionnel

L'adresse de l'API **n'apparaît qu'à un seul endroit**, `vite.config.ts` :

```ts
const API = process.env.VITE_API_TARGET ?? 'http://192.168.86.219:3000'
```

Tout le code appelle des chemins relatifs (`/api/...`), jamais une adresse. Le
proxy relaie `/api` et `/covers` vers le back.

C'est structurel, pas cosmétique : le cookie de session `mediatheque_session`
est en `SameSite=Lax`. En appel direct depuis un autre port, **la connexion
réussit puis tout répond `401`** sans que rien ne l'explique. Si ce symptôme
apparaît, c'est le proxy qu'il faut regarder, pas l'authentification.

### Quand l'adresse de l'API change

Le back tourne sur une machine de l'équipe, dont l'IP bouge. Symptôme : les
appels échouent en `500` côté navigateur, et le **terminal Vite** — pas la
console du navigateur — affiche :

```
[vite] http proxy error: /health
Error: connect EHOSTUNREACH 192.168.86.219:3000
```

Deux remèdes :

```bash
# 1. nouvelle adresse, sans toucher au fichier
VITE_API_TARGET=http://<nouvelle-ip>:3000 npm run dev

# 2. durablement : changer l'unique ligne de vite.config.ts
```

Repli local complet, si la machine est éteinte :

```bash
cd ../bibliotheque-back && cp .env.example .env
docker compose --profile full up -d --build
cd -
VITE_API_TARGET=http://localhost:3000 npm run dev
```

## Types générés depuis le contrat

`src/api/types.ts` est **généré**, jamais édité à la main :

```bash
npm run types      # openapi-typescript ../bibliotheque-back/docs/openapi.json
```

Quand le contrat du back bouge, cette commande met les types à jour et la
compilation signale ce qui ne colle plus. C'est le mécanisme qui garde le front
honnête vis-à-vis de l'API — il a déjà rattrapé plusieurs suppositions fausses.

## Ce que le back impose

Ces règles ne sont pas des préférences de style : les enfreindre produit des
erreurs, ou des affichages faux.

| Règle | Conséquence dans le code |
|---|---|
| `status` ne s'écrit pas sur `tv` ni `comic_series` | Il est **dérivé** des épisodes et tomes cochés. Le sélecteur de statut n'existe pas pour ces types (`isDerivedStatusType`). Écrire quand même vaut `400`. |
| `user_id` ne s'envoie jamais dans un corps d'écriture | `403` systématique. `TrackingPatch` ne comporte pas le champ : il est inexprimable. |
| Rien ne se recalcule côté client | Toute écriture renvoie l'agrégat recalculé. `src/api/cache.ts` ne fait que le ranger. |
| Les curseurs sont opaques | On s'arrête sur `next_cursor === null`, **jamais** sur `items.length < limit`. |
| `progress.total` peut valoir `0` | `progressRatio` renvoie `null` et la barre disparaît, au lieu d'un `NaN`. |
| Les scalaires sont nullables, les listes toujours présentes | Chaque champ vide s'efface au lieu d'afficher un intitulé creux. |
| `completed_at` ne s'efface jamais | C'est une trace, pas un statut. Affiché comme « déjà terminé une fois ». |
| `next_up` vaut `null` quand tout est vu | Le bouton « Reprendre » est **masqué**, pas désactivé. |
| Les messages d'erreur sont déjà en français | `{ code, message, retryable }` — `message` est affiché **tel quel**, sans catalogue par-dessus. |
| Les `503` ne concernent que la recherche externe | Dégradation sur place dans l'onglet, jamais de page d'erreur globale. |
| `POST /media` → `created: false` n'est pas une erreur | L'ajout est idempotent : on ouvre la fiche dans les deux cas, sans message de doublon. |
| `cover_url` ment souvent | Nulle, ou pointant vers une image absente. Le repli de `Cover` réagit aussi à l'échec de chargement. |
| Les écritures par lot existent | `PUT /episodes/batch` (`scope: season` / `until`) plutôt que N requêtes. |

## Organisation

```
src/
  api/        types.ts (généré), schema.ts (alias + libellés FR),
              client.ts (fetch + ApiError), endpoints.ts (un appel par route),
              keys.ts (clés de cache), cache.ts (rangement des agrégats)
  session/    SessionContext.tsx
  components/ AppShell, Cover, ProgressBar, StatusBadge, TrackingPanel,
              MediaMetadata, SeasonList, VolumeGrid, ErrorNotice, EmptyState
  pages/      Login, Dashboard, TypeLibrary, MediaDetail, Search, Compare,
              ComingSoon
  styles/     tokens.css, global.css
```

`src/session/SessionContext.tsx` est **le point unique** où vit l'hypothèse
« il y a un partenaire ». Les écrans passent par `partners` (une liste) ; le
jour où le back gère plus de deux comptes, c'est le seul fichier à reprendre.

## Sections en attente

Music History et Quests figurent dans la navigation et affichent un écran
« bientôt disponible ». Ces deux domaines sont en cours de développement côté
API, comme le passage à plus de deux comptes. **Aucune donnée fictive** n'est
affichée en attendant.

## Vérifications

```bash
npm run lint       # zéro avertissement toléré
npm run build      # tsc --noEmit puis vite build
```

Deux règles ESLint sont désactivées volontairement :
`react/no-unescaped-entities` (l'interface est en français, les apostrophes sont
partout) et `react-refresh/only-export-components` (co-localiser un contexte et
ses hooks est l'idiome React usuel). `src/api/types.ts` est exclu du lint
puisqu'il est généré.
