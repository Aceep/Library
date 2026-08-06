import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchLibraryPage } from '../api/endpoints'
import type { LibraryFilters, LibrarySort } from '../api/endpoints'
import { MEDIA_TYPES, typeLabel, typeLabelPlural } from '../api/schema'
import { useReference } from '../reference/ReferenceContext'
import type { Account, LibraryItem, MediaType, StatusOption, TrackingStatus } from '../api/schema'
import Cover from '../components/Cover'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import MemberChip from '../components/MemberChip'
import Pagination from '../components/Pagination'
import Reveal from '../components/Reveal'
import { usePageInUrl } from '../components/usePageInUrl'
import { useSession } from '../session/SessionContext'
import { queryKeys } from '../api/keys'
import styles from './TypeLibrary.module.css'

/**
 * Ce qui distingue un rayon d'un autre, et **rien de plus**.
 *
 * Les rayons filtrent un fonds unique : ils partagent leur squelette, leur
 * chrome et leur code. Ce qui change d'un médium à l'autre, c'est le **rythme
 * du rangement** — le ratio d'une jaquette, la largeur d'une colonne, les mots
 * qu'on emploie pour dire « en cours ». Tout cela tient ici, en un endroit,
 * plutôt que dans six écrans qui divergeraient au premier correctif.
 *
 * `numero` suit la numérotation des maquettes (Livres Nº 01 … Musique Nº 06),
 * qui n'est pas l'ordre de `MEDIA_TYPES` : c'est un ordre de rayonnage, celui
 * dans lequel on longe les étagères, et il ne se déduit d'aucune donnée.
 */
interface Rayonnage {
  numero: string
  /** Ratio de la jaquette. Livres, Films et Manga en 2:3 ; Séries et Jeux en 16:9 ; Musique carré. */
  ratio: '2/3' | '16/9' | '1/1'
  colonnes: number
  hauteurRangee: string
  /** Le titre de la section des suivis commencés, accordé au médium. */
  enCours: string
  /** L'appel de la tuile en tireté qui ferme le rayonnage. */
  verser: string
  /** La légende du rythme, à droite du titre « Le rayonnage ». */
  rythme: string
  presentation: string
  citation: string
  /**
   * Le motif de la mosaïque : combien de colonnes prend la n-ième tuile.
   *
   * Les maquettes écrivent ces largeurs **à la main**, œuvre par œuvre, et rien
   * dans l'API ne les porte. On les remplace par un motif qui se répète selon
   * le rang dans la page : le rythme irrégulier survit, il est stable d'un
   * rendu à l'autre, et il ne prétend pas que la taille d'une tuile dit quelque
   * chose de l'œuvre qu'elle montre.
   *
   * Chaque motif **somme à un multiple du nombre de colonnes** — sans quoi
   * chaque cycle laisserait un trou en fin de rangée.
   */
  motif: number[]
}

