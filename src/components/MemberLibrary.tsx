import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMemberLibraryPage } from '../api/endpoints'
import type { MemberLibraryFilters, MemberLibrarySort } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import { MEDIA_TYPES, crossTypeStatusLabel, typeLabelPlural } from '../api/schema'
import type { Account, MediaType, TrackingStatus } from '../api/schema'
import ErrorNotice from './ErrorNotice'
import MediaCard from './MediaCard'
import Pagination from './Pagination'
import { champ, useFiltersInUrl } from './useFiltersInUrl'
import { usePageInUrl } from './usePageInUrl'
import LoadingNotice from './LoadingNotice'
import styles from './MemberLibrary.module.css'

const STATUS_FILTERS: Array<{ value: TrackingStatus | null; label: string }> = [
  { value: null, label: 'Tout' },
  // Sa bibliothèque entière, tous types mêlés : aucun libellé accordé n'a de
  // sens ici, faute d'un type auquel l'accorder.
  { value: 'todo', label: crossTypeStatusLabel('todo') },
  { value: 'doing', label: crossTypeStatusLabel('doing') },
  { value: 'done', label: crossTypeStatusLabel('done') },
]

const SORTS: Array<{ value: MemberLibrarySort; label: string }> = [
  { value: 'rating', label: 'Ses meilleures notes' },
  { value: 'added', label: 'Ajout récent' },
  { value: 'title', label: 'Titre' },
]

/**
 * Ce qu'un membre suit — le compteur de son profil, déplié.
 *
 * Le piège de cet écran est que les filtres n'y portent pas sur ce qu'on croit :
 * `status` et `favorite` s'appliquent à **son** suivi à lui, alors qu'ils
 * portent sur le mien partout ailleurs. Les libellés le disent en toutes
 * lettres — c'est la seule protection, l'API ne peut pas le deviner.
 */
export default function MemberLibrary({
  userId,
  pseudo,
  isMe,
  me,
  trackedCount,
}: {
  userId: string
  pseudo: string
  isMe: boolean
  me: Account
  trackedCount: number
}) {
  // Le haut de la grille : c'est elle qu'on ramène sous les yeux en changeant
  // de page, pas le haut du profil.
  const liste = useRef<HTMLUListElement>(null)
  // Les mêmes hooks que le rayon d'un type — pour les filtres comme pour la
  // page : deux listes qui se ressemblent doivent se comporter pareil, et le
  // partage vaut mieux que la relecture.
  const [filtres, poser] = useFiltersInUrl({
    type: champ('', ['', ...MEDIA_TYPES]),
    status: champ('', ['', 'todo', 'doing', 'done']),
    aime: champ('', ['', '1']),
    // Le défaut est celui de l'API, et il n'est pas le même qu'en rayon : on
    // vient ici voir ce qu'il a préféré, pas ce qu'il vient d'ajouter.
    sort: champ<MemberLibrarySort>('rating', ['rating', 'added', 'title']),
  })
  const type = (filtres.type === '' ? null : filtres.type) as MediaType | null
  const status = (filtres.status === '' ? null : filtres.status) as TrackingStatus | null
  const favoriteOnly = filtres.aime === '1'
  const sort = filtres.sort

  const { page, adresseDe, allerA } = usePageInUrl()

  const filters: MemberLibraryFilters = {
    type: type ?? undefined,
    status,
    favorite: favoriteOnly ? true : null,
    sort,
  }

  const list = useQuery({
    queryKey: queryKeys.memberLibraryPage(userId, filters, page),
    queryFn: ({ signal }) => fetchMemberLibraryPage(userId, filters, page, signal),
    // La page précédente reste affichée pendant que la suivante arrive, sans
    // quoi chaque clic vide puis remplit la grille et l'écran saute deux fois.
    placeholderData: (precedente) => precedente,
  })

  const items = list.data?.items ?? []
  const infoPages = list.data?.pages ?? null
  const filtered = type !== null || status !== null || favoriteOnly

  if (trackedCount === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.heading}>{isMe ? 'Ma bibliothèque' : 'Sa bibliothèque'}</h2>
        <p className={styles.quiet}>
          {isMe ? "Tu ne suis encore aucune œuvre." : `${pseudo} ne suit encore aucune œuvre.`}
        </p>
      </section>
    )
  }

  const possessive = isMe ? 'tes' : 'ses'

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{isMe ? 'Ma bibliothèque' : 'Sa bibliothèque'}</h2>

      <div className={styles.filters}>
        <div className={styles.filterGroup} role="group" aria-label="Filtrer par type">
          <button
            type="button"
            className={styles.chip}
            aria-pressed={type === null}
            onClick={() => poser({ type: '' })}
          >
            Tout
          </button>
          {MEDIA_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              className={styles.chip}
              aria-pressed={type === value}
              onClick={() => poser({ type: value })}
            >
              {typeLabelPlural(value)}
            </button>
          ))}
        </div>

        <div
          className={styles.filterGroup}
          role="group"
          aria-label={`Filtrer sur ${possessive} statuts`}
        >
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              className={styles.chip}
              aria-pressed={status === filter.value}
              onClick={() => poser({ status: filter.value ?? '' })}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={favoriteOnly}
            onChange={(event) => poser({ aime: event.target.checked ? '1' : '' })}
          />
          {isMe ? 'Mes coups de cœur' : 'Ses coups de cœur'}
        </label>

        <label className={styles.sort}>
          Trier par
          <select
            value={sort}
            onChange={(event) => poser({ sort: event.target.value as MemberLibrarySort })}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Sans cette ligne, on filtre « en cours » et on croit voir ce qu'on a
          soi-même en cours. C'est l'inverse de partout ailleurs. */}
      <p className={styles.perspective}>
        Statut et coups de cœur portent sur {possessive} suivis
        {isMe ? '' : ` à ${pseudo}`}. Les notes affichées sous chaque vignette restent celles de
        tout le monde.
      </p>

      {list.isPending ? (
        <LoadingNotice />
      ) : list.error ? (
        <ErrorNotice error={list.error} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        /* Le même partage à trois que sur un rayon : vide, filtré, ou au-delà
           de la fin. Le troisième doit ramener quelque part. */
        infoPages !== null && infoPages.pages > 0 && page > infoPages.pages ? (
          <p className={styles.quiet}>
            Cette bibliothèque compte {infoPages.pages} page
            {infoPages.pages > 1 ? 's' : ''} — la page {page} n’en fait plus partie.{' '}
            <Link to={adresseDe(infoPages.pages)}>Aller à la dernière page</Link>
          </p>
        ) : (
          <p className={styles.quiet}>
            {filtered ? 'Aucune œuvre ne correspond au filtre actif.' : 'Rien à afficher ici.'}
          </p>
        )
      ) : (
        <>
          <ul ref={liste} className={styles.grid} aria-busy={list.isFetching}>
            {items.map((item) => (
              <MediaCard key={item.id} item={item} me={me} />
            ))}
          </ul>

          {infoPages !== null && infoPages.pages > 1 ? (
            <Pagination
              info={infoPages}
              hrefOf={adresseDe}
              onNavigate={allerA}
              // Nommée par ce qu'elle pagine : sur un profil, « Pages du rayon »
              // ne dirait pas de quoi il s'agit, et la page en contient déjà une
              // autre navigation.
              label={isMe ? 'Pages de ma bibliothèque' : `Pages de la bibliothèque de ${pseudo}`}
              ancre={liste}
            />
          ) : null}
        </>
      )}
    </section>
  )
}
