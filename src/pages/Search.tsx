import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { addMedia, searchExternal } from '../api/endpoints'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import type { MediaType, SearchResult } from '../api/schema'
import Cover from '../components/Cover'
import ErrorNotice from '../components/ErrorNotice'
import Reveal from '../components/Reveal'
import { RAYONNAGES } from '../rayons'
import { queryKeys } from '../api/keys'
import styles from './Search.module.css'

/** Combien de recherches passées la page garde sous la main. */
const MAX_RECENTES = 4
const CLE_RECENTES = 'mediatheque:recherches'

/**
 * Les dernières recherches — **les miennes**, et nulle part ailleurs qu'ici.
 *
 * Aucune route ne les sert et ce n'est pas un oubli : ce sont mes propres
 * frappes, pas un état que le serveur tiendrait. Les garder en local n'est donc
 * pas un recalcul de ce que dit l'API, c'est une commodité de ce poste.
 *
 * Tout est enveloppé : `localStorage` **lève** en navigation privée sur Safari,
 * et une exception ici emporterait l'écran de recherche entier.
 */
const lireRecentes = (): string[] => {
  try {
    const brut = window.localStorage.getItem(CLE_RECENTES)
    const liste: unknown = brut ? JSON.parse(brut) : []
    return Array.isArray(liste) ? liste.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

const noterRecente = (q: string) => {
  try {
    const liste = [q, ...lireRecentes().filter((x) => x !== q)].slice(0, MAX_RECENTES)
    window.localStorage.setItem(CLE_RECENTES, JSON.stringify(liste))
  } catch {
    // Stockage refusé : la recherche marche quand même, elle ne se souvient pas.
  }
}

/**
 * Chercher dans les six rayons à la fois.
 *
 * **`/search` exige un `type`** et interroge une source externe par rayon : une
 * requête ne peut donc pas balayer le fonds entier. On en lance six, une par
 * rayon, et l'écran groupe ce qui revient — c'est ce que montre la maquette, et
 * c'est le seul moyen de l'obtenir avec ce contrat.
 *
 * Chaque rayon a sa requête, donc son propre cache et **son propre échec** :
 * une source muette se dit à sa place au lieu de faire disparaître le groupe,
 * sans quoi une panne de TMDB se lirait comme « aucun film de ce nom ».
 *
 * La requête vit dans l'adresse : le bandeau y mène par `?q=`, et une recherche
 * se partage.
 */
export default function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const [draft, setDraft] = useState(q)
  // L'ISBN est une recherche exacte, et seuls les livres en ont un : elle sort
  // de l'éventail plutôt que de lancer cinq requêtes qui répondront 400.
  const [byIsbn, setByIsbn] = useState(false)
  const [recentes, setRecentes] = useState<string[]>(lireRecentes)

  useEffect(() => {
    setDraft(q)
    if (q === '') return
    noterRecente(q)
    setRecentes(lireRecentes())
  }, [q])

  const soumettre = (event: FormEvent) => {
    event.preventDefault()
    const valeur = draft.trim()
    if (valeur === '') return
    setParams(valeur ? { q: valeur } : {})
  }

  const rayons = byIsbn ? (['book'] as const) : MEDIA_TYPES

  const requetes = useQueries({
    queries: rayons.map((type) => {
      const critere = byIsbn ? { isbn: q } : { q }
      return {
        queryKey: queryKeys.search(type, critere),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          searchExternal({ type, ...critere }, null, signal),
        enabled: q !== '',
        // Une recherche externe coûte cher et bouge peu : inutile de la
        // relancer au moindre retour sur l'écran.
        staleTime: 5 * 60 * 1000,
      }
    }),
  })

  const groupes = rayons.map((type, i) => ({ type, requete: requetes[i] }))
  const enCours = groupes.some((g) => g.requete.isPending && q !== '')
  const total = groupes.reduce((n, g) => n + (g.requete.data?.items.length ?? 0), 0)
  const aucunResultat = q !== '' && !enCours && total === 0

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Recherche dans le fonds</p>

        <form className={styles.form} onSubmit={soumettre} role="search">
          <input
            type="search"
            className={styles.input}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={byIsbn ? '978…' : 'un titre, un auteur…'}
            inputMode={byIsbn ? 'numeric' : 'search'}
            aria-label="Termes de recherche"
          />
          <button type="submit" className={styles.submit} disabled={draft.trim() === ''}>
            Chercher
          </button>
        </form>

        <div className={styles.introFoot}>
          {/* La recherche par ISBN n'a de sens que pour les livres, et elle est
              exacte : elle ne se mêle pas à l'éventail. */}
          <label className={styles.isbnToggle}>
            <input
              type="checkbox"
              checked={byIsbn}
              onChange={(event) => setByIsbn(event.target.checked)}
            />
            Chercher un livre par ISBN
          </label>

          {recentes.length > 0 ? (
            <div className={styles.recentes}>
              <span className={styles.recentesLabel}>Dernières recherches</span>
              {recentes.map((terme) => (
                <button
                  key={terme}
                  type="button"
                  className={styles.recente}
                  onClick={() => setParams({ q: terme })}
                >
                  {terme}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {q === '' ? (
        <p className={styles.hint}>
          Les fiches viennent de sources extérieures — une par rayon. La première réponse peut
          demander quelques secondes.
        </p>
      ) : (
        <>
          {enCours ? <p className={styles.hint}>Interrogation des sources…</p> : null}

          {groupes.map(({ type, requete }) => (
            <Groupe key={type} type={type} requete={requete} />
          ))}

          {/*
            L'état vide de la maquette : un bloc en tireté qui invite à verser
            l'œuvre, jamais une illustration. Il n'apparaît qu'une fois **tous**
            les rayons revenus — sans quoi il clignoterait entre deux réponses.
          */}
          {aucunResultat ? (
            <div className={styles.vide}>
              <p className={styles.videEyebrow}>Rien au fonds</p>
              <h2 className={styles.videTitle}>
                Personne du cercle n’a encore versé «&nbsp;{q}&nbsp;».
              </h2>
              <p className={styles.videNote}>
                Ce n’est pas une absence, c’est une place libre. Si vous l’avez traversée, vous êtes
                la première.
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

/** Ce que `Groupe` lit d'une requête — pas plus, pour ne pas dépendre de sa forme. */
interface Requete {
  isPending: boolean
  error: unknown
  data?: { items: SearchResult[] }
  refetch: () => void
}

/**
 * Un rayon dans les résultats.
 *
 * Trois issues, et aucune ne se confond avec une autre : la source a répondu et
 * n'a rien, la source n'a pas répondu, la source a répondu. **Le rayon muet
 * reste à l'écran** — le faire disparaître ferait lire une panne comme une
 * absence d'œuvre.
 */
function Groupe({ type, requete }: { type: MediaType; requete: Requete }) {
  const items = requete.data?.items ?? []
  const indisponible = requete.error instanceof ApiError && requete.error.isSearchUnavailable

  if (requete.isPending) return null
  if (!indisponible && !requete.error && items.length === 0) return null

  return (
    <Reveal className={styles.groupe}>
      {/* `data-media-type` est porté par un élément interne : `Reveal` n'expose
          que `as`, `className` et ses enfants, et un écran ne se donne pas le
          droit d'y faire passer des attributs qu'il n'a pas déclarés. */}
      <div data-media-type={type}>
      <div className={styles.groupeHead}>
        <span className={styles.groupeNom}>{typeLabelPlural(type)}</span>
        <span className={styles.groupeRule} aria-hidden="true" />
        <span className={styles.groupeCompte}>
          {indisponible || requete.error
            ? 'source injoignable'
            : `${items.length} résultat${items.length > 1 ? 's' : ''}`}
        </span>
      </div>

      {indisponible ? (
        // Message du back affiché tel quel : il est déjà rédigé en français, et
        // il sait, lui, pourquoi la source manque.
        <p className={styles.indisponible}>{(requete.error as ApiError).message}</p>
      ) : requete.error ? (
        <ErrorNotice error={requete.error} onRetry={() => requete.refetch()} />
      ) : (
        <ul className={styles.results}>
          {items.map((item) => (
            <ResultRow key={`${item.source}-${item.external_id}`} result={item} type={type} />
          ))}
        </ul>
      )}
      </div>
    </Reveal>
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
    <li
      className={styles.result}
      style={{ '--ratio': RAYONNAGES[type].ratio.replace('/', ' / ') } as CSSProperties}
    >
      <div className={styles.resultCover}>
        <Cover
          url={result.cover_url}
          title={result.title}
          type={type}
          ratio={RAYONNAGES[type].ratio}
        />
      </div>

      <div className={styles.resultBody}>
        <p className={styles.resultTitle}>{result.title}</p>
        {result.original_title && result.original_title !== result.title ? (
          <p className={styles.resultOriginal}>{result.original_title}</p>
        ) : null}
        <p className={styles.resultMeta}>
          {[result.year, result.source].filter(Boolean).join(' · ')}
        </p>
        {add.error ? <ErrorNotice error={add.error} /> : null}
      </div>

      <div className={styles.resultAction}>
        {result.in_library && result.media_id ? (
          <button
            type="button"
            className={styles.openButton}
            onClick={() => navigate(`/media/${result.media_id}`)}
          >
            Au fonds
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
            {add.isPending ? 'Ajout en cours…' : 'Verser au fonds'}
          </button>
        )}
      </div>
    </li>
  )
}
