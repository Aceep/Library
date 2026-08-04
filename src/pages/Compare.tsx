import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchCompare, fetchFollowing } from '../api/endpoints'
import type { CompareResponse } from '../api/schema'
import Cover from '../components/Cover'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import { useSession } from '../session/SessionContext'
import { queryKeys } from '../api/keys'
import styles from './Compare.module.css'

type BothFinished = CompareResponse['both_finished'][number]
type Loved = CompareResponse['loved_by_them'][number]

export default function Compare() {
  const { user } = useSession()

  // `/compare` exige désormais un `user_id` : il n'y a plus de partenaire
  // implicite, donc plus de comparaison par défaut. On propose les comptes
  // suivis, seuls candidats naturels.
  const following = useQuery({
    queryKey: queryKeys.following(user.id),
    queryFn: ({ signal }) => fetchFollowing(user.id, null, signal),
  })

  const [withId, setWithId] = useState<string | null>(null)
  const candidates = following.data?.items ?? []
  const targetId = withId ?? candidates[0]?.user.id ?? null

  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.compareWith(targetId ?? ''),
    queryFn: ({ signal }) => fetchCompare(targetId as string, signal),
    enabled: targetId !== null,
  })

  if (following.isPending) return <p className={styles.loading}>Chargement…</p>
  if (following.error) {
    return <ErrorNotice error={following.error} onRetry={() => void following.refetch()} />
  }

  // Ne suivre personne n'est pas une erreur : c'est un état de départ.
  if (candidates.length === 0) {
    return (
      <div className={styles.page}>
        <Intro />
        <EmptyState
          title="Personne avec qui comparer"
          note="Cette page prendra son sens dès que tu suivras un autre membre de la médiathèque."
        />
      </div>
    )
  }

  const picker =
    candidates.length > 1 ? (
      <label className={styles.picker}>
        Comparer avec
        <select
          value={targetId ?? ''}
          onChange={(event) => setWithId(event.target.value)}
        >
          {candidates.map((entry) => (
            <option key={entry.user.id} value={entry.user.id}>
              {entry.user.pseudo}
            </option>
          ))}
        </select>
      </label>
    ) : null

  if (isPending) {
    return (
      <div className={styles.page}>
        <Intro />
        {picker}
        <p className={styles.loading}>Chargement…</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className={styles.page}>
        <Intro />
        {picker}
        <ErrorNotice error={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  const theirName = data.with.pseudo
  const theirColor = data.with.identity_color

  return (
    <div className={styles.page}>
      <Intro />
      {picker}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Vus par {user.pseudo} et {theirName}</h2>
        {data.both_finished.length === 0 ? (
          <p className={styles.quiet}>
            Aucune œuvre terminée des deux côtés pour l'instant.
          </p>
        ) : (
          <ul className={styles.rows}>
            {/* Le plus gros désaccord d'abord : c'est ce qu'on vient voir. */}
            {[...data.both_finished]
              .sort((a, b) => (b.rating_gap ?? -1) - (a.rating_gap ?? -1))
              .map((entry) => (
                <BothFinishedRow
                  key={entry.media.id}
                  entry={entry}
                  meName={user.pseudo}
                  meColor={user.identity_color}
                  theirName={theirName}
                  theirColor={theirColor}
                />
              ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Les coups de cœur de {theirName}
          <span className={styles.sectionNote}>notés 8 ou plus, que tu n'as pas terminés</span>
        </h2>
        {data.loved_by_them.length === 0 ? (
          <p className={styles.quiet}>
            Rien à te recommander pour le moment — vous avez vu les mêmes choses.
          </p>
        ) : (
          <ul className={styles.lovedGrid}>
            {data.loved_by_them.map((entry) => (
              <LovedCard key={entry.media.id} entry={entry} color={theirColor} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Intro() {
  return (
    <header className={styles.intro}>
      <p className={styles.eyebrow}>Comparer</p>
      <h1 className={styles.title}>Ce que vous avez en commun</h1>
    </header>
  )
}

function BothFinishedRow({
  entry,
  meName,
  meColor,
  theirName,
  theirColor,
}: {
  entry: BothFinished
  meName: string
  meColor: string
  theirName: string
  theirColor: string
}) {
  // `rating_gap` est nul tant que l'un des deux n'a pas noté : on ne l'invente
  // pas en traitant l'absence de note comme un zéro.
  const gap = entry.rating_gap

  return (
    <li className={styles.row}>
      <Link to={`/media/${entry.media.id}`} className={styles.rowLink}>
        <div className={styles.rowCover}>
          <Cover
            url={entry.media.cover_url}
            title={entry.media.title}
            type={entry.media.type}
            size="sm"
          />
        </div>

        <div className={styles.rowBody}>
          <p className={styles.rowTitle}>{entry.media.title}</p>
          {entry.media.year ? <p className={styles.rowYear}>{entry.media.year}</p> : null}
        </div>

        <div className={styles.ratings}>
          <RatingChip name={meName} color={meColor} rating={entry.me.rating} />
          <RatingChip name={theirName} color={theirColor} rating={entry.them.rating} />
        </div>

        <div className={styles.gap}>
          {gap === null ? (
            <span className={styles.gapNone}>pas encore comparable</span>
          ) : gap === 0 ? (
            <span className={styles.gapAgree}>d'accord</span>
          ) : (
            <span className={styles.gapValue} data-strong={gap >= 4}>
              {gap} point{gap > 1 ? 's' : ''} d'écart
            </span>
          )}
        </div>
      </Link>
    </li>
  )
}

function RatingChip({
  name,
  color,
  rating,
}: {
  name: string
  color: string
  rating: number | null
}) {
  return (
    <span className={styles.ratingChip}>
      <span className={styles.ratingDot} style={{ background: color }} aria-hidden="true" />
      <span className={styles.ratingName}>{name}</span>
      <span className={styles.ratingValue}>{rating === null ? '—' : `${rating}/10`}</span>
    </span>
  )
}

function LovedCard({ entry, color }: { entry: Loved; color: string }) {
  return (
    <li className={styles.lovedCard}>
      <Link to={`/media/${entry.media.id}`} className={styles.lovedLink}>
        <Cover
          url={entry.media.cover_url}
          title={entry.media.title}
          type={entry.media.type}
          size="lg"
        />
        <div className={styles.lovedBody}>
          <p className={styles.lovedTitle}>{entry.media.title}</p>
          <p className={styles.lovedRating} style={{ color }}>
            {entry.their_rating}/10
          </p>
          {entry.their_review ? (
            <p className={styles.lovedReview}>« {entry.their_review} »</p>
          ) : null}
        </div>
      </Link>
    </li>
  )
}
