import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchFollowers, fetchFollowing, fetchUser } from '../api/endpoints'
import type { UserSummary } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import ErrorNotice from '../components/ErrorNotice'
import FollowButton from '../components/FollowButton'
import { useSession } from '../session/SessionContext'
import styles from './UserProfile.module.css'

type Tab = 'following' | 'followers'

export default function UserProfile() {
  const { id } = useParams()
  if (!id) return null
  return <Profile key={id} id={id} />
}

function Profile({ id }: { id: string }) {
  const { user: me } = useSession()
  const [tab, setTab] = useState<Tab>('following')
  const isMe = id === me.id

  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.user(id),
    queryFn: ({ signal }) => fetchUser(id, signal),
  })

  if (isPending) return <p className={styles.loading}>Chargement…</p>
  if (error) return <ErrorNotice error={error} onRetry={() => void refetch()} />

  const { user } = data

  return (
    <div className={styles.page}>
      <p className={styles.breadcrumb}>
        <Link to="/membres">Les membres</Link>
      </p>

      <header className={styles.header}>
        <span
          className={styles.dot}
          style={{ background: user.identity_color }}
          aria-hidden="true"
        />
        <div className={styles.headerBody}>
          <h1 className={styles.title}>
            {user.pseudo}
            {isMe ? <span className={styles.tag}>toi</span> : null}
            {user.role === 'admin' ? <span className={styles.tag}>admin</span> : null}
          </h1>
          {/* Un compte désactivé se mentionne, il ne se cache pas : ce qu'il a
              écrit reste sur les fiches et garde son auteur. */}
          {user.deactivated ? (
            <p className={styles.deactivated}>
              Ce compte est désactivé. Ce qu'il a écrit reste en place et lui reste attribué.
            </p>
          ) : null}
          <p className={styles.joined}>Membre depuis le {formatDate(data.joined_at)}</p>
        </div>

        {isMe ? null : (
          <FollowButton userId={user.id} following={data.followed_by_me} pseudo={user.pseudo} />
        )}
      </header>

      <dl className={styles.counters}>
        <Counter label="Œuvres suivies" value={data.tracked_count} />
        <Counter label="Abonnements" value={data.following_count} />
        <Counter label="Abonnés" value={data.followers_count} />
      </dl>

      {/* Comparer n'a de sens qu'avec quelqu'un d'autre, et seulement si je le
          suis — c'est ce que la page Comparer sait proposer. */}
      {!isMe && data.followed_by_me ? (
        <p className={styles.compareLink}>
          <Link to="/comparer">Comparer vos bibliothèques</Link>
        </p>
      ) : null}

      <nav className={styles.tabs} aria-label="Relations">
        <button
          type="button"
          className={styles.tab}
          aria-pressed={tab === 'following'}
          onClick={() => setTab('following')}
        >
          Abonnements ({data.following_count})
        </button>
        <button
          type="button"
          className={styles.tab}
          aria-pressed={tab === 'followers'}
          onClick={() => setTab('followers')}
        >
          Abonnés ({data.followers_count})
        </button>
      </nav>

      <RelationList key={tab} userId={id} tab={tab} meId={me.id} />
    </div>
  )
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.counter}>
      <dt className={styles.counterLabel}>{label}</dt>
      <dd className={styles.counterValue}>{value}</dd>
    </div>
  )
}

function RelationList({ userId, tab, meId }: { userId: string; tab: Tab; meId: string }) {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: tab === 'following' ? queryKeys.following(userId) : queryKeys.followers(userId),
    queryFn: ({ signal }) =>
      tab === 'following'
        ? fetchFollowing(userId, null, signal)
        : fetchFollowers(userId, null, signal),
  })

  if (isPending) return <p className={styles.loading}>Chargement…</p>
  if (error) return <ErrorNotice error={error} onRetry={() => void refetch()} />

  if (data.items.length === 0) {
    return (
      <p className={styles.quiet}>
        {tab === 'following' ? 'Ce compte ne suit personne.' : "Personne ne suit ce compte."}
      </p>
    )
  }

  return (
    <ul className={styles.relations}>
      {data.items.map((entry) => (
        <RelationRow key={entry.user.id} entry={entry} isMe={entry.user.id === meId} />
      ))}
    </ul>
  )
}

function RelationRow({ entry, isMe }: { entry: UserSummary; isMe: boolean }) {
  return (
    <li className={styles.relation}>
      <Link to={`/membres/${entry.user.id}`} className={styles.relationLink}>
        <span
          className={styles.relationDot}
          style={{ background: entry.user.identity_color }}
          aria-hidden="true"
        />
        <span className={styles.relationName}>{entry.user.pseudo}</span>
        {entry.user.deactivated ? (
          <span className={styles.tagQuiet}>compte désactivé</span>
        ) : null}
      </Link>
      {isMe ? null : (
        <FollowButton
          userId={entry.user.id}
          following={entry.followed_by_me}
          pseudo={entry.user.pseudo}
          size="sm"
        />
      )}
    </li>
  )
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
