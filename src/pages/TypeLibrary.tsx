import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchLibrary } from '../api/endpoints'
import type { LibraryFilters, LibrarySort } from '../api/endpoints'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import { useReference } from '../reference/ReferenceContext'
import type { MediaType, StatusOption, TrackingStatus } from '../api/schema'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import MediaCard from '../components/MediaCard'
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
 * Combien de pages ont été chargées, **dans l'adresse**.
 *
 * Le rayon empile ses pages ; l'adresse, elle, n'en disait rien. Ouvrir une
 * fiche depuis la quatrième page puis revenir en arrière ramenait à la
 * première dès que le cache avait expiré — cinq minutes suffisent. Le nombre
 * de pages y figure donc désormais, et la seule chose qu'il rétablit est ce
 * qu'on avait déjà demandé.
 *
 * Ce n'est **pas** une pagination numérotée : `?pages=4` veut dire « les
 * quatre premières », pas « la quatrième ». La différence compte, parce que la
 * seconde demanderait de sauter directement à une position, ce que la
 * pagination par curseur ne permet pas — c'est la discussion qu'on a tranchée
 * en gardant l'accumulation.
 */
function lirePages(params: URLSearchParams): number {
  const brut = Number(params.get('pages'))
  if (!Number.isInteger(brut) || brut < 1) return 1
  // Une borne haute : rien n'empêche d'écrire `?pages=9999` à la main, et on
  // ne va pas lancer neuf mille requêtes pour l'honorer.
  return Math.min(brut, 25)
}

function Library({ type }: { type: MediaType }) {
  const { user } = useSession()
  const { statusesOf } = useReference()
  const [status, setStatus] = useState<TrackingStatus | null>(null)
  const [ownedOnly, setOwnedOnly] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<LibrarySort>('added')
  const [params, setParams] = useSearchParams()
  const pagesVoulues = lirePages(params)

  const filters: LibraryFilters = {
    type,
    status,
    owned: ownedOnly ? true : null,
    favorite: favoritesOnly ? true : null,
    sort,
  }

  const { data, isPending, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.libraryWith(filters),
      queryFn: ({ pageParam, signal }) => fetchLibrary(filters, pageParam, signal),
      initialPageParam: null as string | null,
      // Le curseur est opaque : on le relaie sans l'interpréter. `null` marque
      // la dernière page — c'est le seul signal d'arrêt fiable, une page peut
      // très bien être plus courte que `limit` sans être la dernière.
      getNextPageParam: (lastPage) => lastPage.next_cursor,
    })

  const chargees = data?.pages.length ?? 0

  // Rattrapage à l'ouverture : on redemande page après page jusqu'au compte
  // annoncé par l'adresse. Une seule à la fois, et seulement quand la
  // précédente est arrivée — le curseur de la suivante en dépend.
  useEffect(() => {
    if (chargees === 0 || chargees >= pagesVoulues) return
    if (!hasNextPage || isFetchingNextPage) return
    void fetchNextPage()
  }, [chargees, pagesVoulues, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Et l'inverse : ce que l'on charge s'inscrit dans l'adresse. `replace` pour
  // ne pas empiler dix entrées d'historique — revenir en arrière doit ramener
  // à l'écran précédent, pas dérouler les clics un par un.
  useEffect(() => {
    if (chargees <= pagesVoulues) return
    const suite = new URLSearchParams(params)
    if (chargees > 1) suite.set('pages', String(chargees))
    else suite.delete('pages')
    setParams(suite, { replace: true })
  }, [chargees, pagesVoulues, params, setParams])

  const items = data?.pages.flatMap((page) => page.items) ?? []
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
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(event) => setOwnedOnly(event.target.checked)}
          />
          Possédés seulement
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(event) => setFavoritesOnly(event.target.checked)}
          />
          Mes coups de cœur
        </label>

        <label className={styles.sort}>
          Trier par
          <select value={sort} onChange={(event) => setSort(event.target.value as LibrarySort)}>
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
      ) : (
        <>
          <ul className={styles.grid}>
            {items.map((item) => (
              <MediaCard key={item.id} item={item} me={user} />
            ))}
          </ul>

          {/* Pas de défilement infini : on charge sur demande, pour que la
              position dans la page reste sous le contrôle de l'utilisateur. */}
          {hasNextPage ? (
            <div className={styles.more}>
              <button
                type="button"
                className={styles.moreButton}
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Chargement…' : 'Charger la suite'}
              </button>
            </div>
          ) : (
            <p className={styles.end}>
              {items.length} œuvre{items.length > 1 ? 's' : ''} dans ce rayon.
            </p>
          )}
        </>
      )}
    </div>
  )
}
