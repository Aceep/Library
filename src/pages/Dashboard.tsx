import { Fragment } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchHome, fetchQuests, fetchWatches } from '../api/endpoints'
import { MEDIA_TYPES, progressRatio, typeLabel } from '../api/schema'
import type { Account, HomeResponse, MediaType, QuestSummary, WatchItem } from '../api/schema'
import Cover from '../components/Cover'
import LoadingNotice from '../components/LoadingNotice'
import ErrorNotice from '../components/ErrorNotice'
import MemberChip from '../components/MemberChip'
import QuestProgress from '../components/QuestProgress'
import Reveal from '../components/Reveal'
import { useSession } from '../session/SessionContext'
import { queryKeys } from '../api/keys'
import { useDocumentTitle } from '../components/useDocumentTitle'
import styles from './Dashboard.module.css'

/**
 * L'accueil.
 *
 * ---------------------------------------------------------------------------
 * Tout vient du serveur, et c'est récent
 * ---------------------------------------------------------------------------
 *
 * Cet écran a longtemps mêlé du vrai et de la maquette : un bandeau de quête
 * inventé de toutes pièces (« Nº 214 », « proposée par K.B. ») et trois fausses
 * actualités d'auteurs, affichés comme s'ils venaient de l'API. Les deux blocs
 * portaient un commentaire disant qu'aucune route ne les servait — ce qui les a
 * fait survivre longtemps, puisque le défaut était documenté plutôt que corrigé.
 *
 * Ils viennent désormais des routes qui existent :
 *
 *   bandeau        `GET /quests`   — une vraie quête, celle qui appelle un geste
 *   deuxième bloc  `GET /watches`  — la veille, ce qui remplace les « signatures »
 *   le reste       `GET /home`     — en cours, murmures, traces
 *
 * **Les « nouvelles des signatures » ne reviendront pas.** L'API suit des
 * membres et surveille des œuvres, jamais des personnes : rien ne peut dire
 * qu'un auteur annonce un livre. La veille répond à la même envie — savoir
 * qu'il va se passer quelque chose — avec ce que le modèle sait vraiment.
 *
 * Ne reste en dur sur cet écran que ce qui doit l'être : des titres de section.
 */

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

/** Trois veilles à l'accueil : de quoi annoncer, pas de quoi remplacer l'écran. */
const VEILLE_A_L_ACCUEIL = 3

/**
 * Laquelle des quêtes ouvertes mérite le bandeau.
 *
 * Il n'existe **pas** de « quête du jour » côté serveur : rien n'en désigne une
 * par date, et en inventer une ici la ferait changer à chaque rechargement.
 * Ce qu'on met en avant est donc celle où un geste compte le plus, dans cet
 * ordre :
 *
 *   1. **Une échéance passe devant.** C'est la seule contrainte que le membre
 *      ne s'est pas donnée lui-même ; la plus proche d'abord.
 *   2. **Puis la plus près d'être achevée** — celle où il reste le moins à
 *      faire est celle qu'une seule soirée peut clore.
 *   3. **À égalité, la plus récemment publiée**, pour que la nouveauté se voie.
 *
 * Les quêtes achevées et les brouillons sont hors course : le bandeau appelle à
 * agir, et il n'y a rien à faire sur une quête finie. Renvoie `null` quand il
 * n'en reste aucune — l'appelant a un état pour ça.
 */
export function queteEnAvant(quetes: QuestSummary[]): QuestSummary | null {
  const ouvertes = quetes.filter((q) => q.status === 'published' && !q.progress.completed)
  if (ouvertes.length === 0) return null
  return [...ouvertes].sort(parUrgence)[0]
}

