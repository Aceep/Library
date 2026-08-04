import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchLibrary } from '../api/endpoints'
import type { LibraryFilters, LibrarySort } from '../api/endpoints'
import { MEDIA_TYPES, statusLabel, typeLabelPlural } from '../api/schema'
import type { MediaType, TrackingStatus } from '../api/schema'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import MediaCard from '../components/MediaCard'
import { useSession } from '../session/SessionContext'
import { queryKeys } from '../api/keys'
import styles from './TypeLibrary.module.css'

const STATUS_FILTERS: Array<{ value: TrackingStatus | null; label: string }> = [
  { value: null, label: 'Tout' },
  { value: 'todo', label: statusLabel('todo') },
  { value: 'doing', label: statusLabel('doing') },
  { value: 'done', label: statusLabel('done') },
]

const SORTS: Array<{ value: LibrarySort; label: string }> = [
  { value: 'added', label: 'Ajout récent' },
  { value: 'title', label: 'Titre' },
]

const isMediaType = (value: string | undefined): value is MediaType =>
  MEDIA_TYPES.includes(value as MediaType)

export default function TypeLibrary() {
  const { type } = useParams()
  if (!isMediaType(type)) return <Navigate to="/" replace />
  // `key` remet les filtres à zéro quand on change de rayon : sans ça, on
  // garderait le filtre du type précédent en arrivant sur le suivant.
  return <Library key={type} type={type} />
}

function Library({ type }: { type: MediaType }) {
  const { user } = useSession()
  const [status, setStatus] = useState<TrackingStatus | null>(null)
  const [ownedOnly, setOwnedOnly] = useState(false)
  const [sort, setSort] = useState<LibrarySort>('added')

  const filters: LibraryFilters = { type, status, owned: ownedOnly ? true : null, sort }

  const { data, isPending, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.libraryWith(filters),
      queryFn: ({ pageParam, signal }) => fetchLibrary(filters, pageParam, signal),
      initialPageParam: null as string | null,
      // Le curseur est opaque : on le relaie sans l'interpréter. `null` marque
      // la dernière page — c'est le seul signal d'arrêt fiable, une page peut
      // très bien être plus courte que `limit` sans être la dernière.
      getNextPageParam: (lastPage) => lastPage.next_cursor,
    })

  const items = data?.pages.flatMap((page) => page.items) ?? []
  const filtered = status !== null || ownedOnly

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Bibliothèque</p>
        <h1 className={styles.title}>{typeLabelPlural(type)}</h1>
      </header>

      <div className={styles.filters}>
        <div className={styles.filterGroup} role="group" aria-label="Filtrer par statut">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              className={styles.chip}
              aria-pressed={status === filter.value}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(event) => setOwnedOnly(event.target.checked)}
          />
          Possédés seulement
        </label>

        <label className={styles.sort}>
          Trier par
          <select value={sort} onChange={(event) => setSort(event.target.value as LibrarySort)}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isPending ? (
        <p className={styles.loading}>Chargement…</p>
      ) : error ? (
        <ErrorNotice error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune œuvre ici"
          note={
            filtered
              ? 'Aucune œuvre de ce rayon ne correspond au filtre actif.'
              : "Ce rayon est encore vide. Ajoute une œuvre depuis la recherche pour le remplir."
          }
          action={
            <Link to="/recherche" className={styles.emptyAction}>
              Ajouter une œuvre
            </Link>
          }
        />
      ) : (
        <>
          <ul className={styles.grid}>
            {items.map((item) => (
              <MediaCard key={item.id} item={item} me={user} />
            ))}
          </ul>

          {/* Pas de défilement infini : on charge sur demande, pour que la
              position dans la page reste sous le contrôle de l'utilisateur. */}
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
          ) : (
            <p className={styles.end}>
              {items.length} œuvre{items.length > 1 ? 's' : ''} dans ce rayon.
            </p>
          )}
        </>
      )}
    </div>
  )
}
