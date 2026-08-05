import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { addMedia, searchExternal } from '../api/endpoints'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import type { MediaType, SearchResult } from '../api/schema'
import Cover from '../components/Cover'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import { queryKeys } from '../api/keys'
import styles from './Search.module.css'

export default function Search() {
  const [type, setType] = useState<MediaType>('movie')
  // Le champ du bandeau arrive ici par `?q=`. Sans cette lecture il mènerait à
  // un écran vide, c'est-à-dire qu'il mentirait sur ce qu'il vient de recevoir.
  const [params] = useSearchParams()
  const initial = params.get('q')?.trim() ?? ''

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Recherche</p>
        <h1 className={styles.title}>Ajouter une œuvre</h1>
      </header>

      <nav className={styles.tabs} aria-label="Type d'œuvre">
        {MEDIA_TYPES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={styles.tab}
            aria-pressed={type === candidate}
            onClick={() => setType(candidate)}
          >
            {typeLabelPlural(candidate)}
          </button>
        ))}
      </nav>

      {/* `key` : changer d'onglet remet à zéro la requête et les résultats,
          plutôt que d'afficher ceux du type précédent le temps d'un aller-retour.
          La requête d'URL y entre aussi — arriver avec un `?q=` différent
          relance la recherche au lieu de garder l'ancienne à l'écran. */}
      <TypeSearch key={`${type}:${initial}`} type={type} initial={initial} />
    </div>
  )
}

function TypeSearch({ type, initial }: { type: MediaType; initial: string }) {
  const [draft, setDraft] = useState(initial)
  const [byIsbn, setByIsbn] = useState(false)
  // Une requête venue de l'URL est déjà validée : on la soumet d'emblée plutôt
  // que de la poser dans le champ en attendant une seconde validation.
  const [submitted, setSubmitted] = useState<{ q?: string; isbn?: string } | null>(
    initial ? { q: initial } : null,
  )

  const search = useInfiniteQuery({
    queryKey: queryKeys.search(type, submitted),
    queryFn: ({ pageParam, signal }) =>
      searchExternal({ type, ...submitted }, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: submitted !== null,
    // Une recherche externe coûte cher et bouge peu : inutile de la relancer
    // au moindre retour sur l'onglet.
    staleTime: 5 * 60 * 1000,
  })

  const items = search.data?.pages.flatMap((page) => page.items) ?? []
  const total = search.data?.pages[0]?.total ?? 0

  // Un 503 ne concerne que cette source : le reste de l'application est intact,
  // et on le dit sur place plutôt que d'afficher une page d'erreur globale.
  const unavailable = search.error instanceof ApiError && search.error.isSearchUnavailable

  return (
    <>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          const value = draft.trim()
          if (value === '') return
          setSubmitted(byIsbn ? { isbn: value } : { q: value })
        }}
      >
        <input
          type="search"
          className={styles.input}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={byIsbn ? '978…' : `Chercher parmi les ${typeLabelPlural(type).toLowerCase()}`}
          inputMode={byIsbn ? 'numeric' : 'search'}
          aria-label="Termes de recherche"
        />
        <button type="submit" className={styles.submit} disabled={draft.trim() === ''}>
          Chercher
        </button>

        {/* La recherche par ISBN n'a de sens que pour les livres. */}
        {type === 'book' ? (
          <label className={styles.isbnToggle}>
            <input
              type="checkbox"
              checked={byIsbn}
              onChange={(event) => {
                setByIsbn(event.target.checked)
                setSubmitted(null)
              }}
            />
            Chercher par ISBN
          </label>
        ) : null}
      </form>

      {submitted === null ? (
        <p className={styles.hint}>
          Les fiches viennent de sources extérieures&nbsp;: la première réponse peut demander
          quelques secondes.
        </p>
      ) : search.isPending ? (
        <p className={styles.hint}>Interrogation de la source…</p>
      ) : unavailable ? (
        <div className={styles.unavailable}>
          {/* Message du back affiché tel quel : il est déjà en français et il
              sait, lui, pourquoi la source manque. */}
          <p className={styles.unavailableText}>{(search.error as ApiError).message}</p>
          <p className={styles.unavailableNote}>
            Les autres rayons et le reste de la médiathèque fonctionnent normalement.
          </p>
        </div>
      ) : search.error ? (
        <ErrorNotice error={search.error} onRetry={() => void search.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucun résultat"
          note="La source ne connaît rien sous ce nom. Essaie une autre orthographe, ou le titre original."
        />
      ) : (
        <>
          <p className={styles.count}>
            {total > items.length
              ? `${items.length} résultats affichés sur ${total}`
              : `${items.length} résultat${items.length > 1 ? 's' : ''}`}
          </p>

          <ul className={styles.results}>
            {items.map((item) => (
              <ResultRow key={`${item.source}-${item.external_id}`} result={item} type={type} />
            ))}
          </ul>

          {search.hasNextPage ? (
            <div className={styles.more}>
              <button
                type="button"
                className={styles.moreButton}
                onClick={() => void search.fetchNextPage()}
                disabled={search.isFetchingNextPage}
              >
                {search.isFetchingNextPage ? 'Chargement…' : 'Charger la suite'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  )
}

function ResultRow({ result, type }: { result: SearchResult; type: MediaType }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const add = useMutation({
    mutationFn: () =>
      addMedia({ source: result.source, external_id: result.external_id, type: result.type }),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.library })
      void queryClient.invalidateQueries({ queryKey: queryKeys.home })
      // `created: false` veut dire que la fiche existait déjà et que le suivi
      // y a été rattaché — même issue que la création, on ouvre la fiche.
      navigate(`/media/${response.media.id}`)
    },
  })

  return (
    <li className={styles.result}>
      <div className={styles.resultCover}>
        <Cover url={result.cover_url} title={result.title} type={type} />
      </div>

      <div className={styles.resultBody}>
        <p className={styles.resultTitle}>{result.title}</p>
        {result.original_title && result.original_title !== result.title ? (
          <p className={styles.resultOriginal}>{result.original_title}</p>
        ) : null}
        <p className={styles.resultMeta}>
          {[result.year, result.source].filter(Boolean).join(' · ')}
        </p>
        {result.summary ? <p className={styles.resultSummary}>{result.summary}</p> : null}
        {add.error ? <ErrorNotice error={add.error} /> : null}
      </div>

      <div className={styles.resultAction}>
        {result.in_library && result.media_id ? (
          <button
            type="button"
            className={styles.openButton}
            onClick={() => navigate(`/media/${result.media_id}`)}
          >
            Ouvrir la fiche
          </button>
        ) : (
          // L'ajout va chercher la fiche complète chez la source : ça prend
          // plusieurs secondes, et l'attente est réelle, pas simulée.
          <button
            type="button"
            className={styles.addButton}
            onClick={() => add.mutate()}
            disabled={add.isPending}
          >
            {add.isPending ? 'Ajout en cours…' : 'Ajouter'}
          </button>
        )}
      </div>
    </li>
  )
}
