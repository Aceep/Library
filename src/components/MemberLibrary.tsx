import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchMemberLibrary } from '../api/endpoints'
import type { MemberLibraryFilters, MemberLibrarySort } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import { MEDIA_TYPES, statusLabel, typeLabelPlural } from '../api/schema'
import type { Account, MediaType, TrackingStatus } from '../api/schema'
import ErrorNotice from './ErrorNotice'
import MediaCard from './MediaCard'
import styles from './MemberLibrary.module.css'

const STATUS_FILTERS: Array<{ value: TrackingStatus | null; label: string }> = [
  { value: null, label: 'Tout' },
  { value: 'todo', label: statusLabel('todo') },
  { value: 'doing', label: statusLabel('doing') },
  { value: 'done', label: statusLabel('done') },
]

const SORTS: Array<{ value: MemberLibrarySort; label: string }> = [
  { value: 'rating', label: 'Ses meilleures notes' },
  { value: 'added', label: 'Ajout récent' },
  { value: 'title', label: 'Titre' },
]

/**
 * Ce qu'un membre suit — le compteur de son profil, déplié.
 *
 * Le piège de cet écran est que les filtres n'y portent pas sur ce qu'on croit :
 * `status` et `favorite` s'appliquent à **son** suivi à lui, alors qu'ils
 * portent sur le mien partout ailleurs. Les libellés le disent en toutes
 * lettres — c'est la seule protection, l'API ne peut pas le deviner.
 */
export default function MemberLibrary({
  userId,
  pseudo,
  isMe,
  me,
  trackedCount,
}: {
  userId: string
  pseudo: string
  isMe: boolean
  me: Account
  trackedCount: number
}) {
  const [type, setType] = useState<MediaType | null>(null)
  const [status, setStatus] = useState<TrackingStatus | null>(null)
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  // Le défaut est celui de l'API, et il n'est pas le même qu'en rayon : on
  // vient ici voir ce qu'il a préféré, pas ce qu'il vient d'ajouter.
  const [sort, setSort] = useState<MemberLibrarySort>('rating')

  const filters: MemberLibraryFilters = {
    type: type ?? undefined,
    status,
    favorite: favoriteOnly ? true : null,
    sort,
  }

  const list = useInfiniteQuery({
    queryKey: queryKeys.memberLibrary(userId, filters),
    queryFn: ({ pageParam, signal }) => fetchMemberLibrary(userId, filters, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  })

  const items = list.data?.pages.flatMap((page) => page.items) ?? []
  const filtered = type !== null || status !== null || favoriteOnly

  if (trackedCount === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.heading}>{isMe ? 'Ma bibliothèque' : 'Sa bibliothèque'}</h2>
        <p className={styles.quiet}>
          {isMe ? "Tu ne suis encore aucune œuvre." : `${pseudo} ne suit encore aucune œuvre.`}
        </p>
      </section>
    )
  }

  const possessive = isMe ? 'tes' : 'ses'

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{isMe ? 'Ma bibliothèque' : 'Sa bibliothèque'}</h2>

      <div className={styles.filters}>
        <div className={styles.filterGroup} role="group" aria-label="Filtrer par type">
          <button
            type="button"
            className={styles.chip}
            aria-pressed={type === null}
            onClick={() => setType(null)}
          >
            Tout
          </button>
          {MEDIA_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              className={styles.chip}
              aria-pressed={type === value}
              onClick={() => setType(value)}
            >
              {typeLabelPlural(value)}
            </button>
          ))}
        </div>

        <div
          className={styles.filterGroup}
          role="group"
          aria-label={`Filtrer sur ${possessive} statuts`}
        >
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
            checked={favoriteOnly}
            onChange={(event) => setFavoriteOnly(event.target.checked)}
          />
          {isMe ? 'Mes coups de cœur' : 'Ses coups de cœur'}
        </label>

        <label className={styles.sort}>
          Trier par
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as MemberLibrarySort)}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Sans cette ligne, on filtre « en cours » et on croit voir ce qu'on a
          soi-même en cours. C'est l'inverse de partout ailleurs. */}
      <p className={styles.perspective}>
        Statut et coups de cœur portent sur {possessive} suivis
        {isMe ? '' : ` à ${pseudo}`}. Les notes affichées sous chaque vignette restent celles de
        tout le monde.
      </p>

      {list.isPending ? (
        <p className={styles.quiet}>Chargement…</p>
      ) : list.error ? (
        <ErrorNotice error={list.error} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <p className={styles.quiet}>
          {filtered
            ? 'Aucune œuvre ne correspond au filtre actif.'
            : 'Rien à afficher ici.'}
        </p>
      ) : (
        <>
          <ul className={styles.grid}>
            {items.map((item) => (
              <MediaCard key={item.id} item={item} me={me} />
            ))}
          </ul>

          {list.hasNextPage ? (
            <div className={styles.more}>
              <button
                type="button"
                className={styles.moreButton}
                onClick={() => void list.fetchNextPage()}
                disabled={list.isFetchingNextPage}
              >
                {list.isFetchingNextPage ? 'Chargement…' : 'Charger la suite'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