const RAYONNAGES: Record<MediaType, Rayonnage> = {
  book: {
    numero: 'Nº 01',
    ratio: '2/3',
    colonnes: 12,
    hauteurRangee: '300px',
    enCours: 'En lecture',
    verser: 'Verser un livre',
    rythme: 'rythme bibliothèque — tranches serrées, quelques-uns de face',
    presentation:
      "Le rayon le plus lent et le plus prêté. Un livre du fonds passe par plusieurs mains avant de revenir, et revient rarement dans le même état — quelqu'un a corné, quelqu'un a écrit dans la marge, quelqu'un l'a laissé de côté page cent douze.",
    citation: "On ne prête pas un livre, on prête le temps qu'on a passé dedans.",
    // Cas propre : les trois premières de face, le reste en tranche. Traité
    // dans `Rayonnage` plus bas, ce motif n'est pas lu pour les livres.
    motif: [1],
  },
  movie: {
    numero: 'Nº 02',
    ratio: '16/9',
    colonnes: 6,
    hauteurRangee: '168px',
    enCours: 'En projection',
    verser: 'Verser un film',
    rythme: 'rythme cinéma — 16:9, rangement éditorial',
    presentation:
      "Le seul rayon qui se regarde dans le noir. On y range aussi bien les sept heures d'un film-fleuve que les quatre-vingt-dix minutes qu'on a mises deux ans à finir — le fonds ne trie pas par mérite, seulement par ce que quelqu'un a traversé.",
    citation:
      "Un film qu'on regarde seul et un film qu'on regarde à cinq ne sont pas le même film. Ici les deux sont écrits.",
    motif: [3, 2, 1, 2, 2, 2],
  },
  tv: {
    numero: 'Nº 03',
    ratio: '16/9',
    colonnes: 6,
    hauteurRangee: '168px',
    enCours: 'En cours de saison',
    verser: 'Verser une série',
    rythme: 'rythme feuilleton — une bande par série',
    presentation:
      "Le rayon qui se compte en saisons et se vit en mois. Une série n'est pas plus longue qu'un film : elle occupe une autre place dans une vie — celle des dimanches, des semaines difficiles, des soirs où on n'avait rien décidé.",
    citation: "On ne se souvient pas d'une série, on se souvient de l'année où on l'a regardée.",
    motif: [3, 3, 2, 2, 2],
  },
  comic_series: {
    numero: 'Nº 04',
    ratio: '2/3',
    colonnes: 8,
    hauteurRangee: '250px',
    enCours: 'En cours de série',
    verser: 'Verser un manga',
    rythme: 'rythme librairie — séries entières, tomes numérotés',
    presentation:
      "Le rayon qui se compte en volumes, et qui se prête volume par volume. Une série de trente-sept tomes n'entre jamais entièrement dans une seule maison : elle circule, elle se sépare, et il manque toujours le douze chez quelqu'un.",
    citation: "On a fini le dernier volume à deux heures du matin et personne n'a voulu dire un mot.",
    motif: [2, 2, 1, 1, 2],
  },
  game: {
    numero: 'Nº 05',
    ratio: '16/9',
    colonnes: 6,
    hauteurRangee: '232px',
    enCours: 'En partie',
    verser: 'Verser un jeu',
    rythme: 'rythme paysage — key art large, heures plutôt que pages',
    presentation:
      "Le seul rayon où « fini » ne veut pas dire grand-chose. On y compte en heures, pas en pages, et beaucoup de ce qui est ici a été posé quelque part — ce qui n'est pas un échec, seulement une durée qui ne s'est pas terminée.",
    citation: "Vingt-deux minutes, et recommence. C'est tout le jeu, et c'est aussi tout le reste.",
    motif: [3, 3, 2, 2, 2],
  },
  music: {
    numero: 'Nº 06',
    ratio: '1/1',
    colonnes: 5,
    hauteurRangee: '268px',
    enCours: 'En écoute',
    verser: 'Verser un disque',
    rythme: 'rythme pochette — carré, écoutes plutôt que fins',
    presentation:
      "Le seul rayon qu'on ne finit jamais. Ici on ne compte pas les fins mais les retours : un disque écouté quarante fois est plus présent dans une vie qu'un roman lu une seule.",
    citation:
      "C'était la bande-son de deux hivers du cercle. On l'a mise en boucle sans jamais le décider.",
    motif: [2, 1, 1, 1],
  },
}

/**
 * Les filtres suivent les statuts que le type accepte : sur un rayon de
 * musique, « En cours » ne ramènerait jamais rien puisque le back refuse
 * d'écrire ce statut sur un album.
 */
const statusFilters = (
  statuses: StatusOption[],
): Array<{ value: TrackingStatus | null; label: string }> => [
  { value: null, label: 'Tout' },
  ...statuses.map(({ value, label }) => ({ value, label })),
]

const SORTS: Array<{ value: LibrarySort; label: string }> = [
  { value: 'added', label: 'Ajout récent' },
  { value: 'title', label: 'Titre' },
]

const isMediaType = (value: string | undefined): value is MediaType =>
  MEDIA_TYPES.includes(value as MediaType)

/**
 * Combien de comptes une tuile nomme avant de compter le reste.
 *
 * Trois pastilles tiennent dans le coin d'une tuile d'une colonne ; au-delà
 * elles débordent sur la jaquette.
 */
const MAX_CHIPS = 3

export default function TypeLibrary() {
  const { type } = useParams()
  if (!isMediaType(type)) return <Navigate to="/" replace />
  // `key` remet les filtres à zéro quand on change de rayon : sans ça, on
  // garderait le filtre du type précédent en arrivant sur le suivant.
  return <Library key={type} type={type} />
}

