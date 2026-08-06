import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Ce qui se passe quand on arrive sur un **autre écran** — et à aucun autre
 * moment.
 *
 * Le prédicat est `pathname`, pas `location` : `?page=`, `?q=` et les filtres
 * sont des gestes *dans* un écran. Remonter en haut du document sur un
 * changement de filtre ferait perdre les filtres de vue à l'instant précis où
 * l'on s'en sert, et voler le focus à quelqu'un qui coche une case est le pire
 * défaut d'accessibilité qu'on puisse ajouter.
 *
 * **Le retour arrière n'est pas touché.** Le navigateur rétablit lui-même la
 * position sur un POP ; un `scrollTo(0, 0)` naïf casserait la seule chose que
 * l'on attend vraiment d'un retour arrière. Le focus, lui, se déplace quand
 * même : le contenu a changé, il faut le dire — mais avec `preventScroll`,
 * parce que la position appartient au navigateur dans ce cas.
 *
 * **Jamais au premier montage.** Au chargement d'une page, le focus appartient
 * à la barre d'adresse ; le lui prendre casserait la première tabulation. Et le
 * navigateur a peut-être déjà rétabli une position, qu'on n'a aucune raison
 * d'écraser.
 *
 * Le défilement est **instantané**, toujours, et il n'y a rien à brancher sous
 * mouvement réduit : on n'anime jamais une mise en page ici. Un défilement
 * fluide aurait en plus traversé toutes les sections en chemin, et
 * l'observateur unique de `Reveal` les aurait révélées hors champ, d'un coup.
 */
export function useNewScreen(contenu: RefObject<HTMLElement>) {
  const { pathname } = useLocation()
  const type = useNavigationType()
  const precedent = useRef<string | null>(null)

  useLayoutEffect(() => {
    // Comparer par `ref` plutôt que de se fier aux dépendances : après un retour
    // arrière suivi d'un clic de pagination, `useNavigationType` repasse de POP
    // à PUSH sans que l'écran ait changé — l'effet se rejouerait et remonterait
    // en haut au milieu d'une pagination.
    const aChange = precedent.current !== null && precedent.current !== pathname
    precedent.current = pathname
    if (!aChange) return

    if (type !== 'POP') window.scrollTo(0, 0)

    // `preventScroll` : le focus ne décide pas d'où l'on regarde. C'est la ligne
    // au-dessus, ou le navigateur sur un retour arrière.
    contenu.current?.focus({ preventScroll: true })
  }, [pathname, type, contenu])
}
