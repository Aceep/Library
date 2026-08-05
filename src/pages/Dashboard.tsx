import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchHome } from '../api/endpoints'
import { MEDIA_TYPES, progressRatio, typeLabel } from '../api/schema'
import type { Account, HomeResponse, MediaType } from '../api/schema'
import ErrorNotice from '../components/ErrorNotice'
import MemberChip from '../components/MemberChip'
import Reveal from '../components/Reveal'
import { useSession } from '../session/SessionContext'
import { queryKeys } from '../api/keys'
import styles from './Dashboard.module.css'

type InProgressEntry = HomeResponse['in_progress']['book'][number]
type FeedEntry = HomeResponse['feed'][number]
type InProgressType = keyof HomeResponse['in_progress']

/**
 * Les types qui peuvent avoir des en-cours — ceux que `/home` sert, la musique
 * exceptée : un album n'a que deux états, il n'est jamais « en cours ».
 *
 * La liste se déduit de la réponse plutôt que de s'écrire ici. Le jour où le
 * back servirait un rayon de plus, il apparaîtrait tout seul, dans l'ordre
 * d'affichage de `MEDIA_TYPES`. Une liste de cinq écrite à la main casserait
 * ce jour-là, en silence.
 */
const inProgressTypes = (inProgress: HomeResponse['in_progress']) =>
  MEDIA_TYPES.filter((type): type is InProgressType => type in inProgress)

/**
 * La quête du jour — **en dur, et aucune route ne la sert**.
 *
 * `GET /quests` existe mais ne rend pas ça : ce sont des parcours composés à la
 * main par un administrateur, avec leurs œuvres, leurs classements et leurs
 * badges. Rien n'y choisit une œuvre par jour pour le cercle, rien n'y porte
 * « proposée par », et il n'existe aucune mutation « accepter ».
 *
 * Le contenu ci-dessous est donc celui de la maquette, mot pour mot, et le
 * restera tant que la sélection quotidienne n'est pas décidée côté serveur
 * (`HANDOFF.md` § 8.3 la laisse ouverte). Les deux liens visent `/quetes`, un
 * écran réel : un bouton d'action qui ne mène nulle part serait pire que le
 * texte en dur.
 */
const QUETE = {
  numero: 214,
  titre: "Regardez quelque chose que K.B. a adoré et n'a jamais raconté.",
  note:
    "Elle l'a noté cinq étoiles en janvier 2024 et n'en a jamais écrit un mot. Trois heures et douze minutes. Personne d'autre dans le cercle ne l'a ouvert.",
  meta: 'Film · 1979 · 3 h 12',
  proposePar: 'K.B.',
}

/**
 * Les nouvelles des signatures — **en dur, et rien ne les sert non plus**.
 *
 * Rien dans l'API ne suit un auteur, un réalisateur ou un groupe : on suit des
 * membres et on surveille des œuvres, jamais des personnes. `HANDOFF.md` § 3 le
 * dit lui-même — « static placeholder data for now » — et § 8.1 en fait une
 * décision à prendre.
 *
 * Le jour où une route existe, c'est ce tableau qui disparaît ; la mise en
 * page, elle, est déjà celle des vraies données.
 */
const SIGNATURES: { kind: string; date: string; titre: string; ligne: string; suivi: string; type: MediaType }[] = [
  {
    kind: 'Nouveau recueil annoncé',
    date: '3 sept.',
    titre: 'Ted Chiang — nouvelles inédites',
    ligne: 'Neuf textes, dont trois jamais publiés. Le cercle a lu le premier recueil quatre fois en tout.',
    suivi: '3 personnes',
    type: 'book',
  },
  {
    kind: 'Tournage confirmé',
    date: '28 août',
    titre: 'Céline Sciamma — sans titre',
    ligne: 'Retour au format long après quatre ans. A.V. suit sa filmographie depuis 2019.',
    suivi: '2 personnes',
    type: 'movie',
  },
  {
    kind: 'Album daté',
    date: '21 août',
    titre: 'Godspeed You! Black Emperor',
    ligne: "Cinquième mouvement, sortie le 14 novembre. La bande-son de deux hivers du cercle.",
    suivi: '4 personnes',
    type: 'music',
  },
]

