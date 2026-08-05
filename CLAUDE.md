# Conventions d'écriture — mediatheque-front

Ce fichier dit **comment on écrit le code ici**. Le `README.md` dit comment le projet
tourne et ce que le back impose ; `.design-sync/conventions.md` s'adresse à qui consomme
le bundle de composants depuis l'extérieur. Les trois sont complémentaires, on ne recopie
pas l'un dans l'autre.

## Langue

- **Identifiants en anglais**, en `camelCase` : `fetchLibrary`, `progressRatio`,
  `isDerivedStatusType`.
- **Champs d'API en `snake_case`**, tels que le contrat les nomme : `next_cursor`,
  `identity_color`, `completed_at`. On ne les renomme jamais au passage — un champ qui
  change de nom entre le réseau et l'écran coûte une relecture du contrat à chaque doute.
- **Commentaires et JSDoc en français.**
- **Toute la copie d'interface en français.** Il n'y a pas d'i18n et il n'y en aura pas :
  une chaîne anglaise dans un écran est un bug.

## Forme

Pas de Prettier ni de règle ESLint de formatage : la forme se tient à la main, et elle est
homogène. À respecter :

- **Pas de point-virgule** en fin d'instruction.
- **Guillemets simples**, sauf quand la chaîne contient une apostrophe française — alors
  guillemets doubles (`"L'API est injoignable."`), jamais d'échappement.
- **Indentation 2 espaces**, virgule finale sur les listes multilignes.
- **~100 colonnes**. Quelques lignes dépassent, aucune ne s'en approche par négligence.
- `src/api/types.ts` est **généré** (`npm run types`) : il échappe à tout ça, et **ne
  s'édite jamais à la main**.

Fonctions : `export default function` pour un composant, `export function` pour un hook ou
un composant secondaire exporté depuis le même fichier (`NewContentBadge`,
`FollowedTrackings`). `const` fléchée pour les helpers purs et les appels d'endpoint —
tout ce qui tient en une expression.

```ts
export const progressRatio = (progress: Progress | null | undefined): number | null => {
  if (!progress || progress.total <= 0) return null
  return progress.checked / progress.total
}
```

## Où va quoi

| Dossier | Contenu |
|---|---|
| `src/api/` | `client.ts` (fetch + `ApiError`), `endpoints.ts` (une fonction par route), `keys.ts` (clés de cache), `schema.ts` (types + libellés), `cache.ts` (rangement des agrégats), `types.ts` (généré) |
| `src/components/` | Composants réutilisables, un `<Nom>.tsx` + un `<Nom>.module.css` du même nom |
| `src/pages/` | Un composant par route, même appairage `.tsx` / `.module.css` |
| `src/session/` | Qui je suis — `SessionContext`, `useSession`, `useLogin` |
| `src/theme/` | Jour / Nuit — l'attribut `data-mode` fait foi, React ne fait que le lire |
| `src/styles/` | `tokens.css`, `global.css`, `fonts.css` |

Un composant qui n'est utilisé que par un seul écran peut rester dans le fichier de cet
écran. On ne crée un fichier dans `components/` que le jour du deuxième appelant.

## Les frontières qu'on ne franchit pas

Ce sont les règles dont la violation ne se voit pas tout de suite, et coûte cher ensuite.

1. **Aucune adresse d'API dans le code.** Chemins relatifs uniquement (`/api/...`), l'hôte
   n'apparaît que dans `vite.config.ts`. Un appel direct réussit la connexion puis répond
   `401` partout (cookie `SameSite=Lax`) — un symptôme qui ne ressemble pas à sa cause.
2. **Aucun composant n'appelle `api` ni `fetch` directement.** Les chemins d'API sont
   écrits dans `endpoints.ts`, et nulle part ailleurs.
3. **Aucune forme de donnée n'est redéclarée à la main.** Les types se dérivent des
   schémas générés dans `schema.ts` (`type Account = CompareResponse['with']`). Si le
   contrat bouge, `npm run types` le dit et la compilation casse — c'est le mécanisme qui
   tient le front honnête.
4. **Rien ne se recalcule côté client.** Statut dérivé, progression, `has_new_content` :
   toute écriture renvoie l'agrégat recalculé, `cache.ts` ne fait que le *ranger*. Ne
   jamais inverser un booléen localement ni recomposer une progression.
5. **Ce que le back refuse ne se propose pas.** Pas de sélecteur de statut sur `tv` ni
   `comic_series` (`isDerivedStatusType`) ; `user_id` est absent de `TrackingPatch` — il
   est inexprimable plutôt qu'à ne pas oublier. Rendre le geste impossible vaut mieux que
   traiter son erreur.
