import { useSearchParams } from 'react-router-dom'

/**
 * Le domaine d'un paramètre d'adresse.
 *
 * Le domaine n'est pas décoratif : c'est lui qui applique **dans la barre
 * d'adresse** la règle « ce que le back refuse ne se propose pas ». Un
 * `?status=doing` recopié sur un rayon qui n'a pas ce statut retombe sur le
 * défaut au lieu d'interroger un état que le back refuse — même geste que
 * `?page=troisieme` sur la page.
 */
export interface ChampDAdresse<T extends string> {
  /** La valeur quand le paramètre est absent — et celle qui ne s'écrit **jamais**. */
  defaut: T
  /** Le domaine. Hors domaine, on retombe sur le défaut, sans erreur. */
  valeurs: readonly T[]
}

/**
 * Déclarer un champ en gardant l'inférence.
 *
 * Sans ce petit constructeur, `filtres.status` s'infère `string` et chaque
 * écran doit caster vers son type de contrat. C'est la seule vraie difficulté
 * du hook, et elle se règle ici plutôt que chez cinq appelants.
 */
export const champ = <T extends string>(
  defaut: T,
  valeurs: readonly T[],
): ChampDAdresse<T> => ({ defaut, valeurs })

/**
 * Un état d'écran qui vit dans l'adresse : filtres, tri, onglet.
 *
 * **Frère de `usePageInUrl`, pas son extension.** Les deux écrivent l'adresse,
 * mais pas de la même façon, et l'écart est voulu :
 *
 * - **on remplace au lieu d'empiler.** Un filtre n'est pas un lieu où l'on
 *   revient ; le retour arrière doit sauter par-dessus. C'est déjà la doctrine
 *   de `remettreALaPremiere`.
 * - **la valeur par défaut ne s'écrit pas**, exactement comme `?page=1` : une
 *   adresse qu'on partage est la plus courte qui dise la chose.
 * - **`page` est supprimée ici**, et pas dans l'écran. Rester sur la page 7 en
 *   changeant de filtre montrerait un écran vide sur une liste qui en a deux.
 * - **l'adresse parle le vocabulaire du contrat** (`status=doing`,
 *   `sort=title`), pour qu'il n'y ait aucune table de traduction entre elle et
 *   les filtres envoyés à l'API.
 *
 * L'écriture est **fonctionnelle**, et c'est le point qui n'est pas cosmétique.
 * Dès que les filtres entrent dans l'adresse, un gestionnaire peut appeler deux
 * fois `setSearchParams` — une fois pour le filtre, une fois pour la page — et
 * chaque appel se referme sur les paramètres de *son* rendu : le second
 * écraserait le premier. La forme fonctionnelle lit l'état courant, et le hook
 * fait les deux écritures d'un seul geste.
 */
export function useFiltersInUrl<F extends Record<string, string>>(champs: {
  [K in keyof F]: ChampDAdresse<F[K]>
}): [F, (suite: Partial<F>) => void] {
  const [params, setParams] = useSearchParams()

  const filtres = {} as F
  for (const cle of Object.keys(champs) as Array<keyof F>) {
    const { defaut, valeurs } = champs[cle]
    const brut = params.get(String(cle))
    filtres[cle] = (valeurs as readonly string[]).includes(brut ?? '')
      ? (brut as F[keyof F])
      : defaut
  }

  const poser = (suite: Partial<F>) => {
    setParams(
      (courants) => {
        const prochains = new URLSearchParams(courants)
        for (const cle of Object.keys(suite) as Array<keyof F>) {
          const valeur = suite[cle]
          if (valeur === undefined) continue
          if (valeur === champs[cle].defaut) prochains.delete(String(cle))
          else prochains.set(String(cle), valeur)
        }
        // Changer de filtre ramène à la première page, et c'est ici que ça se
        // fait : deux `setParams` dans un même gestionnaire se recouvriraient.
        prochains.delete('page')
        return prochains
      },
      { replace: true },
    )
  }

  return [filtres, poser]
}
