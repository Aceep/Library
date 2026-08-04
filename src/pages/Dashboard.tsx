import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchHome } from '../api/endpoints'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import type { HomeResponse, MediaType } from '../api/schema'
import Cover from '../components/Cover'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import ProgressBar from '../components/ProgressBar'
import { NewContentBadge } from '../components/StatusBadge'
import { useSession } from '../session/SessionContext'
import { queryKeys } from '../api/keys'
import styles from './Dashboard.module.css'

type InProgressEntry = HomeResponse['in_progress']['book'][number]
type FeedEntry = HomeResponse['feed'][number]

export default function Dashboard() {
  const { user } = useSession()
  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.home,
    queryFn: fetchHome,
  })

  if (isPending) return <p className={styles.loading}>Chargement…</p>
  if (error) return <ErrorNotice error={error} onRetry={() => void refetch()} />

  const groups = MEDIA_TYPES.map((type) => ({ type, entries: data.in_progress[type] })).filter(
    (group) => group.entries.length > 0,
  )

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Bonjour {user.pseudo}</p>
        <h1 className={styles.title}>Ce qui est ouvert, et ce que le cercle a marqué</h1>
      </header>

      {groups.length === 0 ? (
        <EmptyState
          title="Rien en cours pour le moment"
          note="Dès que tu commenceras une œuvre, elle apparaîtra ici avec de quoi la reprendre."
          action={
            <Link to="/recherche" className={styles.emptyAction}>
              Ajouter une œuvre
            </Link>
          }
        />
      ) : (
        /* 01 — les en-cours, en trois colonnes inégales : la première œuvre de
           chaque rayon pèse plus que les deux suivantes. */
        <section className={styles.section}>
          <SectionHead number="01" kicker="En cours" />
          <div className={styles.groups}>
            {groups.map((group) => (
              <div key={group.type}>
                <h2 className={styles.groupTitle}>{typeLabelPlural(group.type)}</h2>
                <ul className={styles.entries}>
                  {group.entries.map((entry) => (
                    <InProgressCard
                      key={entry.media.id}
                      entry={entry}
                      type={group.type}
                      color={user.identity_color}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Un fil, plus une colonne : chaque entrée porte son auteur et sa
          couleur, puisqu'il n'y a plus de partenaire unique. */}
      <section className={styles.partnerSection}>
        <SectionHead number="02" kicker="Le carnet" />
        <div>
          <h2 className={styles.partnerTitle}>
            {data.following_count > 0
              ? `Le carnet du cercle · ${data.following_count} comptes suivis`
              : 'Le carnet du cercle'}
          </h2>
          {data.feed.length === 0 ? (
            <p className={styles.quiet}>
              {data.following_count === 0
                ? "Tu ne suis personne pour l'instant : ce fil se remplira dès que ce sera le cas."
                : 'Rien de neuf ces trente derniers jours.'}
            </p>
          ) : (
            <ul className={styles.activity}>
              {data.feed.map((item) => (
                <ActivityRow
                  key={`${item.user.id}-${item.kind}-${item.media.id}-${item.at}`}
                  item={item}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

/**
 * Le numéro et le sourcil d'une section, dans la colonne de marge. Les deux
 * sections de la une posent la même chrome : elle vit ici, pas deux fois dans
 * le corps de la page.
 */
function SectionHead({ number, kicker }: { number: string; kicker: string }) {
  return (
    <div>
      <div className={styles.sectionNumber}>{number}</div>
      <div className={styles.sectionKicker}>{kicker}</div>
    </div>
  )
}

function InProgressCard({
  entry,
  type,
  color,
}: {
  entry: InProgressEntry
  type: MediaType
  color: string
}) {
  const { media, tracking, progress, next_up: nextUp } = entry

  return (
    <li className={styles.card}>
      <Link to={`/media/${media.id}`} className={styles.cardLink}>
        <div className={styles.cardCover}>
          <Cover url={media.cover_url} title={media.title} type={type} />
        </div>
        <div className={styles.cardBody}>
          <p className={styles.cardTitle}>{media.title}</p>
          {media.year ? <p className={styles.cardYear}>{media.year}</p> : null}

          {/* `progress` est nul sur les types sans éléments à cocher. */}
          <ProgressBar progress={progress} color={color} label={`Progression sur ${media.title}`} />

          <div className={styles.cardTags}>
            {tracking.has_new_content ? <NewContentBadge /> : null}
            {tracking.owned ? <span className={styles.owned}>Possédé</span> : null}
          </div>
        </div>
      </Link>

      {/* `next_up` est nul quand tout est coché : on masque le bouton, on ne
          l'affiche pas désactivé. */}
      {nextUp ? (
        <Link to={`/media/${media.id}`} className={styles.resume}>
          Reprendre&nbsp;: {nextUp.title ?? defaultNextUpLabel(nextUp)}
        </Link>
      ) : null}
    </li>
  )
}

const defaultNextUpLabel = (nextUp: NonNullable<InProgressEntry['next_up']>) =>
  nextUp.kind === 'episode'
    ? `S${nextUp.season_number}E${String(nextUp.number).padStart(2, '0')}`
    : `Tome ${nextUp.number}`

const ACTIVITY_VERB: Record<FeedEntry['kind'], string> = {
  finished: 'a terminé',
  rated: 'a noté',
  started: 'a commencé',
}

function ActivityRow({ item }: { item: FeedEntry }) {
  return (
    // La couleur du membre arrive en runtime et ne descend que par `--identity` :
    // elle n'est jamais écrite en CSS. Ici elle teinte la note, composée en
    // Newsreader comme un chiffre de notice.
    <li
      className={styles.activityRow}
      style={{ '--identity': item.user.identity_color } as CSSProperties}
    >
      {/* Deux liens distincts plutôt qu'un lien dans un lien : l'auteur mène à
          son profil, le reste de la ligne mène à l'œuvre. */}
      <Link
        to={`/membres/${item.user.id}`}
        className={styles.activityAuthorLink}
        title={`Le profil de ${item.user.pseudo}`}
      >
        <span
          className={styles.activityDot}
          style={{ background: item.user.identity_color }}
          aria-hidden="true"
        />
        <span className={styles.activityAuthor}>{item.user.pseudo}</span>
      </Link>

      <Link to={`/media/${item.media.id}`} className={styles.activityLink}>
        <Cover url={item.media.cover_url} title={item.media.title} type={item.media.type} size="sm" />
        <span className={styles.activityText}>
          <span className={styles.activityVerb}>{ACTIVITY_VERB[item.kind]}</span>{' '}
          <span className={styles.activityTitle}>{item.media.title}</span>
          {item.rating !== null ? <span className={styles.activityRating}>{item.rating}/10</span> : null}
          {item.review ? <span className={styles.activityReview}>« {item.review} »</span> : null}
        </span>
        <time className={styles.activityDate} dateTime={item.at}>
          {formatDay(item.at)}
        </time>
      </Link>
    </li>
  )
}

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
