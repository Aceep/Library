import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchFollowers, fetchFollowing, fetchStats, fetchUser } from '../api/endpoints'
import type { UserSummary } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import type { MediaType, UserDetail } from '../api/schema'
import BadgeMedal from '../components/BadgeMedal'
import LoadingNotice from '../components/LoadingNotice'
import ErrorNotice from '../components/ErrorNotice'
import FollowButton from '../components/FollowButton'
import MemberChip from '../components/MemberChip'
import MemberLibrary from '../components/MemberLibrary'
import Reveal from '../components/Reveal'
import Showcase from '../components/Showcase'
import { useSession } from '../session/SessionContext'
import { useDocumentTitle } from '../components/useDocumentTitle'
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

  useDocumentTitle(data?.user.pseudo ?? null)

  /*
    Le cadre ne dépend d'aucune requête : il est là dès la première peinture.
    Avant, ces écrans se réduisaient à une ligne de texte pendant le chargement
    — l'en-tête, le repère de contenu et la position de défilement partaient
    avec, pour revenir une fraction de seconde plus tard.
  */
  if (isPending || error) {
    return (
      <div className={styles.page}>
        <p className={styles.breadcrumb}>
          <Link to="/membres">Les membres</Link>
        </p>
        {isPending ? <LoadingNotice /> : <ErrorNotice error={error} onRetry={() => void refetch()} />}
      </div>
    )
  }

  const { user } = data

  return (
    <div className={styles.page}>
      <p className={styles.breadcrumb}>
        <Link to="/membres">Les membres</Link>
      </p>

      {/*
        L'en-tête d'un membre : sa pastille en grand, un filet de son encre, la
        date d'entrée. L'encre n'est portée que par la pastille et le filet —
        un membre est une pastille **bordée**, jamais un aplat ; c'est ce qui le
        distingue d'un rayon sur une même ligne.
      */}
      <header className={styles.header}>
        <div className={styles.headerMarks} style={{ '--identity': user.identity_color } as CSSProperties}>
          <MemberChip account={user} size="lg" />
          <span className={styles.headerRule} aria-hidden="true" />
          <span className={styles.joined}>du cercle depuis le {formatDate(data.joined_at)}</span>
        </div>

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
        </div>

        {isMe ? null : (
          <FollowButton userId={user.id} following={data.followed_by_me} pseudo={user.pseudo} />
        )}
      </header>

      <Releve
        userId={id}
        detail={data}
        color={user.identity_color}
        possessif={isMe ? 'Mes' : 'Ses'}
      />

      <Showcase
        userId={id}
        pseudo={user.pseudo}
        showcase={data.showcase}
        isMe={isMe}
      />

      <BadgeShelf badges={data.badges} isMe={isMe} pseudo={user.pseudo} />

      {/* Les statistiques sont publiques comme le reste du profil. */}
      <p className={styles.compareLink}>
        <Link to={isMe ? '/statistiques' : `/statistiques?membre=${id}`}>
          {isMe ? 'Mes statistiques' : `Les statistiques de ${user.pseudo}`}
        </Link>
      </p>

      {isMe ? (
        <p className={styles.compareLink}>
          <Link to="/mon-compte">Modifier ma couleur, mon avatar ou mon mot de passe</Link>
        </p>
      ) : null}

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

      {/* Le compteur « œuvres suivies » ne s'ouvrait sur rien : la moitié de
          l'aller-retour manquait. On savait déplier « qui suit cette œuvre »,
          pas « quelles œuvres suit ce membre ». */}
      <MemberLibrary
        userId={id}
        pseudo={user.pseudo}
        isMe={isMe}
        me={me}
        trackedCount={data.tracked_count}
      />
    </div>
  )
}

/**
 * Les badges obtenus, le plus récent d'abord — l'ordre vient de l'API.
 *
 * Publics comme le reste du profil : c'est là qu'ils se voient, et c'est ce qui
 * leur donne leur sens. Rien ne s'affiche quand il n'y en a pas — sur le profil
 * d'un autre, une section vide raconterait qu'il n'a rien gagné, ce qui n'est
 * pas une information à mettre en avant. Pour moi, l'écran des badges dit ce
 * qu'il reste à faire ; le profil se contente de montrer.
 */
function BadgeShelf({
  badges,
  isMe,
  pseudo,
}: {
  badges: UserDetail['badges']
  isMe: boolean
  pseudo: string
}) {
  if (badges.length === 0) return null

  return (
    <section className={styles.badges}>
      <h2 className={styles.badgesTitle}>
        {isMe ? 'Mes badges' : `Les badges de ${pseudo}`}
      </h2>
      <ul className={styles.badgeList}>
        {badges.map((badge) => (
          <li key={badge.id}>
            <BadgeMedal
              badge={badge}
              obtenu
              size="sm"
              note={`Obtenu le ${formatDate(badge.awarded_at)}`}
            />
          </li>
        ))}
      </ul>
      {isMe ? (
        <p className={styles.badgesMore}>
          <Link to="/badges">Voir ce qu’il reste à obtenir</Link>
        </p>
      ) : null}
    </section>
  )
}