const parUrgence = (a: QuestSummary, b: QuestSummary): number => {
  if (a.due_at !== b.due_at) {
    // Une quête sans échéance ne bat jamais une quête qui en a une.
    if (a.due_at === null) return 1
    if (b.due_at === null) return -1
    return a.due_at < b.due_at ? -1 : 1
  }

  // `required` et non `total` : c'est le seuil qui décide de l'achèvement, donc
  // du reste à faire. Sur une quête « cinq suffisent sur sept », il reste deux
  // œuvres quand trois sont terminées, pas quatre.
  const resteA = a.progress.required - a.progress.done
  const resteB = b.progress.required - b.progress.done
  if (resteA !== resteB) return resteA - resteB

  return (b.published_at ?? '').localeCompare(a.published_at ?? '')
}

/** Le format de date de l'écran de veille — les deux doivent dire pareil. */
const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const VERBE: Record<FeedEntry['kind'], string> = {
  finished: 'a terminé',
  rated: 'a noté',
  started: 'a commencé',
}

export default function Dashboard() {
  useDocumentTitle(null)
  const { user } = useSession()
  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.home,
    queryFn: ({ signal }) => fetchHome(signal),
  })

  /*
    Le bandeau de quête a sa propre requête et son propre état : il n'a aucune
    raison d'attendre `/home`, et c'est lui qui porte le seul `<h1>` de
    l'écran. Le garder ici, c'est garder le titre de l'accueil pendant que le
    reste arrive — au lieu de réduire la page à une ligne de texte.
  */
  if (isPending || error) {
    return (
      <div className={styles.page}>
        <Beam />
        <QuestBanner />
        <div className={styles.body}>
          <div className={styles.main}>
            {isPending ? (
              <LoadingNotice />
            ) : (
              <ErrorNotice error={error} onRetry={() => void refetch()} />
            )}
          </div>
        </div>
      </div>
    )
  }

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
        {/* Une colonne, pas un second `main` : la coquille en pose déjà un, et
            deux repères de contenu principal dans un document n'en laissent
            aucun de sûr — ni pour un lecteur d'écran, ni pour le lien
            d'évitement qui doit viser le bon. */}
        <div className={styles.main}>
          <Reveal className={styles.section}>
            <Veille />
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
        </div>

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
 * dans la feuille, pas en style inline : React réécrirait des délais posés à la
 * main au premier rendu suivant. Le titre étant devenu celui d'une vraie quête,
 * sa longueur n'est plus connue d'avance — c'est la règle `:nth-child(n + 11)`
 * qui rattrape les titres longs, sans quoi le onzième mot resterait invisible,
 * l'animation partant de `opacity: 0`.
 *
 * Le bandeau ne se dessine pas tant que les quêtes ne sont pas là : un titre de
 * remplacement, en `<h1>` et en 76 pixels, sauterait aux yeux le temps d'un
 * aller-retour réseau.
 */
