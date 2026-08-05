# Médiathèque — front

Interface de la médiathèque partagée, branchée sur l'API `bibliotheque-back`
(dépôt voisin, cloné en `../biblio-back`).
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

Comptes de développement : `alice` / `alice-dev-password` (rôle `admin`),
`bob` / `bob-dev-password`. L'instance de démo compte aussi `camille`, `dan` et
`elior`.

## Le proxy n'est pas optionnel

L'adresse de l'API **n'apparaît qu'à un seul endroit**, `vite.config.ts` :

```ts
const API = process.env.VITE_API_TARGET ?? 'http://localhost:3000'
```

Tout le code appelle des chemins relatifs (`/api/...`), jamais une adresse. Le
proxy relaie `/api` et `/covers` vers le back.

C'est structurel, pas cosmétique : le cookie de session `mediatheque_session`
est en `SameSite=Lax`. En appel direct depuis un autre port, **la connexion
réussit puis tout répond `401`** sans que rien ne l'explique. Si ce symptôme
apparaît, c'est le proxy qu'il faut regarder, pas l'authentification.

### Viser une API qui tourne ailleurs

Le défaut est `http://localhost:3000` — la seule adresse qui ne se démode pas.
Si le back tourne sur une autre machine, son IP se donne par variable :

```bash
VITE_API_TARGET=http://<adresse>:3000 npm run dev
```

Ou une fois pour toutes dans `.env.local`, qui n'est pas versionné. **Ne
remets pas d'IP dans `vite.config.ts`** : celle qui s'y trouvait a fini par
désigner une machine qui n'existait plus, et un défaut faux coûte plus qu'un
défaut restrictif — l'application démarre, se connecte même, puis échoue
partout sans dire pourquoi.

Symptôme d'une adresse morte : les appels échouent côté navigateur et le
**terminal Vite** — pas la console — affiche :

```
[vite] http proxy error: /health
Error: connect EHOSTUNREACH 192.168.86.219:3000
```

Repli local complet, si la machine est éteinte :

```bash
cd ../biblio-back && cp .env.example .env
docker compose --profile full up -d --build
cd -
npm run dev
```

## Le contrat, vendorisé

`contract/openapi.json` est une **copie** du contrat du back, versionnée ici.
`src/api/types.ts` en est engendré, et n'est jamais édité à la main.

```bash
npm run contract:pull   # récupère le contrat du back, puis régénère les types
npm run types           # régénère seulement, depuis la copie locale
npm run types:check     # échoue si les types ne correspondent plus au contrat
```

Pourquoi une copie plutôt qu'une lecture directe : le back est un dépôt
**privé et séparé**, que la CI d'ici ne peut pas lire sans secret. La copie
rend le dépôt autonome — il compile et se teste sans le back sous la main — et
transforme chaque évolution du contrat en un diff qu'on relit dans la PR au
lieu d'un changement invisible.

`contract:pull` cherche le back dans `../biblio-back`, surchargeable :

```bash
BACK_REPO=~/ailleurs/bibliotheque-back npm run contract:pull
```

`types:check` tourne en CI et ferme deux dérives : un `types.ts` édité à la
main, et un contrat mis à jour sans régénération. Il ne peut pas voir que la
copie a pris du retard sur le back — c'est `contract:pull` qui s'en charge, et
la revue qui lit ce qu'il rapporte.

### Le vocabulaire vient de l'API, pas d'ici

`GET /reference/statuses` donne, par type d'œuvre, les statuts acceptés dans
l'ordre, **leur libellé rédigé**, et si le statut est dérivé. Chargé une fois
au démarrage, en même temps que la session, et servi par `useReference()`.

```tsx
const { statusesOf, statusLabel, isDerivedStatusType } = useReference()
```

Deux règles étaient auparavant recopiées ici, faute d'être des champs de
réponse : qu'un album n'a que deux états, et qu'une série voit son statut
recalculé. Le front s'est trompé exactement comme il fallait s'y attendre — il
proposait « en cours » sur un album, refusé en `400`. **Ne réintroduisez pas de
table de statuts.**

Seule exception, `crossTypeStatusLabel` : un filtre qui porte sur une
bibliothèque entière mêle livres et films, et aucun libellé accordé n'y a de
sens. Ce n'est pas une copie de la règle, c'est le vocabulaire d'un cas que
l'API ne modélise pas — faute d'un type auquel l'accorder.

## Le modèle : tout est public, l'abonnement trie

Il n'y a **pas de partenaire**. N'importe qui peut avoir un compte, sur
invitation, et chacun voit tout — l'abonnement ne protège rien, il décide de ce
qui remonte.

Concrètement, chaque œuvre arrive sous cette forme :

```
tracking: {
  me,                          mon suivi, nul si je ne suis pas l'œuvre
  following: [{ user, tracking }],   les comptes que je suis, nommés
  others: { count, average_rating }  les autres, comptés et moyennés
}
```

Trois conséquences qui structurent l'interface :

- **Les abonnements sont nommés, les autres résumés.** Un rayon reste lisible ;
  l'API ne déballe pas les identités de tout le monde, et l'écran ne prétend
  pas les connaître.
