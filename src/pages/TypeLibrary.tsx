import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchLibraryPage } from '../api/endpoints'
import type { LibraryFilters, LibrarySort } from '../api/endpoints'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import { useReference } from '../reference/ReferenceContext'
import type { MediaType, StatusOption, TrackingStatus } from '../api/schema'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import MediaCard from '../components/MediaCard'
import Pagination from '../components/Pagination'
import { useSession } from '../session/SessionContext'
import { queryKeys } from '../api/keys'
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

export default function TypeLibrary() {
  const { type } = useParams()
  if (!isMediaType(type)) return <Navigate to="/" replace />
  // `key` remet les filtres à zéro quand on change de rayon : sans ça, on
  // garderait le filtre du type précédent en arrivant sur le suivant.
  return <Library key={type} type={type} />
}

/**
 * La page demandée, **dans l'adresse**.
 *
 * Remplace le `?pages=N` de l'étape précédente, qui voulait dire « les N
 * premières » et non « la N-ième ». Il n'existait que parce que la pagination
 * par curseur ne savait pas revenir à un endroit : il rétablissait une pile,
 * pas une position. Le back sait maintenant rendre la page 7 directement, et
 * la demi-mesure n'a plus de raison d'être.
 *
 * `?page=1` ne s'écrit pas dans l'adresse : la première page est l'adresse
 * nue, et une adresse partagée doit être la plus courte qui dise la chose.
 */
function lirePage(params: URLSearchParams): number {
  const brut = Number(params.get('page'))
  if (!Number.isInteger(brut) || brut < 1) return 1
  // Le back plafonne à 1000 et répond 400 au-delà : on borne ici pour que
  // `?page=99999` écrit à la main affiche la dernière page plutôt qu'une
  // erreur, qui ne dirait rien d'utile à qui a mal recopié une adresse.
  return Math.min(brut, 1000)
}

function Library({ type }: { type: MediaType }) {
  const { user } = useSession()
  const { statusesOf } = useReference()
  const [status, setStatus] = useState<TrackingStatus | null>(null)
  const [ownedOnly, setOwnedOnly] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<LibrarySort>('added')
  const [params, setParams] = useSearchParams()
  const page = lirePage(params)

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

  const adresseDe = (numero: number) => {
    const suite = new URLSearchParams(params)
    if (numero > 1) suite.set('page', String(numero))
    else suite.delete('page')
    const requete = suite.toString()
    return requete ? `?${requete}` : location.pathname
  }

  const allerA = (numero: number) => {
    const suite = new URLSearchParams(params)
    if (numero > 1) suite.set('page', String(numero))
    else suite.delete('page')
    // Pas `replace` : changer de page est une navigation, et le retour arrière
    // doit ramener à la page d'où l'on vient. C'est l'inverse du choix fait
    // pour `?pages=N`, qui n'enregistrait qu'un état de chargement.
    setParams(suite)
  }

  // Changer de filtre ou de tri remet à la première page. Rester sur la 7 en
  // changeant de filtre afficherait une page vide sur une liste qui en a deux,
  // et donnerait l'impression que le filtre ne ramène rien.
  const remettreALaPremiere = () => {
    if (page === 1) return
    const suite = new URLSearchParams(params)
    suite.delete('page')
    setParams(suite, { replace: true })
  }

  const items = data?.items ?? []
  const infoPages = data?.pages ?? null
  const filtered = status !== null || ownedOnly || favoritesOnly

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Bibliothèque</p>
        <h1 className={styles.title}>{typeLabelPlural(type)}</h1>
      </header>

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
          <select value={sort} onChange={(event) => {
              setSort(event.target.value as LibrarySort)
              remettreALaPremiere()
            }}>
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
            `aria-busy` pendant qu'une page arrive : les cartes affichées sont
            celles de la page précédente, gardées exprès pour que l'écran ne
            saute pas, et un lecteur d'écran doit savoir qu'elles ne sont plus
            à jour.
          */}
          <ul className={styles.grid} aria-busy={isFetching}>
            {items.map((item) => (
              <MediaCard key={item.id} item={item} me={user} />
            ))}
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
    </div>
  )
}
