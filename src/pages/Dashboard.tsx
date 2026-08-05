import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { fetchHome, fetchLibrary } from '../api/endpoints'
import type { LibraryFilters } from '../api/endpoints'
import { MEDIA_TYPES, progressRatio, typeLabel, typeLabelPlural } from '../api/schema'
import type { HomeResponse, LibraryItem, MediaType, Page } from '../api/schema'
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

/**
 * La bande de rayons, sous la une.
 *
 * `music` n'est pas un `MediaType` — l'API ne sert pas le rayon — mais il est
 * annoncé au même poids que les cinq autres : la médiathèque se présente pour
 * ce qu'elle vise, et le lien mène à la page qui l'explique.
 */
const RAYONS: { key: string; label: string; to: string }[] = MEDIA_TYPES.map((type) => ({
  key: type as string,
  label: typeLabelPlural(type),
  to: `/bibliotheque/${type}`,
}))

/**
 * Les types qui peuvent avoir des en-cours — c'est-à-dire ceux que
 * `/home` sert, la musique exceptée : un album n'a que deux états, il n'est
 * jamais « en cours ».
 *
 * La liste se déduit de la réponse plutôt que de s'écrire ici. Le jour où le
 * back servirait un rayon de plus, il apparaîtrait tout seul, dans l'ordre
 * d'affichage de `MEDIA_TYPES`.
 */
type InProgressType = keyof HomeResponse['in_progress']

const inProgressTypes = (inProgress: HomeResponse['in_progress']) =>
  MEDIA_TYPES.filter((type): type is InProgressType => type in inProgress)

/** Six entrées suffisent à une bande de couvertures : on n'en télécharge pas 40. */
const RECENT_FILTERS: LibraryFilters = { sort: 'added', limit: 6 }

const QUESTS_NOTE =
  "Les quêtes sont en cours de développement côté API. La place est tenue, rien n'y sera inventé en attendant."

const SUGGESTIONS_NOTE =
  "Les suggestions sont en cours de développement côté API. La place est tenue, rien n'y sera inventé en attendant."