- **Sur les épisodes et les tomes, il n'y a qu'un compteur** (`watched.others`,
  `tracking.others`) — d'où le « +N » plutôt que des pastilles nominatives. Les
  identités sont derrière `/episodes/:id/watchers` et `/volumes/:id/trackers`,
  qu'on ne demande pas ligne par ligne.
- **`/compare` exige un `user_id`.** Plus de comparaison par défaut : l'écran
  propose les comptes suivis.

Un compte neuf ne suit personne : son accueil serait vide sans le fait que
**l'inscription abonne d'office à l'invitant**.

## Ce que le back impose

Ces règles ne sont pas des préférences de style : les enfreindre produit des
erreurs, ou des affichages faux.

| Règle | Conséquence dans le code |
|---|---|
| `status` ne s'écrit pas sur `tv` ni `comic_series` | Il est **dérivé** des épisodes et tomes cochés. Le sélecteur n'existe pas pour ces types — `useReference().isDerivedStatusType`, lu chez l'API. Écrire quand même vaut `400`. |
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
| `cover_url` ment souvent | Nulle, ou pointant vers une image absente. `Cover` réagit aussi à l'échec de chargement. |
| Les écritures par lot existent | `PUT /episodes/batch` (`scope: season` / `until`) plutôt que N requêtes. |
| `DELETE /media/:id` est **réservé aux administrateurs** | `403` pour les autres. Le geste n'est proposé qu'au rôle `admin` ; « retirer de ma bibliothèque » reste ouvert à tous. |
| `identity_color` est **libre**, sans unicité | Deux membres peuvent partager une teinte, alors qu'elle seule les distingue. `/mon-compte` prévient quand le choix se rapproche d'un compte suivi, sans jamais l'interdire. |
| Un jeton d'invitation invalide ne dit **jamais** pourquoi | Expiré, révoqué, consommé ou inventé donnent la même réponse. Ne pas inventer de message plus précis. |
| `POST /admin/invitations` renvoie `url: null` | Tant que `PUBLIC_APP_URL` n'est pas configurée côté serveur. Le front compose alors le lien depuis sa propre adresse. |
| `DELETE /admin/users/:id` exige `confirm_pseudo` | Le pseudo exact, sinon `400` sans rien supprimer — pour qu'un clic sur la mauvaise ligne n'efface personne. |
| Les comptes désactivés ne se masquent pas | Hors annuaire par défaut, mais leurs critiques restent sur les fiches et leur restent attribuées. Mention discrète, jamais un effacement. |
| **L'attribution à TMDB et à JustWatch est obligatoire** | Ce sont des **conditions d'utilisation de l'API TMDB**, pas des politesses : un manquement leur donne le droit de couper la clé, donc les films, les séries **et toutes les jaquettes**. La mention TMDB et leur logo sont dans `/a-propos`, joignable depuis le pied de page. Celle de JustWatch doit accompagner **chaque** œuvre dont on affiche les plateformes : elle est rendue depuis `attribution`, dans la donnée, et n'apparaît donc jamais sans elle. |
| `availability` est nul très souvent, et ce n'est pas une erreur | La fiche ne passe **jamais** d'appel sortant : elle sert le bloc depuis le cache seul. Sur cache froid il vaut `null`, et c'est `GET /media/:id/availability` qui va chercher. Cache froid, aucune plateforme dans le pays, ou source injoignable : trois cas, une réponse `200`, aucun écran d'erreur. |
| Passer une œuvre à `done` crée l'entrée de journal **toute seule** | Y compris quand le statut est dérivé — cocher le dernier épisode journalise. D'où la clé `log` préfixée par celle de la fiche : invalider `media(id)` emporte le journal. |
| La note d'une entrée de journal remonte au suivi **si l'entrée est la plus récente** | L'inverse n'existe pas : corriger la note de l'œuvre ne réécrit pas l'histoire. Chaque écriture de journal renvoie donc le suivi recalculé, qu'on range tel quel. |
| `favorite` s'écrit sur **les six types**, `status` non | Le coup de cœur n'a rien à voir avec ce qui est coché, ni avec la note. Affiché comme un signe distinct, jamais comme un seuil de note. |
| Un album n'a que **deux états** | `todo` et `done`, jamais `doing` : le back refuse le troisième en `400`. L'interface ne le propose donc ni dans le panneau de suivi, ni dans les filtres d'un rayon de musique. Rien de tout ça n'est écrit ici : `GET /reference/statuses` le dit. |
| `PUT /me/showcase` **remplace** la vitrine entière | Ni ajout, ni retrait : l'éditeur travaille sur un brouillon local et n'écrit qu'une fois. Les refus sont complets — rien n'est écrit à moitié. |
| Sur `GET /users/:id/media`, `status`, `owned` et `favorite` portent sur **son** suivi à lui | Seul endroit de l'API où ces filtres changent de sujet. L'écran le rappelle en toutes lettres, sans quoi on filtre « en cours » en croyant voir le sien. |

