import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchReference } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import type { MediaType, ReferenceStatuses, StatusOption, TrackingStatus } from '../api/schema'

/**
 * Ce que le domaine dit des statuts — lu chez l'API, jamais recopié ici.
 *
 * Deux règles ne pouvaient pas traverser le contrat OpenAPI, faute d'être des
 * champs de réponse : qu'un album n'a que deux états, et qu'une série voit son
 * statut recalculé plutôt qu'écrit. Le front les recopiait donc, et s'est
 * trompé exactement comme prévu — « en cours » proposé sur un album, refusé en
 * 400 par le serveur. `GET /reference/statuses` les publie désormais, libellés
 * compris.
 *
 * **Chargé avant le premier écran**, comme la session : les libellés ne sont
 * pas des données d'écran qu'on peut faire attendre, ils sont le vocabulaire.
 * Un badge de statut sans son mot est un trou, pas un chargement. En échange,
 * `useReference()` rend toujours une valeur, sans état intermédiaire à traiter
 * dans chaque composant.
 *
 * Le contenu est constant pour une version de l'API : une requête au démarrage,
 * `staleTime: Infinity`, et on n'en reparle plus.
 */
interface ReferenceValue {
  /** Les statuts d'un type, dans l'ordre, avec leur libellé. */
  statusesOf: (type: MediaType) => StatusOption[]
  /** Le mot qui dit cet état-là, pour ce type-là : « Lu » un livre, « Vu » un film. */
  statusLabel: (type: MediaType, status: TrackingStatus) => string
  /**
   * Vrai quand le serveur recalcule le statut d'après les éléments cochés.
   * L'interface ne doit alors pas proposer de l'écrire — la route répond 400.
   */
  isDerivedStatusType: (type: MediaType) => boolean
}

const ReferenceContext = createContext<ReferenceValue | null>(null)

export function useReferenceQuery() {
  return useQuery<ReferenceStatuses>({
    queryKey: queryKeys.reference,
    queryFn: ({ signal }) => fetchReference(signal),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function ReferenceProvider({
  reference,
  children,
}: {
  reference: ReferenceStatuses
  children: ReactNode
}) {
  const value = useMemo<ReferenceValue>(() => {
    const parType = new Map(reference.types.map((entry) => [entry.type, entry]))

    return {
      statusesOf: (type) => parType.get(type)?.statuses ?? [],
      statusLabel: (type, status) =>
        parType
          .get(type)
          ?.statuses.find((option) => option.value === status)?.label ?? status,
      isDerivedStatusType: (type) => parType.get(type)?.derived_status ?? false,
    }
  }, [reference])

  return <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>
}

export function useReference(): ReferenceValue {
  const value = useContext(ReferenceContext)
  if (!value) throw new Error('useReference doit être utilisé sous un ReferenceProvider')
  return value
}
