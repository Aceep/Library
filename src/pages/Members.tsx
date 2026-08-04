import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchUsers } from '../api/endpoints'
import type { UserSummary } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import FollowButton from '../components/FollowButton'
import { useSession } from '../session/SessionContext'
import styles from './Members.module.css'

type Sort = 'pseudo' | 'joined'

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: 'pseudo', label: 'Alphabétique' },
  { value: 'joined', label: 'Arrivée récente' },
]

export default function Members() {
  const { user } = useSession()
  const [sort, setSort] = useState<Sort>('pseudo')
  const [includeDeactivated, setIncludeDeactivated] = useState(false)

  const params = { sort, includeDeactivated }
  const { data, isPending, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.users(params),
      queryFn: ({ pageParam, signal }) => fetchUsers(params, pageParam, signal),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.next_cursor,
    })

  const items = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Médiathèque</p>
        <h1 className={styles.title}>Les membres</h1>
        <p className={styles.lede}>
          Tout est public ici. S'abonner ne demande l'accord de personne et n'ouvre aucun droit
          supplémentaire&nbsp;: ça décide seulement de qui apparaît sur ton accueil et à côté de tes
          œuvres.
        </p>
      </header>

      <div className={styles.filters}>
        <label className={styles.sort}>
          Trier par
          <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* Un compte parti ne s'affiche plus par défaut, mais ce qu'il a écrit
            reste sur les fiches. Ne pas le lister n'est pas l'effacer. */}
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={includeDeactivated}
            onChange={(event) => setIncludeDeactivated(event.target.checked)}
          />
          Montrer les comptes désactivés
        </label>
      </div>

      {isPending ? (
        <p className={styles.loading}>Chargement…</p>
      ) : error ? (
        <ErrorNotice error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Aucun membre" note="La médiathèque n'a pas encore d'autre compte." />
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((entry) => (
              <MemberRow key={entry.user.id} entry={entry} isMe={entry.user.id === user.id} />
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

function MemberRow({ entry, isMe }: { entry: UserSummary; isMe: boolean }) {
  const { user, following_count, followers_count, tracked_count } = entry

  return (
    <li className={styles.row}>
      <Link to={`/membres/${user.id}`} className={styles.rowLink}>
        <span
          className={styles.dot}
          style={{ background: user.identity_color }}
          aria-hidden="true"
        />
        <span className={styles.name}>
          {user.pseudo}
          {isMe ? <span className={styles.tag}>toi</span> : null}
          {user.role === 'admin' ? <span className={styles.tag}>admin</span> : null}
          {/* Mention discrète, jamais un masquage. */}
          {user.deactivated ? <span className={styles.tagQuiet}>compte désactivé</span> : null}
        </span>

        <span className={styles.counts}>
          {tracked_count} œuvre{tracked_count > 1 ? 's' : ''} · {following_count} abonnement
          {following_count > 1 ? 's' : ''} · {followers_count} abonné
          {followers_count > 1 ? 's' : ''}
        </span>
      </Link>

      {/* On ne s'abonne pas à soi-même : le bouton n'existe pas, il n'est pas
          désactivé. */}
      {isMe ? null : (
        <FollowButton
          userId={user.id}
          following={entry.followed_by_me}
          pseudo={user.pseudo}
          size="sm"
        />
      )}
    </li>
  )
}