## Organisation

```
contract/     openapi.json — la copie du contrat du back (voir plus haut)
src/
  api/        types.ts (engendré), schema.ts (alias + libellés FR + règles
              de statut), client.ts (fetch + ApiError), endpoints.ts (un appel
              par route), keys.ts (clés de cache), cache.ts (rangement des
              agrégats), colors.ts (distance perceptuelle des identités)
  session/    SessionContext.tsx — qui je suis, et `isAdmin`
  reference/  ReferenceContext.tsx — les statuts par type, et leurs libellés
  components/ AppShell, AppFooter, Cover, MediaCard, ProgressBar, StatusBadge,
              TrackingPanel, MediaMetadata, MediaLog, Availability, SeasonList,
              VolumeGrid, Showcase, MemberLibrary, FollowButton, IdentityDot,
              ErrorNotice, ErrorBoundary, EmptyState
  pages/      Login, Dashboard, TypeLibrary, MediaDetail, Search, Compare,
              Members, UserProfile, MyAccount, About, Invitation,
              AdminInvitations, AdminUsers, ComingSoon
  styles/     tokens.css, global.css
  test/       setup.ts, render.tsx — providers et échantillons des tests
```

Un composant ajouté à `components/` doit aussi être inscrit **au barillet**
`.design-sync/ds-entry.tsx` **et** à `componentSrcMap` dans
`.design-sync/config.json`. L'oubli ne casse rien de visible : le composant
disparaît simplement du bundle de design.

`App.tsx` est scindé en **deux couches** : une publique et une gardée.
`/invitation/:token` est la seule route accessible sans session — on y arrive
par un lien reçu, sans compte.

## Écrans

| Route | Ce qu'on y fait |
|---|---|
| `/` | Accueil : en-cours par type, fil attribué des comptes suivis |
| `/bibliotheque/:type` | Un rayon, filtrable, paginé au curseur. Six types, `music` compris — sur un rayon de musique, le filtre « en cours » ne s'affiche pas |
| `/media/:id` | Fiche : métadonnées, mon suivi, ceux des abonnements, saisons ou tomes, mon journal daté, et — films et séries — où regarder |
| `/recherche` | Chercher chez les sources externes et ajouter |
| `/comparer` | Comparaison avec un compte suivi, au choix |
| `/membres` · `/membres/:id` | L'annuaire, les profils, s'abonner ; sur un profil : sa vitrine, la répartition de sa bibliothèque, et sa bibliothèque dépliée |
| `/mon-compte` | Couleur d'identité, avatar, mot de passe |
| `/a-propos` | D'où viennent les fiches — **les attributions de sources y sont obligatoires**, TMDB comprise |
| `/administration/invitations` | Fabriquer et révoquer des liens d'invitation (admin) |
| `/invitation/:token` | **Publique** : créer son compte, ou changer son mot de passe |

## Sections en attente

Les **quêtes** affichent un écran « bientôt disponible ». Le domaine existe
désormais côté API et le front ne l'a pas encore câblé — c'est du travail à
faire, pas une absence côté back. **Aucune donnée fictive** n'est affichée en
attendant.

Restent également non câblés, tous servis par l'API : les notifications, les
sagas, la veille, les badges et les statistiques.

La **musique** n'est plus dans cette liste : elle a son rayon comme les cinq
autres types depuis l'étape 11. `/musique` redirige vers `/bibliotheque/music`.

## Vérifications

```bash
npm run types:check  # les types collent-ils au contrat ?
npm run lint         # zéro avertissement toléré
npm test             # tests de fumée (Vitest + Testing Library)
npm run build        # tsc --noEmit puis vite build
```

Les tests ne visent **pas** la couverture : ils existent pour qu'un écran cassé
se voie. Ils montent la fiche, le rayon et le panneau de suivi pour de vrai,
avec `api/endpoints` simulé, et interrogent les rôles et les textes — jamais
les classes CSS, qui sont vides en test.

Les deux tournent en intégration continue sur `main` et sur chaque proposition
de fusion (`.github/workflows/ci.yml`), sur la version de Node lue dans
`.nvmrc`. `npm ci` y est préféré à `npm install` : il installe exactement le
lockfile et échoue s'il diverge de `package.json`, au lieu de le réécrire.

**Rien n'est déployé automatiquement.** Vercel était branché sur ce dépôt via
l'application GitHub et publiait à chaque fusion, mais l'API vit sur une
adresse de réseau local que ses serveurs ne peuvent pas joindre : ces
déploiements sont coupés par `vercel.json`. Les workflows de l'ancienne
infrastructure Railway sont conservés hors service au même endroit. Ce qu'il
faudrait pour tout réactiver est dans
[`docs/deploiement/`](docs/deploiement/README.md).

Deux règles ESLint sont désactivées volontairement :
`react/no-unescaped-entities` (l'interface est en français, les apostrophes sont
partout) et `react-refresh/only-export-components` (co-localiser un contexte et
ses hooks est l'idiome React usuel). `src/api/types.ts` est exclu du lint
puisqu'il est généré.