/**
 * Le relevé — le seul endroit du produit où l'on chiffre.
 *
 * L'amendement 01 de la direction lève l'interdiction des graphiques, mais
 * **sur un profil et nulle part ailleurs**, et à des conditions de forme : des
 * blocs d'encre réglés, aucun axe, aucune légende, aucune infobulle, et des
 * chiffres composés en serif comme un colophon. Une barre arrondie, une grille
 * de fond ou un dégradé rendraient ce bloc irrecevable.
 *
 * Ce qui n'y figure pas, et pourquoi : la maquette montre une activité **année
 * par année**, or `/stats` découpe en semaine, mois, année et total — il n'y a
 * pas de série annuelle à afficher. On ne la fabrique pas à partir d'autre
 * chose.
 */
function Releve({
  userId,
  detail,
  color,
  possessif,
}: {
  userId: string
  detail: UserDetail
  color: string
  possessif: string
}) {
  // Le tableau de bord d'un membre est public, comme le reste du profil. Il
  // arrive après le profil et sans le bloquer : le relevé se dessine quand il
  // est là, le reste de l'écran n'attend pas.
  const { data, error } = useQuery({
    queryKey: queryKeys.stats(userId),
    queryFn: ({ signal }) => fetchStats(userId, null, signal),
  })

  /*
    Le relevé se tait quand il n'a pas pu être lu.

    Sans cette branche, `dashboard` restait `null` et chaque `Figure` affichait
    son tiret : « note moyenne — », « terminées — ». Or le tiret dit *rien de
    noté*, pas *rien de su*. C'est exactement la distinction que le reste du
    dépôt défend (« zéro d'ignorance » contre « zéro d'inaction »), et la
    laisser filer ici ferait mentir le profil sur ce que le membre a fait.
  */
  if (error) {
    return (
      <Reveal className={styles.releve}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            Le <em>relevé</em>
          </h2>
        </div>
        <p className={styles.panne}>Le relevé n’a pas pu être chargé.</p>
      </Reveal>
    )
  }

  const dashboard = data?.dashboard ?? null
  const notes = dashboard?.highlights.ratings ?? null

  const parRayon = MEDIA_TYPES.filter((type) => detail.counts.by_type[type] > 0).map((type) => ({
    key: type,
    label: typeLabelPlural(type),
    value: detail.counts.by_type[type],
    type,
  }))

  return (
    <Reveal className={styles.releve}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          Le <em>relevé</em>
        </h2>
        <span className={styles.sectionNote}>ce que le fonds en a gardé</span>
      </div>

      <div className={styles.figures}>
        <Figure n={detail.tracked_count} label="œuvres suivies" color={color} />
        <Figure n={dashboard?.periods.all.counts.finished ?? null} label="terminées" color={color} />
        <Figure
          n={notes?.average ?? null}
          label="note moyenne"
          color={color}
        />
        <Figure n={detail.followers_count} label="abonnés" color={color} />
      </div>

      <div className={styles.releveBody}>
        {parRayon.length > 0 ? (
          <div>
            <p className={styles.releveLabel}>Par rayon</p>
            {/* Les barres prennent le gel de leur rayon : c'est l'un des deux
                seuls emplacements du gel avec la nav du bandeau et les
                étiquettes de médium. */}
            <Barres rows={parRayon} legend="œuvres suivies" />
          </div>
        ) : null}

        {notes && notes.distribution.length > 0 ? (
          <div>
            <p className={styles.releveLabel}>{possessif} notes</p>
            <Barres
              rows={notes.distribution.map((entry) => ({
                key: String(entry.rating),
                label: String(entry.rating),
                value: entry.count,
              }))}
              legend="œuvres notées"
              color={color}
            />
          </div>
        ) : null}
      </div>
    </Reveal>
  )
}

/**
 * Un chiffre de colophon : composé en serif, à la taille d'un titre, dans
 * l'encre du membre. Jamais une tuile encadrée — la direction range les « stat
 * tiles » parmi ses critères de rejet.
 */
function Figure({ n, label, color }: { n: number | null; label: string; color: string }) {
  return (
    <div className={styles.figure}>
      <span className={styles.figureValue} style={{ color }}>
        {/* Une mesure absente se dit, elle ne se remplace pas par zéro : « 0 de
            moyenne » et « personne n'a noté » ne veulent pas dire la même
            chose. */}
        {n === null ? '—' : n.toLocaleString('fr-FR')}
      </span>
      <span className={styles.figureLabel}>{label}</span>
    </div>
  )
}

/**
 * Des blocs d'encre réglés, et rien d'autre.
 *
 * `--part` est une dimension calculée, et `--identity` une couleur venue du
 * réseau : les deux seuls usages normaux du style en ligne. La croissance est
 * une animation d'échelle, **jouée une fois** à la révélation de la section.
 */
function Barres({
  rows,
  legend,
  color,
}: {
  rows: { key: string; label: string; value: number; type?: MediaType }[]
  legend: string
  color?: string
}) {
  const max = Math.max(...rows.map((row) => row.value), 0)

  return (
    <ul className={styles.barres}>
      {rows.map((row) => (
        <li
          key={row.key}
          className={styles.barre}
          data-media-type={row.type}
          style={
            {
              '--part': max > 0 ? `${(row.value / max) * 100}%` : '0%',
              ...(color ? { '--identity': color } : {}),
            } as CSSProperties
          }
        >
          <span className={row.type ? styles.barreRayon : styles.barreNote}>{row.label}</span>
          <span className={styles.barreTrace} aria-hidden="true" />
          <span className={styles.barreValeur}>
            {row.value}
            <span className="sr-only"> {legend}</span>
          </span>
        </li>
      ))}
    </ul>
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

  if (isPending) return <LoadingNotice />
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