function QuestBanner() {
  const { data, error } = useQuery({
    queryKey: queryKeys.quests,
    queryFn: ({ signal }) => fetchQuests(signal),
  })

  /*
    L'échec ne se confond pas avec l'attente. Sans cette branche, une panne des
    quêtes emportait en silence la section qui porte le **seul `<h1>` de
    l'accueil** : la page se retrouvait sans titre, et rien ne disait pourquoi.
    Le message est celui du serveur, affiché tel quel ; la reprise vit sur
    `/quetes`, où elle a un écran à elle.
  */
  if (error) {
    return (
      <section className={styles.quete} aria-labelledby="quete-en-avant">
        <div className={styles.lampe} aria-hidden="true" />
        <div className={styles.queteInner}>
          <div className={styles.queteCadre}>
            <div>
              <div className={styles.queteSourcil}>
                <span className={styles.quetePastille}>Quêtes</span>
                <span className={styles.queteFilet} aria-hidden="true" />
              </div>

              <h1 id="quete-en-avant" className={styles.queteTitre}>
                {titreEnMots('Les quêtes n’ont pas pu être chargées.')}
              </h1>

              <p className={styles.queteNote}>{(error as Error).message}</p>

              <div className={styles.queteActions}>
                <Link to="/quetes" className={styles.queteCta}>
                  Réessayer <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!data) return null

  const quete = queteEnAvant(data.items)
  // Aucune quête ouverte : soit tout est achevé, soit rien n'est publié. Les
  // deux méritent le bandeau — il tient le seul `<h1>` de l'écran — mais pas la
  // même phrase, et surtout aucun appel à l'action qui n'aurait pas d'objet.
  const publiees = data.items.filter((q) => q.status === 'published')

  return (
    <section className={styles.quete} aria-labelledby="quete-en-avant">
      <div className={styles.lampe} aria-hidden="true" />
      <div className={styles.queteInner}>
        <div className={styles.queteCadre}>
          <div>
            <div className={styles.queteSourcil}>
              <span className={styles.quetePastille}>
                {quete ? 'Quête en cours' : 'Quêtes'}
              </span>
              <span className={styles.queteFilet} aria-hidden="true" />
              {quete ? (
                <span className={styles.queteMeta}>
                  {quete.item_count} œuvre{quete.item_count > 1 ? 's' : ''}
                  {quete.due_at ? ` · à viser pour le ${dateLongue(quete.due_at)}` : ''}
                </span>
              ) : null}
            </div>

            <h1 id="quete-en-avant" className={styles.queteTitre}>
              {titreEnMots(
                quete?.title ??
                  (publiees.length > 0
                    ? 'Tu as achevé toutes les quêtes proposées.'
                    : 'Aucune quête proposée pour l’instant.'),
              )}
            </h1>

            {quete?.description ? (
              <p className={styles.queteNote}>{quete.description}</p>
            ) : !quete ? (
              <p className={styles.queteNote}>
                {publiees.length > 0
                  ? 'Les badges sont à toi. Les prochaines arriveront quand un administrateur en composera.'
                  : 'Une quête réunit des œuvres choisies à la main. Il n’y en a pas encore.'}
              </p>
            ) : null}

            {quete ? <QuestProgress progress={quete.progress} className={styles.queteAvancee} /> : null}

            <div className={styles.queteActions}>
              {quete ? (
                <>
                  <Link to={`/quetes/${quete.id}`} className={styles.queteCta}>
                    Voir la quête <span aria-hidden="true">→</span>
                  </Link>
                  <Link to="/quetes" className={styles.queteLien}>
                    Toutes les quêtes
                  </Link>
                </>
              ) : (
                <Link to="/quetes" className={styles.queteCta}>
                  Voir les quêtes <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>
          </div>

          {/*
            À la place du cadre vide qui annonçait « jaquette · 2:3 » : le badge
            que la quête décerne. Il est réel, il a sa couleur et son emoji, et
            c'est ce qu'on gagne — donc ce qui donne envie.
          */}
          {quete ? (
            <div className={styles.queteArt}>
              <div
                className={styles.queteBadge}
                style={{ '--badge': quete.badge.color } as CSSProperties}
              >
                <span className={styles.queteBadgeIcone} aria-hidden="true">
                  {quete.badge.icon}
                </span>
                <span className={styles.queteBadgeNom}>{quete.badge.name}</span>
              </div>
              <div className={styles.queteArtMeta}>badge à gagner</div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/**
 * Le titre découpé en mots animables.
 *
 * La clé porte l'index : un même mot peut revenir dans la phrase, et son rang
 * est ce qui le distingue.
 *
 * **L'espace est une vraie espace**, posée entre les spans. Elle l'était en
 * insécable — `{mot}&nbsp;` — parce qu'une espace ordinaire entre deux
 * `inline-block` est réduite à néant par la mise en page. Le remède collait le
 * texte : chaque espace du titre devenait un U+00A0, ce qui le rendait
 * introuvable par la recherche du navigateur et le faisait recopier avec des
 * caractères invisibles à la place des espaces. C'est
 * `white-space: pre-wrap` sur le titre, dans la feuille, qui préserve
 * maintenant l'espace sans la rendre insécable — le titre reste un texte
 * ordinaire, ce qui compte d'autant plus qu'il vient désormais du serveur.
 *
 * Les nœuds de texte ne comptent pas dans `:nth-child()`, qui ne voit que les
 * éléments : les délais d'animation par rang restent alignés sur les mots.
 */
const titreEnMots = (titre: string) =>
  titre.split(' ').map((mot, index) => (
    <Fragment key={`${mot}-${index}`}>
      {index > 0 ? ' ' : null}
      <span>{mot}</span>
    </Fragment>
  ))

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

/**
 * La veille — ce qui remplace les « nouvelles des signatures ».
 *
 * Même envie, source réelle : au lieu d'annoncer qu'un auteur prépare un livre,
 * on rappelle les œuvres et les sagas dont on a demandé à être prévenu. C'est
 * la seule chose que le modèle sache d'un futur — on surveille des œuvres, pas
 * des personnes.
 *
 * Trois entrées au plus, les plus récentes : l'accueil annonce, il ne remplace
 * pas `/veille`.
 */
function Veille() {
  const { data, error } = useQuery({
    queryKey: queryKeys.watches,
    queryFn: ({ signal }) => fetchWatches(null, signal),
  })

  const items = data?.items.slice(0, VEILLE_A_L_ACCUEIL) ?? []

  return (
    <>
      <SectionHead
        titre="Ce que tu"
        accent="surveilles"
        legende="on te prévient dès que du nouveau paraît"
      />

      {error ? (
        // Un bloc secondaire ne fait pas tomber l'accueil : il dit qu'il n'a
        // pas pu, et le reste de l'écran continue de servir.
        <p className={styles.vide}>La veille n’a pas pu être chargée.</p>
      ) : items.length === 0 ? (
        <p className={styles.vide}>
          Aucune veille. Ouvre la fiche d’une série, d’un manga ou d’une saga et choisis
          « Surveiller » pour être prévenu de la suite.
        </p>
      ) : (
        <>
          {items.map((watch) => (
            <VeilleRow key={watch.id} watch={watch} />
          ))}
          {data && data.items.length > items.length ? (
            <Link to="/veille" className={styles.journal}>
              Toute la veille →
            </Link>
          ) : null}
        </>
      )}
    </>
  )
}

function VeilleRow({ watch }: { watch: WatchItem }) {
  const saga = watch.target === 'saga' ? watch.saga : null
  const media = watch.target === 'media' ? watch.media : null

  const titre = saga?.title ?? media?.title ?? 'Sans titre'
  const lien = saga ? `/sagas/${saga.id}` : media ? `/media/${media.id}` : null
  // Une saga n'a pas de type de rayon à elle : elle en mêle plusieurs. On prend
  // celui de l'œuvre quand il y en a une, et la teinte reste neutre sinon.
  const type = media?.type ?? null

  return (
    <article className={styles.veille} data-media-type={type ?? undefined}>
      <div className={styles.veilleArt}>
        <Cover url={media?.cover_url ?? null} title={titre} type={type ?? 'movie'} />
      </div>
      <div>
        <div className={styles.veilleKind}>
          {saga ? 'Saga' : 'Œuvre'} · surveillée depuis le {dateLongue(watch.since)}
        </div>
        {lien ? (
          <Link to={lien} className={styles.veilleTitre}>
            {titre}
          </Link>
        ) : (
          <div className={styles.veilleTitre}>{titre}</div>
        )}
        {/* La réponse à « c'est sorti ce matin, pourquoi je n'ai rien ? » —
            l'écran de veille la donne aussi, dans les mêmes mots. */}
        {watch.next_check_at ? (
          <div className={styles.veilleLigne}>
            Prochaine vérification le {dateLongue(watch.next_check_at)}.
          </div>
        ) : null}
      </div>
      {type ? <MediumLabel type={type} /> : null}
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
      {/*
        `/home` sert `cover_url` sur chaque en-cours. Cet écran était le seul du
        dépôt à ne pas s'en servir : la tuile dessinait un cadre vide pendant que
        les neuf autres écrans montraient l'image. `Cover` gère à la fois
        l'absence de jaquette et l'URL qui ne charge pas.
      */}
      <div className={styles.tuileArt}>
        <Cover url={entry.media.cover_url} title={entry.media.title} type={type} ratio="3/4" size="lg" />
      </div>
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