function Library({ type }: { type: MediaType }) {
  const { user } = useSession()
  const { statusesOf } = useReference()
  const [status, setStatus] = useState<TrackingStatus | null>(null)
  const [ownedOnly, setOwnedOnly] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<LibrarySort>('added')
  // Le comportement de l'adresse est partagé avec la bibliothèque d'un membre :
  // deux listes qui se ressemblent doivent se comporter pareil, et c'est plus
  // solide de le faire exécuter le même code que de le relire.
  const { page, adresseDe, allerA, remettreALaPremiere } = usePageInUrl()

  const rayon = RAYONNAGES[type]

  const filters: LibraryFilters = {
    type,
    status,
    owned: ownedOnly ? true : null,
    favorite: favoritesOnly ? true : null,
    sort,
  }

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.libraryPage(filters, page),
    queryFn: ({ signal }) => fetchLibraryPage(filters, page, signal),
    // La page précédente reste à l'écran pendant que la suivante arrive : sans
    // cela, chaque clic vide le rayon puis le remplit, et la page saute deux
    // fois. C'est le seul geste qui rende une pagination agréable.
    placeholderData: (precedente) => precedente,
  })

  const items = data?.items ?? []
  const infoPages = data?.pages ?? null
  const filtered = status !== null || ownedOnly || favoritesOnly

  return (
    <div
      className={styles.page}
      data-media-type={type}
      style={
        {
          '--rayon-cols': rayon.colonnes,
          '--rayon-row': rayon.hauteurRangee,
          '--rayon-ratio': rayon.ratio,
        } as CSSProperties
      }
    >
      <header className={styles.intro}>
        <div className={styles.introHead}>
          <span className={styles.numero}>Rayon {rayon.numero}</span>
          <span className={styles.introRule} aria-hidden="true" />
          {/* Le nombre d'œuvres vient de la pagination, seule source qui le
              connaisse. Le nombre de personnes n'est servi nulle part : on ne
              l'annonce pas plutôt que de l'estimer. */}
          {infoPages !== null ? (
            <span className={styles.compte}>
              {infoPages.total} {infoPages.total > 1 ? 'œuvres' : 'œuvre'}
            </span>
          ) : null}
        </div>
        <h1 className={styles.title}>{typeLabelPlural(type)}</h1>
        <div className={styles.introBody}>
          <p className={styles.presentation}>{rayon.presentation}</p>
          <p className={styles.citation}>« {rayon.citation} »</p>
        </div>
      </header>

      <EnCours type={type} titre={rayon.enCours} ratio={rayon.ratio} me={user} />

      <Reveal className={styles.rayonnage}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              Le <em>rayonnage</em>
            </h2>
            <span className={styles.sectionNote}>{rayon.rythme}</span>
          </div>

          <div className={styles.filters}>
            <div className={styles.filterGroup} role="group" aria-label="Filtrer par statut">
              {statusFilters(statusesOf(type)).map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  className={styles.chip}
                  aria-pressed={status === filter.value}
                  onClick={() => {
                    setStatus(filter.value)
                    remettreALaPremiere()
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={ownedOnly}
                onChange={(event) => {
                  setOwnedOnly(event.target.checked)
                  remettreALaPremiere()
                }}
              />
              Possédés seulement
            </label>

            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(event) => {
                  setFavoritesOnly(event.target.checked)
                  remettreALaPremiere()
                }}
              />
              Mes coups de cœur
            </label>

            <label className={styles.sort}>
              Trier par
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as LibrarySort)
                  remettreALaPremiere()
                }}
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isPending ? (
            <p className={styles.loading}>Chargement…</p>
          ) : error ? (
            <ErrorNotice error={error} onRetry={() => void refetch()} />
          ) : items.length === 0 ? (
            /*
              Trois vides à ne pas confondre, et c'est le bloc `pages` qui les
              sépare : un rayon vraiment vide, un filtre qui ne ramène rien, et une
              page au-delà de la fin — le cas d'une adresse gardée puis rouverte
              après que le rayon a rétréci. Le troisième doit ramener quelque part,
              pas laisser sur un cul-de-sac.
            */
            infoPages !== null && infoPages.pages > 0 && page > infoPages.pages ? (
              <EmptyState
                title="Cette page n’existe plus"
                note={`Ce rayon compte ${infoPages.pages} page${infoPages.pages > 1 ? 's' : ''} — la page ${page} n’en fait plus partie.`}
                action={
                  <Link to={adresseDe(infoPages.pages)} className={styles.emptyAction}>
                    Aller à la dernière page
                  </Link>
                }
              />
            ) : (
              <EmptyState
                title="Aucune œuvre ici"
                note={
                  filtered
                    ? 'Aucune œuvre de ce rayon ne correspond au filtre actif.'
                    : "Ce rayon est encore vide. Ajoute une œuvre depuis la recherche pour le remplir."
                }
                action={
                  <Link to="/recherche" className={styles.emptyAction}>
                    Ajouter une œuvre
                  </Link>
                }
              />
            )
          ) : (
            <>
              {/*
                `aria-busy` pendant qu'une page arrive : les tuiles affichées sont
                celles de la page précédente, gardées exprès pour que l'écran ne
                saute pas, et un lecteur d'écran doit savoir qu'elles ne sont plus
                à jour.
              */}
              <ul className={styles.shelf} aria-busy={isFetching}>
                {items.map((item, rang) => (
                  <Tuile
                    key={item.id}
                    item={item}
                    me={user}
                    rayon={rayon}
                    rang={rang}
                    type={type}
                  />
                ))}
                <li className={styles.verser}>
                  <Link to="/recherche" className={styles.verserLink}>
                    <span className={styles.verserLabel}>{rayon.verser}</span>
                    <span className={styles.verserNote}>au rayon du cercle</span>
                  </Link>
                </li>
              </ul>

              {infoPages !== null && infoPages.pages > 1 ? (
                <Pagination
                  info={infoPages}
                  hrefOf={adresseDe}
                  onNavigate={allerA}
                  label={`Pages du rayon ${typeLabelPlural(type).toLowerCase()}`}
                />
              ) : (
                <p className={styles.end}>
                  {infoPages?.total ?? items.length} œuvre
                  {(infoPages?.total ?? items.length) > 1 ? 's' : ''} dans ce rayon.
                </p>
              )}
            </>
          )}
      </Reveal>
    </div>
  )
}

