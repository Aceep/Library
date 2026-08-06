import { useSearchParams } from 'react-router-dom'

/**
 * La page courante, dans l'adresse — partagée par les deux rayons.
 *
 * Un hook plutôt que deux copies, et pour une raison précise : « deux listes
 * qui se ressemblent doivent se comporter pareil » est une propriété qui
 * s'érode si on la confie à la relecture. Ici, le rayon d'un type et la
 * bibliothèque d'un membre lisent la même page, écrivent la même adresse et
 * reviennent au même endroit parce qu'ils exécutent le même code. Une
 * divergence demanderait un geste délibéré.
 *
 * Ce que le hook fixe, et qui ne se voit pas dans une capture d'écran :
 *
 * - `?page=1` **ne s'écrit pas**. La première page est l'adresse nue, parce
 *   qu'une adresse qu'on partage doit être la plus courte qui dise la chose.
 * - naviguer **empile une entrée d'historique** : changer de page est une
 *   navigation, et le retour arrière doit ramener d'où l'on vient ;
 * - **changer de filtre remplace** au lieu d'empiler, et remet à la première.
 *   Rester sur la page 7 en changeant de filtre montrerait un écran vide sur
 *   une liste qui en a deux, et donnerait l'impression que le filtre ne ramène
 *   rien. L'entrée est remplacée parce qu'un filtre n'est pas un lieu où l'on
 *   revient : le retour arrière doit sauter par-dessus.
 */
export interface PageDansAdresse {
  /** La page demandée, bornée et toujours ≥ 1. */
  page: number
  /** L'adresse d'une page — pour de vrais `href`, pas des gestionnaires de clic. */
  adresseDe: (numero: number) => string
  /** Y aller, en empilant une entrée d'historique. */
  allerA: (numero: number) => void
  /** Revenir à la première, sans empiler — à appeler quand un filtre change. */
  remettreALaPremiere: () => void
}

/**
 * Le back plafonne `page` à 1000 et répond 400 au-delà. On borne ici pour
 * qu'une adresse mal recopiée affiche une page plutôt qu'une erreur, qui ne
 * dirait rien d'utile à qui l'a mal recopiée.
 */
export const PAGE_MAX = 1000

export function usePageInUrl(): PageDansAdresse {
  const [params, setParams] = useSearchParams()

  const brut = Number(params.get('page'))
  const page = Number.isInteger(brut) && brut >= 1 ? Math.min(brut, PAGE_MAX) : 1

  const avec = (base: URLSearchParams, numero: number): URLSearchParams => {
    const suite = new URLSearchParams(base)
    if (numero > 1) suite.set('page', String(numero))
    else suite.delete('page')
    return suite
  }

  return {
    page,
    adresseDe: (numero) => {
      const requete = avec(params, numero).toString()
      return requete ? `?${requete}` : window.location.pathname
    },
    // Forme fonctionnelle : depuis que les filtres vivent eux aussi dans
    // l'adresse, deux écritures peuvent se suivre dans un même gestionnaire.
    // Chacune fermée sur les paramètres de son rendu, la seconde écraserait la
    // première ; en lisant l'état courant, elles se composent.
    allerA: (numero) => setParams((courants) => avec(courants, numero)),
    remettreALaPremiere: () => {
      if (page === 1) return
      setParams((courants) => avec(courants, 1), { replace: true })
    },
  }
}
