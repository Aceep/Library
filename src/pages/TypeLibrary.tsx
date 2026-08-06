import { useRef, useState } from 'react'
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
import LoadingNotice from '../components/LoadingNotice'
import ErrorNotice from '../components/ErrorNotice'
import MemberChip from '../components/MemberChip'
import Pagination from '../components/Pagination'
import Reveal from '../components/Reveal'
import { usePageInUrl } from '../components/usePageInUrl'
import { useSession } from '../session/SessionContext'
import { queryKeys } from '../api/keys'
import { RAYONNAGES } from '../rayons'
import type { Rayonnage } from '../rayons'
import { useDocumentTitle } from '../components/useDocumentTitle'
import styles from './TypeLibrary.module.css'

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
  // Le haut de la mosaïque : c'est *elle* qu'on ramène sous les yeux en
  // changeant de page, pas le haut du document — sans quoi on retraverserait
  // l'en-tête du rayon à chaque fois.
  const liste = useRef<HTMLUListElement>(null)
  useDocumentTitle(typeLabelPlural(type))
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
            <LoadingNotice />
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
              <ul ref={liste} className={styles.shelf} aria-busy={isFetching}>
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
                  ancre={liste}
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
  const { statusesOf } = useReference()
  // Tous les rayons n'ont pas d'état intermédiaire : un album s'écoute ou ne
  // s'écoute pas, et la référence le dit. Interroger `doing` sur la musique
  // ramènerait toujours une liste vide — on ne pose pas la question.
  const aUnEnCours = statusesOf(type).some((statut) => statut.value === 'doing')

  const filters: LibraryFilters = { type, status: 'doing', limit: 3 }
  const { data, error } = useQuery({
    queryKey: queryKeys.libraryPage(filters, 1),
    queryFn: ({ signal }) => fetchLibraryPage(filters, 1, signal),
    enabled: aUnEnCours,
  })

  const items = data?.items ?? []

  // Le titre se compose en deux voix — le premier mot droit, la suite en
  // italique — comme tous les titres de section de la direction.
  const [premier, ...suite] = titre.split(' ')
  const entete = (
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>
        {premier} <em>{suite.join(' ')}</em>
      </h2>
      <span className={styles.sectionNote}>ce que je traverse</span>
    </div>
  )

  // Une panne se dit. Sans cette branche, la section disparaissait comme si de
  // rien n'était et « on n'a pas pu regarder » se lisait « tu n'as rien en
  // cours » — la seule des deux phrases qu'on ne peut pas laisser croire.
  if (error) {
    return (
      <Reveal>
        {entete}
        <p className={styles.panne}>Ce que tu traverses n’a pas pu être chargé.</p>
      </Reveal>
    )
  }

  // Rien en cours n'est pas un incident : la section disparaît, elle n'affiche
  // pas un vide décoré.
  if (items.length === 0) return null

  return (
    <Reveal>
      {entete}
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
