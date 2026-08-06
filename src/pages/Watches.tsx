import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchWatches } from '../api/endpoints'
import type { WatchItem } from '../api/schema'
import { queryKeys } from '../api/keys'
import Cover from '../components/Cover'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import WatchToggle from '../components/WatchToggle'
import { useDocumentTitle } from '../components/useDocumentTitle'
import styles from './Watches.module.css'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Ce que je surveille — œuvres et sagas mêlées.
 *
 * Trois choses que le back garantit, et que l'écran doit dire plutôt que
 * laisser deviner :
 *
 * - **La veille n'a rien à voir avec le suivi ni la possession.** On surveille
 *   une série qu'on n'a pas commencée. La page ne montre donc aucun statut.
 * - **`since` est un repère** : rien de paru avant ne notifie. C'est ce qui
 *   explique qu'une série reprise après deux ans ne déverse pas deux ans
 *   d'épisodes.
 * - **`next_check_at` dit quand on regardera** — la réponse à « c'est sorti
 *   ce matin, pourquoi je n'ai rien ? ».
 */
export default function Watches() {
  useDocumentTitle('Veille')
  const { data, isPending, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.watches,
      queryFn: ({ pageParam, signal }) => fetchWatches(pageParam, signal),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.next_cursor,
    })

  const items = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Veille</p>
        <h1 className={styles.title}>Ce que tu surveilles</h1>
        <p className={styles.lede}>
          Être prévenu quand du nouveau paraît — un épisode, un tome, une partie de saga.{' '}
          <strong>Sans rapport avec ta bibliothèque</strong> : on peut surveiller une série qu'on
          n'a pas commencée, et avoir tout lu d'un manga sans vouloir la suite.
        </p>
      </header>

      {isPending ? (
        <p className={styles.loading}>Chargement…</p>
      ) : error ? (
        <ErrorNotice error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune veille"
          note="Ouvre la fiche d'une série, d'un manga ou d'une saga et choisis « Surveiller ». Les nouveautés arriveront dans tes notifications."
        />
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((watch) => (
              <Row key={watch.id} watch={watch} />
            ))}
          </ul>

          {hasNextPage ? (
            <div className={styles.more}>
              <button
                type="button"
                className={styles.moreButton}
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Chargement…' : 'Charger la suite'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function Row({ watch }: { watch: WatchItem }) {
  const saga = watch.target === 'saga' ? watch.saga : null
  const media = watch.target === 'media' ? watch.media : null

  const titre = saga?.title ?? media?.title ?? 'Sans titre'
  const lien = saga ? `/sagas/${saga.id}` : media ? `/media/${media.id}` : null

  return (
    <li className={styles.row}>
      <span className={styles.rowCover}>
        <Cover url={media?.cover_url ?? null} title={titre} type={media?.type ?? 'movie'} />
      </span>

      <div className={styles.rowBody}>
        <p className={styles.rowKind}>{saga ? 'Saga' : 'Œuvre'}</p>
        {lien ? (
          <Link to={lien} className={styles.rowTitle}>
            {titre}
          </Link>
        ) : (
          <span className={styles.rowTitle}>{titre}</span>
        )}
        <p className={styles.rowSince}>
          Rien de paru avant le {formatDate(watch.since)} ne t'a été annoncé.
        </p>
        {/* La réponse à « c'est sorti ce matin, pourquoi je n'ai rien ? ». */}
        {watch.next_check_at ? (
          <p className={styles.rowNext}>Prochaine vérification le {formatDate(watch.next_check_at)}.</p>
        ) : null}
      </div>

      <WatchToggle
        target={watch.target === 'saga' ? 'saga' : 'media'}
        id={(saga?.id ?? media?.id) as string}
        watched
      />
    </li>
  )
}
