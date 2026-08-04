# design-sync — notes pour ce dépôt

## Ce que ce dépôt n'est pas

`mediatheque-front` est une **application**, pas un paquet de design system :
`private: true`, aucun `main`/`module`/`exports`, et `npm run build` produit un
bundle d'application (`dist/index.html` + assets), pas des composants typés.
Deux conséquences que la prochaine synchro doit connaître d'avance :

- **Il n'y a pas d'arbre `.d.ts` livré**, donc `exportedNames()` ne trouve rien.
  Les 16 composants sont énumérés à la main dans `componentSrcMap` — c'est ce
  qui les fait exister. Ajouter un composant au dépôt ne suffit pas : il faut
  l'ajouter au barillet **et** à `componentSrcMap`.
- **Les composants sont tous en `export default`.** Le mode « synth-entry » du
  convertisseur ne republie que les exports *nommés* : il aurait produit un
  bundle vide. D'où le barillet `.design-sync/ds-entry.tsx`.

## Le build « bibliothèque »

`.design-sync/vite.lib.config.ts` compile le barillet en module ES via le Vite
du dépôt, vers `.design-sync/.cache/dist-ds/`. **Ne pas remplacer ce build par
un bundling esbuild direct depuis `src/`** : les styles sont des modules CSS
non hachés, et le loader `css` par défaut d'esbuild (que `lib/bundle.mjs` ne
surcharge délibérément pas) rendrait `styles.panel` indéfini — tous les
composants sortiraient sans la moindre classe. Vite les résout comme en prod.

React est externalisé (`react`, `react-dom`, `react/jsx-runtime`) : les aperçus
prennent le leur dans `_vendor/`, et deux instances casseraient les hooks.

## Les jetons passent par le build, pas par `copyTokens`

`copyTokens()` ne sait aller chercher les jetons que dans un **paquet** sous
`node_modules` ; `tokensGlob` seul ne fait rien. Ici ils vivent dans
`src/styles/`. Le barillet importe donc `../src/styles/global.css`, qui importe
`tokens.css` (et depuis la v3, `fonts.css`) : Vite inline le tout dans la
feuille compilée, d'où elle atteint les maquettes. `ds-bundle/tokens/` reste
vide — c'est normal, pas un échec.

## Contexte des aperçus

`DesignPreviewProvider` (exporté par le barillet) compose le cache de requêtes,
un routeur mémoire et une session de démonstration. Sept composants en
dépendent : `AppShell`, `FollowButton`, `FollowedTrackings`, `PeopleDisclosure`,
`SeasonList`, `TrackingPanel`, `VolumeGrid`. Les autres sont purs.

## Environnement

- **Node 20 obligatoire** : `export PATH=$HOME/.nvm/versions/node/v20.19.0/bin:$PATH`.
  Le `node` par défaut du poste est un v12 et ne lance ni Vite 5 ni le convertisseur.
- **Pas de `npm ci`** au moment de la synchro : `node_modules` était déjà aligné
  sur le lock (marqueur `.package-lock.json` présent, `npm ls` propre). Le
  reconstruire aurait détruit un arbre fonctionnel sans rien gagner.
- **Chromium** : aucun cache playwright, mais `/usr/bin/google-chrome` existe.
  Installer `playwright` (npm) avec `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` et
  lancer avec `DS_CHROMIUM_PATH=/usr/bin/google-chrome` — inutile de télécharger
  les ~200 Mo de navigateur.

## Avertissements connus (`[FONT_MISSING]`)

Validate signale « Iowan Old Style », « Palatino Linotype », « Palatino »,
« Book Antiqua ». Ce ne sont **pas** des fontes de marque manquantes : c'était
la pile serif *système* de `tokens.css`. Depuis la v3, `--font-serif` commence
par `Newsreader`, qui est **auto-hébergée** dans `public/fonts/` — mais les
noms de repli restent dans la pile, donc l'avertissement peut persister. À
vérifier à la prochaine synchro : s'il ne cite plus que des noms de repli,
c'est attendu.

## Risques de re-synchro

- **Le dépôt a été restylé après la synchro** (spécification v3 : nouvelle
  palette pierre/graphite, Newsreader + Inter Tight, rayon 0, barres 2px). Le
  projet Claude Design uploadé décrit encore l'ancien thème beige — **une
  re-synchro est nécessaire** pour que les aperçus correspondent au code.
- **Une fonctionnalité « journal » est arrivée en parallèle** (`LogEntry`,
  `MediaLog`, `fetchLog`/`addLogEntry`…). `MediaLog` n'est **pas** dans le
  barillet ni dans `componentSrcMap` : il n'existe pas dans le design system
  tant qu'on ne l'y ajoute pas.
- Les données de démonstration des aperçus (titres, comptes, couleurs) sont
  inlinées dans `.design-sync/previews/*.tsx`. Elles ne suivent pas l'API : si
  une forme de props change, c'est la compilation de l'aperçu qui le dira.
- Les aperçus n'ont **pas de réseau** : toute image passe par une URI `data:`.
  Ne pas y remettre d'adresses distantes, elles retomberaient sur le repli.
- Quatre composants restent sur la carte plancher, volontairement :
  `FollowedTrackings`, `PeopleDisclosure`, `SeasonList`, `TrackingPanel`. Ils
  sont importables et fonctionnels ; seul l'aperçu riche manque. Les écrire
  demande de simuler l'état des requêtes.
