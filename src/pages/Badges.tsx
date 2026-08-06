import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchQuests, fetchUser } from '../api/endpoints'
import type { AwardedBadge, QuestSummary } from '../api/schema'
import { queryKeys } from '../api/keys'
import { useSession } from '../session/SessionContext'
import BadgeMedal from '../components/BadgeMedal'
import EmptyState from '../components/EmptyState'
import LoadingNotice from '../components/LoadingNotice'
import ErrorNotice from '../components/ErrorNotice'
import { useDocumentTitle } from '../components/useDocumentTitle'
import styles from './Badges.module.css'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Mes badges — ceux que j'ai, et ceux qui restent.
 *
 * **Deux sources, et c'est la difficulté de l'écran.** L'API n'a pas de route
 * « mes badges » : les badges obtenus arrivent avec mon profil public
 * (`GET /users/:id`), datés ; ceux qui restent à obtenir se déduisent des
 * quêtes, chacune portant le sien et ma progression dessus. Rien à réconcilier
 * côté serveur — il faut le faire ici, et ne compter personne deux fois.
 *
 * La jonction se fait sur l'identifiant du badge et non sur celui de la quête :
 * un badge de genre `milestone` (§14) n'aura jamais de quête, et se rangera
 * quand même du bon côté le jour où il existera.
 */
export default function Badges() {
  useDocumentTitle('Badges')
  const { user, isAdmin } = useSession()

  const profil = useQuery({
    queryKey: queryKeys.user(user.id),
    queryFn: ({ signal }) => fetchUser(user.id, signal),
  })

  const quetes = useQuery({
    queryKey: queryKeys.quests,
    queryFn: ({ signal }) => fetchQuests(signal),
  })

  // Quatre gardes plutôt que deux : c'est ce qui permet au compilateur de
  // conclure que les deux réponses sont là, et à chaque panne de proposer le
  // rappel de la requête qui a échoué.
  /*
    Le cadre ne dépend d'aucune requête : il est là dès la première peinture.
    Avant, ces écrans se réduisaient à une ligne de texte pendant le chargement
    — l'en-tête, le repère de contenu et la position de défilement partaient
    avec, pour revenir une fraction de seconde plus tard.
  */
  const enAttente = profil.isPending || quetes.isPending
  const panne = profil.error ?? quetes.error
  if (enAttente || panne) {
    return (
      <div className={styles.page}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Mes badges</p>
        </header>
        {panne ? (
          <ErrorNotice
            error={panne}
            onRetry={() => void (profil.error ? profil.refetch() : quetes.refetch())}
          />
        ) : (
          <LoadingNotice />
        )}
      </div>
    )
  }
  // Inatteignable — ni en attente, ni en panne — mais c'est ce qui permet au
  // compilateur de conclure que les deux réponses sont là : la condition
  // ci-dessus mêle quatre états et il ne sait pas la démêler.
  if (!profil.data || !quetes.data) return null

  const obtenus: AwardedBadge[] = profil.data.badges
  const acquis = new Set(obtenus.map((badge) => badge.id))

  // Un brouillon ne décerne rien : il n'est visible que des administrateurs et
  // sa publication notifiera tout le monde. Le promettre ici reviendrait à
  // dévoiler une quête qui n'existe pas encore pour les autres.
  const publiees = quetes.data.items.filter((quete) => quete.status === 'published')
  const brouillons = quetes.data.items.length - publiees.length

  const restants = publiees
    .filter((quete) => quete.badge !== null && !acquis.has(quete.badge.id))
    // Le plus proche d'abord : c'est celui-là qu'on peut aller chercher ce soir.
    .sort((a, b) => avancement(b) - avancement(a))

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Mes badges</p>
        <h1 className={styles.title}>
          {obtenus.length === 0
            ? 'Rien encore'
            : `${obtenus.length} badge${obtenus.length > 1 ? 's' : ''}`}
        </h1>
        <p className={styles.lede}>
          Un badge se gagne en achevant une quête, et <strong>ne se retire jamais</strong> — il
          porte le jour où il a été mérité, pas celui où on l’a inscrit. Ils sont publics : ils
          figurent sur ton profil comme sur celui des autres.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Obtenus</h2>
        {obtenus.length === 0 ? (
          <EmptyState
            title="Aucun badge pour l’instant"
            note={
              restants.length > 0
                ? 'Achève une quête et le sien te reviendra. La progression est rétroactive : ce que tu as déjà terminé compte.'
                : 'Aucune quête n’est publiée pour l’instant. Les badges arriveront avec elles.'
            }
          />
        ) : (
          <ul className={styles.list}>
            {obtenus.map((badge) => (
              <li key={badge.id} className={styles.row}>
                <Lien questId={badge.quest_id}>
                  <BadgeMedal
                    badge={badge}
                    obtenu
                    note={`Obtenu le ${formatDate(badge.awarded_at)}`}
                  />
                </Lien>
              </li>
            ))}
          </ul>
        )}
      </section>

      {restants.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>À obtenir</h2>
          <ul className={styles.list}>
            {restants.map((quete) => (
              <li key={quete.id} className={styles.row}>
                <Lien questId={quete.id}>
                  <BadgeMedal
                    badge={quete.badge}
                    obtenu={false}
                    note={
                      <>
                        {quete.title} — {quete.progress.done} sur {quete.progress.required}
                      </>
                    }
                  />
                </Lien>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Dit aux seuls administrateurs, et seulement s'il y en a : sans cette
          ligne, une quête écrite mais non publiée donnerait l'impression d'un
          badge perdu en route. */}
      {isAdmin && brouillons > 0 ? (
        <p className={styles.drafts}>
          {brouillons} quête{brouillons > 1 ? 's' : ''} en brouillon ne décerne
          {brouillons > 1 ? 'nt' : ''} encore rien. <Link to="/quetes">Les voir</Link>
        </p>
      ) : null}
    </div>
  )
}

/** Où en est cette quête, de 0 à 1 — pour ranger la plus proche en tête. */
const avancement = (quete: QuestSummary) =>
  quete.progress.required > 0 ? quete.progress.done / quete.progress.required : 0

/**
 * Un badge de quête mène à sa quête. Un badge sans quête — `milestone`, plus
 * tard — n'est pas un lien mort : il n'est simplement pas un lien.
 */
function Lien({ questId, children }: { questId: string | null; children: React.ReactNode }) {
  if (!questId) return <>{children}</>
  return (
    <Link to={`/quetes/${questId}`} className={styles.rowLink}>
      {children}
    </Link>
  )
}
