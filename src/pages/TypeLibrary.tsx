import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchLibrary } from '../api/endpoints'
import type { LibraryFilters, LibrarySort } from '../api/endpoints'
import { MEDIA_TYPES, isDerivedStatusType, statusLabel, typeLabelPlural } from '../api/schema'
import type { LibraryItem, MediaType, TrackingStatus, UserTracking } from '../api/schema'
import Cover from '../components/Cover'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import ProgressBar from '../components/ProgressBar'
import StatusBadge, { NewContentBadge } from '../components/StatusBadge'
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
  const { user, partner } = useSession()
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
              <MediaCard
                key={item.id}
                item={item}
                meColor={user.identity_color}
                mePseudo={user.pseudo}
                partnerColor={partner?.identity_color ?? null}
                partnerPseudo={partner?.pseudo ?? null}
              />
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

function MediaCard({
  item,
  meColor,
  mePseudo,
  partnerColor,
  partnerPseudo,
}: {
  item: LibraryItem
  meColor: string
  mePseudo: string
  partnerColor: string | null
  partnerPseudo: string | null
}) {
  return (
    <li className={styles.card}>
      <Link to={`/media/${item.id}`} className={styles.cardLink}>
        <Cover url={item.cover_url} title={item.title} type={item.type} size="lg" />

        <div className={styles.cardBody}>
          <p className={styles.cardTitle}>{item.title}</p>
          {item.year ? <p className={styles.cardYear}>{item.year}</p> : null}

          {/* Nul sur les types sans éléments à cocher : le composant s'efface. */}
          <ProgressBar
            progress={item.progress}
            color={meColor}
            label={`Progression sur ${item.title}`}
          />

          <div className={styles.trackings}>
            <TrackingLine
              tracking={item.tracking.me}
              color={meColor}
              pseudo={mePseudo}
              type={item.type}
            />
            {partnerColor && partnerPseudo ? (
              <TrackingLine
                tracking={item.tracking.partner}
                color={partnerColor}
                pseudo={partnerPseudo}
                type={item.type}
              />
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  )
}

/**
 * Une ligne par compte. Un suivi `null` n'est pas un `todo` : c'est « ne suit
 * pas du tout cette œuvre », et les deux ne se disent pas de la même façon.
 */
function TrackingLine({
  tracking,
  color,
  pseudo,
  type,
}: {
  tracking: UserTracking | null
  color: string
  pseudo: string
  type: MediaType
}) {
  return (
    <div className={styles.trackingLine}>
      <span className={styles.trackingDot} style={{ background: color }} aria-hidden="true" />
      <span className={styles.trackingName}>{pseudo}</span>
      {tracking ? (
        <span className={styles.trackingTags}>
          <StatusBadge status={tracking.status} />
          {tracking.rating !== null ? (
            <span className={styles.rating}>{tracking.rating}/10</span>
          ) : null}
          {tracking.owned ? <span className={styles.owned}>Possédé</span> : null}
          {/* « Du neuf » n'a de sens que là où du contenu peut s'ajouter. */}
          {tracking.has_new_content && isDerivedStatusType(type) ? <NewContentBadge /> : null}
        </span>
      ) : (
        <span className={styles.notTracked}>ne suit pas</span>
      )}
    </div>
  )
}