export default function Dashboard() {
  const { user } = useSession()
  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.home,
    queryFn: fetchHome,
  })

  // Le catalogue est une seconde requête, et il ferme la page : elle ne bloque
  // ni le rendu ni le reste. Son échec se dit sur une ligne, il ne remplace pas
  // l'écran par une erreur.
  const recent = useQuery({
    queryKey: queryKeys.libraryWith(RECENT_FILTERS),
    queryFn: ({ signal }) => fetchLibrary(RECENT_FILTERS, null, signal),
  })

  if (isPending) return <p className={styles.loading}>Chargement…</p>
  if (error) return <ErrorNotice error={error} onRetry={() => void refetch()} />

  const groups = inProgressTypes(data.in_progress)
    .map((type) => ({ type, entries: data.in_progress[type] }))
    .filter((group) => group.entries.length > 0)
  const hero = pickHero(data.in_progress)

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Bonjour {user.pseudo}</p>
        <h1 className={styles.title}>Ce qui est ouvert, et ce que le cercle a marqué</h1>
      </header>

      {hero ? <Hero hero={hero} /> : null}

      <nav className={styles.rayons} aria-label="Les rayons">
        {RAYONS.map((rayon) => (
          <Link
            key={rayon.key}
            to={rayon.to}
            className={styles.rayonLink}
            data-media-type={rayon.key}
          >
            {rayon.label}
          </Link>
        ))}
      </nav>

      {/* 01 — les en-cours, en trois colonnes inégales : la première œuvre de
          chaque rayon pèse plus que les deux suivantes. */}
      <section className={styles.section}>
        <SectionHead number="01" kicker="En cours" />
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
          <div className={styles.groups}>
            {groups.map((group) => (
              <div key={group.type} data-media-type={group.type}>
                <h2 className={styles.groupTitle}>{typeLabelPlural(group.type)}</h2>
                <ul className={styles.entries}>
                  {group.entries.map((entry) => (
                    <InProgressCard key={entry.media.id} entry={entry} type={group.type} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <GhostSection
        number="02"
        kicker="Quêtes"
        title="Ce qu'il reste à faire dans un jeu"
        note={QUESTS_NOTE}
      />

      {/* Un fil, plus une colonne : chaque entrée porte son auteur et sa
          couleur, puisqu'il n'y a plus de partenaire unique. */}
      <section className={styles.partnerSection}>
        <SectionHead number="03" kicker="Le carnet" />
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

      <GhostSection
        number="04"
        kicker="Suggestions"
        title="Ce que le cercle a adoré et que tu n'as pas commencé"
        note={SUGGESTIONS_NOTE}
      />

      {/* 05 — le catalogue, en bande de couvertures : la page se ferme sur une
          image, pas sur une liste. */}
      <section className={styles.section}>
        <SectionHead number="05" kicker="Récemment ajouté" />
        <div>
          <h2 className={styles.partnerTitle}>Les dernières entrées au catalogue</h2>
          <RecentRow query={recent} />
        </div>
      </section>
    </div>
  )
}

/**
 * Le numéro et le sourcil d'une section, dans la colonne de marge. Toutes les
 * sections de la une posent la même chrome : elle vit ici, pas cinq fois dans
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

/* ------------------------------------------------------------------ */
/* La une                                                              */
/* ------------------------------------------------------------------ */

interface HeroPick {
  entry: InProgressEntry
  type: MediaType
  /** Éléments restant à cocher, nul sur une œuvre sans rien à cocher. */
  remaining: number | null
}

/**
 * L'œuvre de la une : **celle qu'on est le plus près de finir**.
 *
 * On ne la choisit que parmi les types à cocher — un film à moitié vu n'existe
 * pas dans le contrat, il n'a pas de progression. Si rien n'a de progression,
 * la une prend la première œuvre ouverte et se passe de compte à rebours plutôt
 * que de disparaître.
 */
function pickHero(inProgress: HomeResponse['in_progress']): HeroPick | null {
  const all = inProgressTypes(inProgress).flatMap((type) =>
    inProgress[type].map((entry) => ({ entry, type })),
  )
  if (all.length === 0) return null

  let best: (HeroPick & { ratio: number }) | null = null

  for (const { entry, type } of all) {
    const { progress } = entry
    const ratio = progressRatio(progress)
    // `ratio >= 1` : tout est coché sans que l'œuvre soit sortie des en-cours.
    // Ce n'est pas une œuvre qu'on reprend, c'est une qu'on vient de finir.
    if (!progress || ratio === null || ratio >= 1) continue

    const remaining = progress.total - progress.checked
    // À progression égale, c'est le moins d'éléments restants qui l'emporte :
    // « à deux tomes » invite mieux que « à vingt tomes ».
    const closer =
      !best || ratio > best.ratio || (ratio === best.ratio && remaining < (best.remaining ?? 0))
    if (closer) best = { entry, type, remaining, ratio }
  }

  if (best) return { entry: best.entry, type: best.type, remaining: best.remaining }

  const [first] = all
  return { entry: first.entry, type: first.type, remaining: null }
}

const NUMBER_WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']

/** Le compte à rebours s'écrit en toutes lettres jusqu'à neuf, comme en revue. */
const heroKicker = ({ type, remaining }: HeroPick) => {
  if (remaining === null) return 'En cours'
  const noun = type === 'tv' ? 'épisode' : 'tome'
  if (remaining === 1) return `À un ${noun} de la fin`
  const count = remaining < NUMBER_WORDS.length ? NUMBER_WORDS[remaining] : String(remaining)
  return `À ${count} ${noun}s de la fin`
}

function Hero({ hero }: { hero: HeroPick }) {
  const { media, tracking, progress, next_up: nextUp } = hero.entry

  return (
    <section className={styles.hero} data-media-type={hero.type} aria-label="À la une">
      <Link to={`/media/${media.id}`} className={styles.heroCover}>
        <Cover url={media.cover_url} title={media.title} type={hero.type} ratio="3/4" />
      </Link>

      <div className={styles.heroBody}>
        <p className={styles.heroKicker}>{heroKicker(hero)}</p>
        <h2 className={styles.heroTitle}>
          <Link to={`/media/${media.id}`}>{media.title}</Link>
        </h2>
        <p className={styles.heroMeta}>
          {typeLabel(hero.type)}
          {media.year ? ` · ${media.year}` : ''}
        </p>

        {/* La barre passe à l'ocre et non à la couleur du membre : sur sa propre
            une, la progression n'a personne à désigner — elle appelle à agir. */}
        <div className={styles.heroProgress}>
          <ProgressBar
            progress={progress}
            color="var(--accent-mark)"
            label={`Progression sur ${media.title}`}
          />
        </div>

        <div className={styles.cardTags}>
          {tracking.has_new_content ? <NewContentBadge /> : null}
          {tracking.owned ? <span className={styles.owned}>Possédé</span> : null}
        </div>

        {nextUp ? (
          <Link to={`/media/${media.id}`} className={`${styles.resume} ${styles.heroResume}`}>
            Reprendre&nbsp;: {nextUp.title ?? defaultNextUpLabel(nextUp)}
          </Link>
        ) : null}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Les en-cours                                                        */
/* ------------------------------------------------------------------ */

function InProgressCard({ entry, type }: { entry: InProgressEntry; type: MediaType }) {
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
          <ProgressBar
            progress={progress}
            color="var(--accent-mark)"
            label={`Progression sur ${media.title}`}
          />

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

/* ------------------------------------------------------------------ */
/* Le carnet                                                           */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Récemment ajouté                                                    */
/* ------------------------------------------------------------------ */

function RecentRow({ query }: { query: UseQueryResult<Page<LibraryItem>> }) {
  if (query.isPending) return <p className={styles.quiet}>Chargement…</p>
  // Le catalogue n'est pas la raison d'être de la page : son échec se dit, il
  // ne réclame pas de réessayer.
  if (query.isError) return <p className={styles.quiet}>Le catalogue n'a pas répondu.</p>
  if (query.data.items.length === 0)
    return <p className={styles.quiet}>Le catalogue est encore vide.</p>

  return (
    <ul className={styles.recentRow}>
      {query.data.items.map((item) => (
        <li key={item.id}>
          <Link to={`/media/${item.id}`} className={styles.recentLink}>
            <div className={styles.recentCover}>
              <Cover url={item.cover_url} title={item.title} type={item.type} />
            </div>
            <p className={styles.recentTitle}>{item.title}</p>
            <p className={styles.recentType}>{typeLabel(item.type)}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Les sections que l'API ne sert pas encore                           */
/* ------------------------------------------------------------------ */

/**
 * Une section annoncée, dessinée à vide.
 *
 * Elle prend sa hauteur réelle avec des empreintes de couvertures : la page se
 * juge dans son rythme final, et la place est visiblement réservée plutôt que
 * comblée. Les empreintes sont en filet tireté, jamais en aplat — un aplat gris
 * se lit comme un chargement en cours, ce qui serait un mensonge.
 */
function GhostSection({
  number,
  kicker,
  title,
  note,
}: {
  number: string
  kicker: string
  title: string
  note: string
}) {
  return (
    <section className={styles.section}>
      <SectionHead number={number} kicker={kicker} />
      <div>
        <h2 className={styles.partnerTitle}>{title}</h2>
        <ul className={styles.ghostRow} aria-hidden="true">
          {[0, 1, 2].map((slot) => (
            <li key={slot} className={styles.ghostCard} />
          ))}
        </ul>
        <p className={styles.ghostNote}>{note}</p>
      </div>
    </section>
  )
}