const VERBE: Record<FeedEntry['kind'], string> = {
  finished: 'a terminé',
  rated: 'a noté',
  started: 'a commencé',
}

export default function Dashboard() {
  const { user } = useSession()
  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.home,
    queryFn: fetchHome,
  })

  if (isPending) return <p className={styles.loading}>Chargement…</p>
  if (error) return <ErrorNotice error={error} onRetry={() => void refetch()} />

  const encours = inProgressTypes(data.in_progress).flatMap((type) =>
    data.in_progress[type].map((entry) => ({ entry, type })),
  )
  // Un murmure *est* une critique écrite : un « terminé » sans texte n'a rien à
  // citer, et une citation vide serait un cadre autour de rien.
  const murmures = data.feed.filter((item) => item.review !== null)

  return (
    <div className={styles.page}>
      <Beam />

      <QuestBanner />
      <Ticker feed={data.feed} />

      <div className={styles.body}>
        <main className={styles.main}>
          <Reveal className={styles.section}>
            <SectionHead
              titre="Nouvelles des"
              accent="signatures"
              legende="auteurs · réalisateurs · groupes que vous suivez"
            />
            {SIGNATURES.map((item) => (
              <SignatureRow key={item.titre} item={item} />
            ))}
          </Reveal>

          <Reveal className={styles.section}>
            <SectionHead
              titre="En"
              accent="cours"
              /* La maquette dit « ce que le cercle traverse ». `/home` ne rend
                 que mes suivis — la légende dit donc ce qu'elle montre. */
              legende="ce que je traverse en ce moment"
            />
            {encours.length === 0 ? (
              <p className={styles.vide}>
                Rien d'ouvert en ce moment. Le fonds attend.
              </p>
            ) : (
              <div className={styles.tuiles}>
                {encours.map(({ entry, type }) => (
                  <EnCoursTile key={entry.media.id} entry={entry} type={type} me={user} />
                ))}
              </div>
            )}
          </Reveal>

          <Reveal className={styles.section}>
            <SectionHead
              titre="Derniers"
              accent="murmures"
              legende="ce qu'ils viennent d'écrire"
            />
            {murmures.length === 0 ? (
              <p className={styles.vide}>
                {data.following_count === 0
                  ? "Tu ne suis encore personne : le carnet reste blanc tant que le cercle n'y écrit pas."
                  : "Personne n'a rien écrit ces trente derniers jours."}
              </p>
            ) : (
              murmures.map((item) => <MurmureRow key={`${item.media.id}-${item.at}`} item={item} />)
            )}
          </Reveal>
        </main>

        <aside className={styles.aside} aria-labelledby="traces">
          <div className={styles.asideHead}>
            <h2 id="traces" className={styles.asideTitre}>
              Traces <span className={styles.accent}>du cercle</span>
            </h2>
            <span className={styles.legende}>récemment</span>
          </div>
          {data.feed.length === 0 ? (
            <p className={styles.vide}>Aucune trace pour l'instant.</p>
          ) : (
            data.feed.map((item) => <TraceRow key={`${item.media.id}-${item.at}`} item={item} />)
          )}
          <Link to="/notifications" className={styles.journal}>
            Journal complet →
          </Link>
        </aside>
      </div>
    </div>
  )
}

/**
 * Le faisceau du projecteur.
 *
 * Purement décoratif, donc `aria-hidden` et transparent aux clics. Il est en
 * `position: absolute` sous tout le contenu, d'où le `z-index` explicite sur ce
 * qui vient après.
 */
function Beam() {
  return <div className={styles.beam} aria-hidden="true" />
}

/** L'étiquette d'un rayon : un aplat, texte quasi noir. Jamais une bordure. */
function MediumLabel({ type, small = false }: { type: MediaType; small?: boolean }) {
  return (
    <span className={`${styles.medium} ${small ? styles.mediumSm : ''}`} data-media-type={type}>
      {typeLabel(type)}
    </span>
  )
}

