import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setSagaWatch } from '../api/endpoints'
import type { SagaSummary } from '../api/schema'
import { queryKeys } from '../api/keys'
import ErrorNotice from './ErrorNotice'
import styles from './SagaList.module.css'

/**
 * Les sagas auxquelles cette œuvre appartient.
 *
 * Une saga n'est ni une série ni une collection de tomes : ce sont des **œuvres
 * distinctes**, chacune avec sa fiche, qui se suivent. La section n'apparaît
 * donc que quand il y en a — la plupart des œuvres n'en ont aucune, et un
 * intitulé vide se lit comme un manque.
 *
 * Le résumé que porte une fiche ne contient pas les parties : `part_count` et
 * `in_library_count` suffisent à dire l'essentiel, et le détail est sur la page
 * de la saga. C'est délibéré côté API — une fiche de film n'a pas à
 * transporter la trilogie entière.
 */
export default function SagaList({ sagas }: { sagas: SagaSummary[] }) {
  if (sagas.length === 0) return null

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{sagas.length > 1 ? 'Sagas' : 'Saga'}</h2>
      <ul className={styles.list}>
        {sagas.map((saga) => (
          <li key={saga.id} className={styles.row}>
            <div className={styles.rowBody}>
              <Link to={`/sagas/${saga.id}`} className={styles.rowLink}>
                {saga.title}
              </Link>
              <p className={styles.rowCount}>{partsNote(saga)}</p>
            </div>
            <SagaWatchToggle sagaId={saga.id} watched={saga.watched} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * « 3 parties, 1 dans la médiathèque ».
 *
 * Les deux nombres sont dits séparément parce qu'ils ne parlent pas de la même
 * chose : le premier est ce que la source connaît de la saga, le second ce
 * qu'on en a. Les confondre — « 1 partie » — effacerait précisément ce que la
 * veille est là pour surveiller.
 */
export const partsNote = (saga: Pick<SagaSummary, 'part_count' | 'in_library_count'>) => {
  const manquantes = saga.part_count - saga.in_library_count
  const parties = `${saga.part_count} partie${saga.part_count > 1 ? 's' : ''}`

  if (manquantes <= 0) return `${parties}, toutes dans la médiathèque`
  return `${parties}, dont ${manquantes} pas encore dans la médiathèque`
}

/**
 * La veille sur une saga : être prévenu quand une **nouvelle partie sort**.
 *
 * Le geste est idempotent des deux côtés, donc rien n'empêche de double-cliquer.
 * Lever la veille ne supprime pas les notifications déjà reçues : elles disent
 * quelque chose qui a eu lieu.
 */
export function SagaWatchToggle({ sagaId, watched }: { sagaId: string; watched: boolean }) {
  const queryClient = useQueryClient()

  const basculer = useMutation({
    mutationFn: () => setSagaWatch(sagaId, !watched),
    onSuccess: () => {
      // La saga elle-même, et les fiches qui en portent le résumé : `watched`
      // y est recopié, et resterait faux sur la fiche d'où l'on vient.
      void queryClient.invalidateQueries({ queryKey: queryKeys.sagas })
      void queryClient.invalidateQueries({ queryKey: queryKeys.mediaAll })
    },
  })

  return (
    <>
      <button
        type="button"
        className={watched ? `${styles.watch} ${styles.watchOn}` : styles.watch}
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