6. **Curseur opaque.** On le renvoie tel quel et on s'arrête sur `next_cursor === null`,
   jamais en comparant `items.length` à une limite.

## React Query

- **Toute clé vient de `queryKeys`** (`src/api/keys.ts`), aucune chaîne littérale dans un
  écran. Les clés sont hiérarchiques et l'invalidation se fait **par préfixe** :
  `['library']` périme tous les rayons, `['media', id]` une seule fiche.
- Une nouvelle clé se déclare dans `keys.ts` **avec un commentaire disant sous quel
  préfixe elle vit et pourquoi** — c'est ce choix, pas la clé, qui est difficile.
- `queryFn: ({ signal }) => fetchX(id, signal)` : le signal se passe toujours quand
  l'endpoint l'accepte.
- Après une écriture : `setQueryData` avec la réponse du serveur pour la ressource
  touchée, puis `invalidateQueries` sur les listes qui en dépendent. Les invalidations
  d'un écran se regroupent dans une fonction locale nommée (`invalidateLists`).
- Promesse ignorée volontairement : la préfixer de `void`
  (`void queryClient.invalidateQueries(...)`).

## Erreurs

Le back renvoie `{ code, message, retryable }` avec un `message` déjà rédigé en français,
**destiné à être affiché tel quel**. On ne construit pas de catalogue de messages
par-dessus. Un état d'erreur s'affiche avec `<ErrorNotice error={error} />`, avec
`onRetry` quand un nouvel essai a du sens.

Les cas particuliers se lisent sur `ApiError` (`isUnauthenticated`, `isSearchUnavailable`),
jamais par comparaison de chaîne sur le message.

## Styles

- **CSS Modules**, un fichier par composant, `import styles from './X.module.css'`.
- **Couleurs, typographie, espacements et filets passent par les jetons de
  `src/styles/tokens.css`.** Zéro hex dans un composant (`var(--ink-muted)`), zéro `px`
  d'espacement inventé (`var(--space-3)`, `gap: var(--space-2)`). Un `px` littéral reste
  acceptable pour une dimension propre au composant — une hauteur de filet, un
  `padding-bottom: 2px` sous un soulignement.
- **Deux mondes, pas un thème clair et son inverse.** La nuit est l'état naturel, le jour
  la variante ; la nuit est un cinéma (noir bleuté froid), le jour du papier (crème
  chaud). On n'unifie pas leur température. Le mode se lit sur `data-mode`, posé sur
  `<html>` **avant la première peinture** par le script d'`index.html` — un composant ne
  nomme jamais un mode, il nomme un rôle.
- **Ambre = structure et atmosphère. Doré = action.** `--amber` porte les mots de section
  et les sourcils ; `--gold` ne porte que ce qui se clique. **Un élément doré qui ne
  s'actionne pas est un bug.** En jour, `--gold` ne fait que 1,97:1 en texte : on compose
  avec `--gold-text`, on remplit avec `--gold`.
- **Les gels de rayon n'ont que deux emplacements** : la nav des rayons du bandeau et les
  étiquettes de médium. Nulle part ailleurs — ni teinte de ligne, ni traitement d'artwork,
  ni couleur de section. Ils arrivent par `data-media-type`, qui pose **deux** variables :
  `--type-hue` pour ce qui compose ou trace, `--gel` pour ce qui remplit. Les confondre
  rend l'étiquette illisible en jour.
- **Un rayon est un aplat à texte quasi noir ; un membre est une pastille bordée à sa
  propre encre.** C'est une différence de *forme*, pas de teinte, et c'est elle qui garde
  les deux systèmes lisibles sur une même ligne. Ne jamais l'inverser.
- **Deux langages d'ombre, séparés par la taille.** `--block` (décalé, sans flou) pour la
  petite chrome ; `--lift` (chute floue) pour le grand contenu. **Jamais les deux sur un
  même élément.** Aucun `border-radius`, nulle part — seule la pastille d'identité reste
  ronde.
- **Le mouvement n'anime que l'opacité et la transformation**, jamais la mise en page.
  Une section qui entre passe par `Reveal` — observateur unique, filet de sécurité de
  2,6 s pour qu'une panne ne laisse jamais la page blanche, échelonnement en CSS et non
  par mutation de `style`. `will-change` est réservé à la bande défilante. Sous mouvement
  réduit, les animations infinies s'**arrêtent** : les durées à zéro ne les arrêtent pas.