/**
 * Les suivis commencés de ce rayon — **les miens**.
 *
 * La maquette montre ceux de tout le cercle. On ne peut pas : `tracking` ne
 * déballe que les comptes auxquels je suis abonné, et seulement œuvre par
 * œuvre. Plutôt que de reconstituer une vue du cercle à partir d'une page de
 * rayon — qui serait fausse dès la deuxième page —, la légende dit ce que la
 * section montre vraiment.
 *
 * `status: 'doing'` sur un type à statut dérivé (séries, manga) est légitime :
 * le back le calcule, on ne fait que le filtrer.
 */
function EnCours({
  type,
  titre,
  ratio,
  me,
}: {
  type: MediaType
  titre: string
  ratio: Rayonnage['ratio']
  me: Account
}) {
  const filters: LibraryFilters = { type, status: 'doing', limit: 3 }
  const { data } = useQuery({
    queryKey: queryKeys.libraryPage(filters, 1),
    queryFn: ({ signal }) => fetchLibraryPage(filters, 1, signal),
  })

  const items = data?.items ?? []
  // Rien en cours n'est pas un incident : la section disparaît, elle n'affiche
  // pas un vide décoré.
  if (items.length === 0) return null

  // Le titre se compose en deux voix — le premier mot droit, la suite en
  // italique — comme tous les titres de section de la direction.
  const [premier, ...suite] = titre.split(' ')

  return (
    <Reveal>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          {premier} <em>{suite.join(' ')}</em>
        </h2>
        <span className={styles.sectionNote}>ce que je traverse</span>
      </div>
      <ul className={styles.encours}>
        {items.map((item) => (
          <li key={item.id} className={styles.encoursTile}>
            <Link to={`/media/${item.id}`} className={styles.encoursLink}>
              <span className={styles.encoursHead}>
                <span className={styles.medium}>{typeLabel(type)}</span>
                <MemberChip account={me} />
              </span>
              <span className={styles.encoursArt}>
                <Cover url={item.cover_url} title={item.title} type={type} size="tile" ratio={ratio} />
              </span>
              <span className={styles.encoursTitle}>{item.title}</span>
              {item.progress && item.progress.total > 0 ? (
                <>
                  <span className={styles.encoursAt}>
                    <span>
                      {item.progress.checked} / {item.progress.total}
                    </span>
                    <span>{Math.round((item.progress.checked / item.progress.total) * 100)}%</span>
                  </span>
                  {/* La règle de progression est un filet de 2px rempli dans
                      l'encre du membre — jamais une barre arrondie. */}
                  <span
                    className={styles.encoursRule}
                    style={
                      {
                        '--identity': me.identity_color,
                        '--part': `${(item.progress.checked / item.progress.total) * 100}%`,
                      } as CSSProperties
                    }
                    aria-hidden="true"
                  />
                </>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}

/**
 * Une tuile du rayonnage.
 *
 * Les livres ont leur cas propre : les trois premières œuvres de la page sont
 * **de face** (span 3), le reste en **tranche** (span 1). C'est le seul rayon
 * dont la maquette mélange deux formes, et c'est ce qui lui donne son allure de
 * bibliothèque.
 */
function Tuile({
  item,
  me,
  rayon,
  rang,
  type,
}: {
  item: LibraryItem
  me: Account
  rayon: Rayonnage
  rang: number
  type: MediaType
}) {
  const tranche = type === 'book' && rang >= 3
  const span = type === 'book' ? (rang < 3 ? 3 : 1) : rayon.motif[rang % rayon.motif.length]

  // Qui a laissé une trace : moi, puis les comptes auxquels je suis abonné.
  // `others` reste un nombre — l'API ne déballe pas les identités des autres.
  const suivis = [
    ...(item.tracking.me ? [me] : []),
    ...item.tracking.following.filter((entry) => entry.tracking !== null).map((entry) => entry.user),
  ]
  const nommes = suivis.slice(0, MAX_CHIPS)
  const reste = suivis.length - nommes.length + item.tracking.others.count

  return (
    <li
      className={tranche ? styles.spine : styles.tile}
      style={{ '--span': span } as CSSProperties}
    >
      <Link to={`/media/${item.id}`} className={tranche ? styles.spineLink : styles.tileLink}>
        {tranche ? (
          <>
            <span className={styles.spineChips}>
              {nommes.map((account) => (
                <MemberChip key={account.id} account={account} />
              ))}
            </span>
            <span className={styles.spineFoot}>
              <span className={styles.spineTitle}>{item.title}</span>
              {item.year ? <span className={styles.spineYear}>{item.year}</span> : null}
            </span>
          </>
        ) : (
          <>
            <span className={styles.tileArt}>
              <Cover
                url={item.cover_url}
                title={item.title}
                type={type}
                size="tile"
                ratio={rayon.ratio}
              />
            </span>
            {/*
              Les pastilles et le décompte sont **sous** la jaquette, pas
              par-dessus. La maquette les pose sur l'artwork parce que le sien
              est un dégradé vide ; le nôtre est le plus souvent le repli
              typographique de `Cover` — un panneau qui porte déjà le type en
              haut et le titre en bas. Les y superposer les rendait illisibles
              dès qu'une tuile ne faisait qu'une colonne.
            */}
            <span className={styles.tileFoot}>
              <span className={styles.tileLine}>
                <span className={styles.tileTitle}>{item.title}</span>
                {item.year ? <span className={styles.tileYear}>{item.year}</span> : null}
              </span>
              {nommes.length > 0 || reste > 0 || (item.progress && item.progress.total > 0) ? (
                <span className={styles.tileMarks}>
                  {nommes.map((account) => (
                    <MemberChip key={account.id} account={account} size="sm" />
                  ))}
                  {reste > 0 ? <span className={styles.tileRest}>+{reste}</span> : null}
                  {/* Ce que la charge de liste sait compter, et rien d'autre :
                      le contrat ne donne ni durée ni pagination sur un item de
                      rayon, seulement la progression des ensembles numérotés. */}
                  {item.progress && item.progress.total > 0 ? (
                    <span className={styles.tileUnits}>
                      {item.progress.total} {type === 'tv' ? 'ép.' : 'vol.'}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </span>
          </>
        )}
      </Link>
    </li>
  )
}
