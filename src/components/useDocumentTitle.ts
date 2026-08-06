import { useEffect } from 'react'

/** L'onglet quand l'écran n'a pas de mot à lui — celui d'`index.html`. */
const TITRE_NU = 'Médiathèque partagée'

/** Le suffixe, court : un onglet est tronqué, le mot propre à l'écran passe d'abord. */
const SUFFIXE = 'Médiathèque'

/**
 * Ce que dit l'onglet.
 *
 * Tous les écrans partageaient le titre statique d'`index.html` : trois onglets
 * ouverts étaient indistinguables, et l'historique du bouton retour proposait
 * une liste de « Médiathèque partagée » identiques.
 *
 * `null` veut dire **« on ne sait pas encore »**, et il faut le passer tel quel
 * pendant le chargement : **jamais `'Chargement…'`**. Le titre du document est
 * aussi le nom de l'entrée d'historique et celui du signet — un « Chargement… »
 * s'y inscrirait définitivement, et le retour arrière offrirait une liste de
 * « Chargement… » indistincts, ce qui est pire que ce qu'on répare.
 *
 * Le nettoyage n'est pas décoratif : sans lui, un écran qui n'appelle pas le
 * hook — ou dont la requête échoue — hériterait du titre du précédent. React
 * exécute les nettoyages de l'arbre démonté **avant** les effets du nouveau :
 * l'ordre est donc « titre nu, puis nouveau titre », jamais de titre périmé.
 *
 * Le séparateur est le point médian, celui que le dépôt emploie déjà pour ses
 * lignes de méta (`[year, source].join(' · ')`). Le tiret cadratin reste à la
 * prose.
 */
export function useDocumentTitle(titre: string | null) {
  useEffect(() => {
    document.title = titre ? `${titre} · ${SUFFIXE}` : TITRE_NU
    return () => {
      document.title = TITRE_NU
    }
  }, [titre])
}
