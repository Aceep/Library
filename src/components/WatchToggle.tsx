import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setMediaWatch, setSagaWatch } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import ErrorNotice from './ErrorNotice'
import styles from './WatchToggle.module.css'

/**
 * La veille : être prévenu quand **du nouveau paraît**.
 *
 * Un seul composant pour les deux cibles, parce que c'est un seul geste : une
 * série gagne des épisodes, un manga des tomes, une saga des films. Ce qui
 * change est la route, pas la promesse.
 *
 * Trois choses que le back garantit et que l'interface ne doit pas contredire :
 *
 * - **Aucun rapport avec le suivi ni la possession.** On surveille une série
 *   qu'on n'a pas commencée, et on peut avoir tout lu d'un manga sans vouloir
 *   la suite. Le bouton ne vit donc pas dans le panneau de suivi.
 * - **Le geste est idempotent** des deux côtés : rien n'empêche de
 *   double-cliquer.
 * - **Lever la veille ne réécrit pas le passé.** Les notifications déjà reçues
 *   restent : une nouveauté qu'on a lue a bien eu lieu.
 */
export default function WatchToggle({
  target,
  id,
  watched,
  className,
}: {
  target: 'media' | 'saga'
  id: string
  watched: boolean
  className?: string
}) {
  const queryClient = useQueryClient()

  const basculer = useMutation({
    // Les deux routes ne rendent pas la même chose — une saga entière d'un
    // côté, un simple `watched` de l'autre. On jette les deux : l'état
    // repartira des requêtes invalidées ci-dessous, seule source qui vaille.
    mutationFn: async () => {
      if (target === 'saga') await setSagaWatch(id, !watched)
      else await setMediaWatch(id, !watched)
    },
    onSuccess: () => {
      // Trois vues portent l'état : la liste des veilles, la saga, et les
      // fiches — `watched` y est recopié et resterait faux là d'où l'on vient.
      void queryClient.invalidateQueries({ queryKey: queryKeys.watches })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sagas })
      void queryClient.invalidateQueries({ queryKey: queryKeys.mediaAll })
    },
  })

  return (
    <>
      <button
        type="button"
        className={[styles.watch, watched ? styles.watchOn : '', className].filter(Boolean).join(' ')}
        onClick={() => basculer.mutate()}
        disabled={basculer.isPending}
        aria-pressed={watched}
      >
        {basculer.isPending ? '…' : watched ? 'Sous veille' : 'Surveiller'}
      </button>
      {basculer.error ? <ErrorNotice error={basculer.error} /> : null}
    </>
  )
}