- La couleur d'identité arrive en runtime, posée en variable sur l'élément :
  `style={{ '--identity': color } as CSSProperties}`. C'est le seul usage normal du style
  inline dans un composant, avec les dimensions calculées (largeur d'une barre de
  progression).
- Les variantes se portent en attribut de données, pas en classe conditionnelle :
  `data-status={status}` puis `.badge[data-status='doing']`.

### Le bloc d'alias est un échafaudage, pas un vocabulaire

La fin de `tokens.css` traduit les anciens noms (`--surface-page`, `--ink-soft`,
`--ink-faint`, `--accent`, `--type-movie`, `--paper*`, `--text-*`…) vers la nouvelle
palette. Il existe pour que la trentaine d'écrans pas encore repris **suivent le thème**
au lieu de casser.

**Rien de neuf ne doit y puiser.** Un écran repris abandonne les anciens noms, et le bloc
rétrécit jusqu'à disparaître. Même statut pour `--font-sans` (Inter Tight) : il ne survit
que pour le corps de texte des écrans denses pas encore repris — la direction n'admet que
deux familles, Cormorant Garamond et IBM Plex Mono.

### Un écran ne restyle jamais l'intérieur d'un composant

La feuille d'une page pose l'emplacement du composant — grille, colonne, largeur
maximale — et s'arrête là. Ce qu'il y a *dedans* se demande par une prop, et si la prop
n'existe pas, on l'ajoute au composant.

```css
/* Non. À spécificité égale avec la règle du composant, c'est l'ordre d'émission
   des feuilles qui départage — donc un rendu qui dépend du bundle. */
.headerCover > * { aspect-ratio: 3 / 4; }
```

```jsx
/* Oui. Le composant expose le besoin, la page le demande. */
<div className={styles.headerCover}>
  <Cover url={detail.cover_url} title={detail.title} type={detail.type} size="full" ratio="3/4" />
</div>
```

La règle vaut pour nous comme pour l'extérieur : `.design-sync/conventions.md` l'énonce
déjà aux consommateurs du bundle, et un écran de ce dépôt n'a pas plus de droits sur les
internes d'un composant qu'une maquette dans claude.ai/design. Elle vaut aussi contre les
classes hachées des CSS Modules, qu'on pourrait croire hors d'atteinte : `> *` et les
sélecteurs de descendance les contournent, et c'est précisément ce qu'il ne faut pas.

## Composants

- Props typées **en ligne dans la signature** tant qu'elles tiennent ; une `interface`
  nommée quand le type est réutilisé ou long.
- Rendu conditionnel avec `cond ? <X /> : null`, **jamais `cond && <X />`** — un `0` ou
  une chaîne vide s'afficherait.
- Un composant qui n'a rien à montrer **rend `null`**, il n'invente pas de valeur de repli
  (`ProgressBar` sur `total === 0` : rien, jamais `NaN%`).
- Accessibilité en même temps que le balisage, pas après : `role`, `aria-valuenow`,
  `aria-pressed` sur les segments et les notes, `aria-hidden="true"` sur les pastilles de
  couleur qui doublent un texte.
- `useMemo` / `useCallback` seulement pour stabiliser une valeur de contexte. Le reste du
  code s'en passe : la mémoïsation défensive rend le code moins lisible sans rien gagner
  ici.

## Commentaires

C'est la convention la plus visible du projet, et celle qui coûte le plus cher à laisser
filer. Un commentaire ne redit pas ce que fait le code : il dit **pourquoi**, ou ce qui
casse si on s'en écarte.

```ts
/**
 * Où regarder. Hors du préfixe `media` volontairement : ces données ne
 * dépendent d'aucune écriture de suivi, et n'ont donc aucune raison d'être
 * rejetées du cache quand on coche un épisode.
 */
```

- JSDoc sur tout ce qui est exporté depuis `api/` et sur les composants dont le
  comportement surprend.
- Commentaire en ligne devant une décision qu'un relecteur voudrait « corriger » : un cast
  assumé, une invalidation non évidente, une règle métier qui ne se déduit pas du code.
- Les contraintes du back se commentent **là où elles s'appliquent**, avec leur
  conséquence (`répond 400`, `répond 409 si…`, `idempotent, répond 204`).

## Avant de commiter

```bash
npm run lint     # 0 warning toléré (--max-warnings 0)
npm run build    # tsc --noEmit puis vite build
```

Une variable délibérément inutilisée se préfixe de `_` plutôt que de se faire taire par un
commentaire ESLint.
