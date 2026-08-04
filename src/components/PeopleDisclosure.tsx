import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { Account, Page } from '../api/schema'
import ErrorNotice from './ErrorNotice'
import IdentityDot from './IdentityDot'
import styles from './PeopleDisclosure.module.css'

/** Une personne, et éventuellement ce qu'elle fait de l'œuvre. */
export interface Person {
  user: Account
  note?: string | null
}

/**
 * Déplie un compteur en une liste de noms.
 *
 * Partout ailleurs l'API ne donne qu'un nombre — `others.count`,
 * `watched.others`, `tracking.others`. C'est délibéré : afficher les identités
 * de tout le monde sur chaque ligne d'une liste serait illisible, et coûterait
 * une requête par ligne. On ne les demande donc qu'au clic, et seulement là.
 *
 * La requête n'est lancée qu'une fois ouverte (`enabled`), et le résultat reste
 * en cache : refermer puis rouvrir ne redemande rien.
 */
export default function PeopleDisclosure({
  count,
  label,
  panelTitle,
  queryKey,
  fetcher,
  size = 'base',
}: {
  /** Le compteur de l'API : il exclut toujours moi, et parfois mes abonnements. */
  count: number
  /** Ce qu'on annonce, au singulier puis au pluriel : `['l’a vu', 'l’ont vu']`. */
  label: [string, string]
  /**
   * En-tête du panneau. Il compte : la liste dépliée renvoie **tout le monde**,
   * moi compris, là où le compteur ne montrait que « les autres ». Sans ce
   * titre, on cliquerait sur « +1 » pour découvrir deux noms.
   */
  panelTitle: string
  queryKey: readonly unknown[]
  fetcher: (signal?: AbortSignal) => Promise<Page<Person>>
  size?: 'sm' | 'base'
}) {
  const [open, setOpen] = useState(false)

  const people = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetcher(signal),
    enabled: open,
    staleTime: 60_000,
  })

  if (count <= 0) return null

  const items = people.data?.items ?? []
  const truncated = people.data?.next_cursor !== null && people.data !== undefined

  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        className={size === 'sm' ? styles.triggerSm : styles.trigger}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        +{count}
        <span className={styles.triggerLabel}>
          {' '}
          {count > 1 ? label[1] : label[0]}
        </span>
      </button>

      {open ? (
        <div className={styles.panel}>
          <p className={styles.panelTitle}>{panelTitle}</p>

          {people.isPending ? (
            <p className={styles.quiet}>Chargement…</p>
          ) : people.error ? (
            <ErrorNotice error={people.error} onRetry={() => void people.refetch()} />
          ) : items.length === 0 ? (
            <p className={styles.quiet}>Personne, finalement.</p>
          ) : (
            <>
              <ul className={styles.list}>
                {items.map((person) => (
                  <li key={person.user.id} className={styles.row}>
                    <Link to={`/membres/${person.user.id}`} className={styles.rowLink}>
                      <IdentityDot account={person.user} size="sm" />
                      <span className={styles.name}>{person.user.pseudo}</span>
                      {person.user.deactivated ? (
                        <span className={styles.quietTag}>compte désactivé</span>
                      ) : null}
                    </Link>
                    {person.note ? <span className={styles.note}>{person.note}</span> : null}
                  </li>
                ))}
              </ul>

              {/* Une seule page suffit à l'usage ; le dire évite de laisser
                  croire que la liste est complète quand elle ne l'est pas. */}
              {truncated ? (
                <p className={styles.quiet}>
                  Les {items.length} premiers. Ouvre la fiche d'un membre pour en voir davantage.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </span>
  )
}