/**
 * La bannière de quête. Jamais enveloppée dans `Reveal` : elle est au-dessus de
 * la ligne de flottaison, déjà peinte quand l'observateur se met en route — une
 * révélation y serait un clignotement.
 *
 * Les mots du titre montent un à un. Les délais s'écrivent en `:nth-child()`
 * dans la feuille, pas en style inline : le titre est en dur, son nombre de
 * mots est connu, et React réécrirait des délais posés à la main.
 */
function QuestBanner() {
  return (
    <section className={styles.quete} aria-labelledby="quete-du-jour">
      <div className={styles.lampe} aria-hidden="true" />
      <div className={styles.queteInner}>
        <div className={styles.queteCadre}>
          <div>
            <div className={styles.queteSourcil}>
              <span className={styles.quetePastille}>Quête du jour</span>
              <span className={styles.queteFilet} aria-hidden="true" />
              <span className={styles.queteMeta}>
                Nº {QUETE.numero} · une seule par jour
              </span>
            </div>

            <h1 id="quete-du-jour" className={styles.queteTitre}>
              {QUETE.titre.split(' ').map((mot, index) => (
                // La clé porte l'index : un même mot peut revenir dans la
                // phrase, et son rang est ce qui le distingue.
                //
                // L'espace est **insécable** et à l'intérieur du span : une
                // espace ordinaire entre deux `inline-block` est réduite à
                // néant par la mise en page, et les mots se recollaient.
                <span key={`${mot}-${index}`}>{mot}&nbsp;</span>
              ))}
            </h1>

            <p className={styles.queteNote}>{QUETE.note}</p>

            <div className={styles.queteActions}>
              <Link to="/quetes" className={styles.queteCta}>
                Voir les quêtes <span aria-hidden="true">→</span>
              </Link>
              <Link to="/quetes" className={styles.queteLien}>
                Voir la fiche
              </Link>
              <span className={styles.queteAuteur}>
                proposée par <span className={styles.queteAuteurNom}>{QUETE.proposePar}</span>
              </span>
            </div>
          </div>

          <div className={styles.queteArt}>
            <div className={styles.queteJaquette}>
              <span className={styles.queteJaquetteNote}>jaquette · 2:3</span>
            </div>
            <div className={styles.queteArtMeta}>{QUETE.meta}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * La bande défilante. Elle se compose du fil, et **rend `null` s'il est vide** :
 * une bande décorative inventée dirait qu'il se passe quelque chose là où il ne
 * se passe rien.
 *
 * Le contenu est dupliqué parce que l'animation translate de -50 % : c'est la
 * seconde copie qui rattrape la première sans saut.
 */
function Ticker({ feed }: { feed: FeedEntry[] }) {
  if (feed.length === 0) return null

  const bande = `${feed.map((item) => item.media.title).join(' · ')} · `

  return (
    <div className={styles.ticker} aria-hidden="true">
      <div className={styles.tickerPiste}>
        <span className={styles.tickerTexte}>{bande}</span>
        <span className={styles.tickerTexte}>{bande}</span>
      </div>
    </div>
  )
}

function SectionHead({
  titre,
  accent,
  legende,
}: {
  titre: string
  accent: string
  legende: string
}) {
  return (
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitre}>
        {titre} <span className={styles.accent}>{accent}</span>
      </h2>
      <span className={styles.legende}>{legende}</span>
    </div>
  )
}

function SignatureRow({ item }: { item: (typeof SIGNATURES)[number] }) {
  return (
    <article className={styles.signature} data-media-type={item.type}>
      <div className={styles.signatureArt} aria-hidden="true" />
      <div>
        <div className={styles.signatureKind}>
          {item.kind} · {item.date}
        </div>
        <div className={styles.signatureTitre}>{item.titre}</div>
        <div className={styles.signatureLigne}>{item.ligne}</div>
        <div className={styles.signatureSuivi}>suivi par {item.suivi} du cercle</div>
      </div>
      <MediumLabel type={item.type} />
    </article>
  )
}

/**
 * Une œuvre en cours.
 *
 * La progression est un filet de 2px rempli dans l'encre du membre, doublé
 * d'une position composée (`p. 312 / 722`) — jamais un anneau, jamais une
 * gélule. Le pourcentage se calcule pour la **largeur du filet**, pas pour être
 * lu : c'est la fraction qui se lit.
 */
function EnCoursTile({
  entry,
  type,
  me,
}: {
  entry: InProgressEntry
  type: MediaType
  me: Account
}) {
  const ratio = progressRatio(entry.progress)

  return (
    <Link
      to={`/media/${entry.media.id}`}
      className={styles.tuile}
      data-media-type={type}
      style={{ '--identity': me.identity_color } as CSSProperties}
    >
      <div className={styles.tuileHead}>
        <MediumLabel type={type} small />
        <MemberChip account={me} size="sm" />
      </div>
      <div className={styles.tuileArt} aria-hidden="true" />
      <div className={styles.tuileTitre}>{entry.media.title}</div>
      {entry.progress && ratio !== null ? (
        <>
          <div className={styles.tuileMesure}>
            <span>
              {entry.progress.checked} / {entry.progress.total}
            </span>
            <span>{Math.round(ratio * 100)} %</span>
          </div>
          <div
            className={styles.tuileFilet}
            role="progressbar"
            aria-valuenow={entry.progress.checked}
            aria-valuemin={0}
            aria-valuemax={entry.progress.total}
            aria-label={`Progression sur ${entry.media.title}`}
          >
            <span
              className={styles.tuileFiletPlein}
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
        </>
      ) : (
        // Rien à mesurer : ni barre ni « 0 % », qui laisserait croire à un
        // début qui n'existe pas.
        <div className={styles.tuileSansMesure}>commencé</div>
      )}
    </Link>
  )
}

function MurmureRow({ item }: { item: FeedEntry }) {
  return (
    <article className={styles.murmure} data-media-type={item.media.type}>
      <div className={styles.murmureQui}>
        <MemberChip account={item.user} />
        <span className={styles.murmureQuand}>
          <time dateTime={item.at}>{quand(item.at)}</time>
        </span>
      </div>
      <div className={styles.murmureCorps}>
        <blockquote className={styles.murmureTexte}>« {item.review} »</blockquote>
        <div className={styles.murmurePied}>
          <span className={styles.murmureAPropos}>à propos de</span>
          <Link to={`/media/${item.media.id}`} className={styles.murmureOeuvre}>
            {item.media.title}
          </Link>
          <MediumLabel type={item.media.type} />
        </div>
      </div>
    </article>
  )
}

function TraceRow({ item }: { item: FeedEntry }) {
  return (
    <div className={styles.trace} data-media-type={item.media.type}>
      <span className={styles.traceHeure}>
        <time dateTime={item.at}>{heure(item.at)}</time>
      </span>
      <div className={styles.traceDit}>
        <MemberChip account={item.user} size="sm" />
        <span className={styles.traceVerbe}> {VERBE[item.kind]} </span>
        <Link to={`/media/${item.media.id}`} className={styles.traceOeuvre}>
          {item.media.title}
        </Link>
        <MediumLabel type={item.media.type} small />
      </div>
    </div>
  )
}

/** « il y a 2 h », « hier », « il y a 3 j ». Au-delà d'une semaine, la date. */
const quand = (iso: string): string => {
  const ecart = Date.now() - new Date(iso).getTime()
  const heures = Math.floor(ecart / 3_600_000)
  if (heures < 1) return "à l'instant"
  if (heures < 24) return `il y a ${heures} h`
  const jours = Math.floor(heures / 24)
  if (jours === 1) return 'hier'
  if (jours < 8) return `il y a ${jours} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/** L'heure sur une trace du jour, la date au-delà — une trace est située. */
const heure = (iso: string): string => {
  const date = new Date(iso)
  const memeJour = new Date().toDateString() === date.toDateString()
  return memeJour
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
