import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { addMedia, fetchEditions, searchExternal } from '../api/endpoints'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import type { MediaType, SearchResult } from '../api/schema'
import Cover from '../components/Cover'
import ErrorNotice from '../components/ErrorNotice'
import Reveal from '../components/Reveal'
import { useAnnounce } from '../components/Announcer'
import { RAYONNAGES } from '../rayons'
import { queryKeys } from '../api/keys'
import { useDocumentTitle } from '../components/useDocumentTitle'
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

  /*
    Deux clés exclusives, `?q=` **ou** `?isbn=`, et le mode se **lit** dans
    l'adresse au lieu d'être un état local.

    Le mode ISBN était un `useState`, donc absent de l'adresse : partager
    `?q=9782070360024` rouvrait la recherche en éventail sur les six rayons,
    dont cinq répondent 400 sur un ISBN. Ce n'est pas un filtre avec une valeur
    par défaut — c'est *quelle clé est présente*, et l'adresse est le seul
    endroit où cette question a une réponse partageable.
  */
  const q = params.get('q')?.trim() ?? ''
  const isbn = params.get('isbn')?.trim() ?? ''
  const byIsbn = isbn !== ''
  const terme = byIsbn ? isbn : q

  useDocumentTitle(terme === '' ? 'Recherche' : `Recherche : ${terme}`)
  const [draft, setDraft] = useState(terme)
  // Ce que **cochera** la prochaine soumission : l'affichage suit l'adresse,
  // la case suit la main.
  const [modeIsbn, setModeIsbn] = useState(byIsbn)
  const [recentes, setRecentes] = useState<string[]>(lireRecentes)

  useEffect(() => {
    setDraft(terme)
    setModeIsbn(byIsbn)
    // Les ISBN ne se retiennent pas : c'est une recherche exacte, faite une
    // fois, sur un code qu'on a sous les yeux — pas un terme qu'on relance.
    if (terme === '' || byIsbn) return
    noterRecente(terme)
    setRecentes(lireRecentes())
  }, [terme, byIsbn])

  const soumettre = (event: FormEvent) => {
    event.preventDefault()
    const valeur = draft.trim()
    if (valeur === '') return
    setParams(modeIsbn ? { isbn: valeur } : { q: valeur })
  }

  const rayons = byIsbn ? (['book'] as const) : MEDIA_TYPES

  const requetes = useQueries({
    queries: rayons.map((type) => {
      const critere = byIsbn ? { isbn } : { q }
      return {
        queryKey: queryKeys.search(type, critere),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          searchExternal({ type, ...critere }, null, signal),
        enabled: terme !== '',
        // Une recherche externe coûte cher et bouge peu : inutile de la
        // relancer au moindre retour sur l'écran.
        staleTime: 5 * 60 * 1000,
      }
    }),
  })

  const groupes = rayons.map((type, i) => ({ type, requete: requetes[i] }))
  const enCours = groupes.some((g) => g.requete.isPending && terme !== '')
  const total = groupes.reduce((n, g) => n + (g.requete.data?.items.length ?? 0), 0)
  const aucunResultat = terme !== '' && !enCours && total === 0

  /*
    Ce que la recherche dit à voix haute.

    **Une** phrase, et seulement quand les six rayons sont revenus. L'écran a
    déjà pris cette décision pour son état vide — « sans quoi il clignoterait
    entre deux réponses » — et l'oreille mérite la même loi : six annonces dont
    l'ordre dépendrait de la latence de TMDB seraient un brouhaha.

    Elle compte les sources muettes en plus des résultats : une source
    injoignable n'est pas une absence d'œuvre. L'écran le dit à l'œil depuis
    toujours, il fallait aussi le dire à l'oreille.
  */
  const annoncer = useAnnounce()
  const muets = groupes.filter((g) => g.requete.error).length
  const derniere = useRef('')

  useEffect(() => {
    if (terme === '' || enCours) return

    const trouve =
      total === 0
        ? `Aucun résultat pour ${terme}.`
        : `${total} résultat${total > 1 ? 's' : ''} pour ${terme}.`
    const pannes =
      muets > 0
        ? ` ${muets} source${muets > 1 ? 's' : ''} injoignable${muets > 1 ? 's' : ''}.`
        : ''
    const phrase = trouve + pannes

    // Revenir sur l'écran sert le même cache et rejouerait la même phrase.
    if (derniere.current === phrase) return
    derniere.current = phrase
    annoncer(phrase)
  }, [terme, enCours, total, muets, annoncer])

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
            placeholder={modeIsbn ? '978…' : 'un titre, un auteur…'}
            inputMode={modeIsbn ? 'numeric' : 'search'}
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
              checked={modeIsbn}
              onChange={(event) => setModeIsbn(event.target.checked)}
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

      {terme === '' ? (
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
                Personne du cercle n’a encore versé «&nbsp;{terme}&nbsp;».
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

/**
 * Qui signe l'œuvre — le seul champ sûr pour distinguer deux résultats de même
 * titre. Les autres (éditeur, langue, ISBN) mêlent plusieurs éditions tant que
 * `detail_level` vaut `"search"`, et mentiraient plus qu'ils n'aideraient.
 */
export function creditsDe(result: SearchResult): string | null {
  switch (result.type) {
    case 'book':
    case 'comic_series': {
      const authors = result.metadata.authors
      return Array.isArray(authors) && authors.length > 0 ? authors.join(', ') : null
    }
    case 'movie':
      return result.metadata.director || null
    case 'tv': {
      const creators = result.metadata.creators
      return Array.isArray(creators) && creators.length > 0 ? creators.join(', ') : null
    }
    case 'game':
      return result.metadata.developer || null
    case 'music':
      return result.metadata.artist || null
  }
}

/**
 * Les éditions d'une œuvre groupée, dépliées sous sa ligne.
 *
 * Le composant n'est monté qu'une fois la ligne ouverte, et c'est tout
 * l'intérêt du dépliage : la requête ne part qu'au geste. Quarante lignes
 * montées d'un coup feraient quarante appels sortants pour une liste que
 * personne n'a demandée.
 *
 * On n'affiche **ni `total`, ni un compte d'éditions** : `total` est le compte
 * de la page après fusion, pas celui de l'œuvre, et `limit` se lit par œuvre
 * interrogée — une page peut donc en rendre davantage. Le seul chiffre honnête
 * ici serait faux.
 */
function Editions({
  workIds,
  choisie,
  onChoisir,
}: {
  workIds: string[]
  choisie: string | null
  onChoisir: (editionId: string) => void
}) {
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.editions(workIds),
    queryFn: ({ signal }) => fetchEditions(workIds, signal),
    // Les éditions d'une œuvre ne bougent pas d'une minute à l'autre : replier
    // puis redéplier une ligne ne redemande rien à la source.
    staleTime: 5 * 60 * 1000,
  })

  if (isPending) return <p className={styles.editionsAttente}>Lecture des éditions…</p>

  /*
    La source peut être en panne — la route répond alors 503. L'échec se dit
    **sur la ligne et ne la démonte pas** : on doit pouvoir verser l'œuvre même
    quand ses éditions sont injoignables, sans quoi une panne d'Open Library
    interdirait d'ajouter le moindre livre.

    Pas de `onRetry` : la requête se relance en repliant puis redépliant, et un
    second bouton au même endroit dirait deux fois la même chose.
  */
  if (error) return <ErrorNotice error={error} tone="notice" />

  if (data.items.length === 0) {
    return <p className={styles.editionsAttente}>Aucune édition connue pour cette œuvre.</p>
  }

  return (
    <ul className={styles.editions}>
      {data.items.map((edition) => (
        <li key={edition.edition_id}>
          <label className={styles.edition}>
            <input
              type="radio"
              // Un groupe de boutons radio par ligne : deux lignes dépliées en
              // même temps ne doivent pas se décocher l'une l'autre.
              name={`edition-${workIds.join('-')}`}
              value={edition.edition_id}
              checked={choisie === edition.edition_id}
              onChange={() => onChoisir(edition.edition_id)}
            />
            <span className={styles.editionNom}>
              {/* Une édition peut n'avoir ni éditeur, ni format, ni année, ni
                  pagination : on n'écrit que ce qui existe, et on ne laisse
                  jamais un séparateur pendre dans le vide. */}
              {[edition.publisher, edition.physical_format].filter(Boolean).join(' · ') ||
                'Édition sans éditeur connu'}
            </span>
            <span className={styles.editionMeta}>
              {[edition.year, edition.page_count ? `${edition.page_count} p.` : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </label>
        </li>
      ))}
    </ul>
  )
}

function ResultRow({ result, type }: { result: SearchResult; type: MediaType }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [ouvert, setOuvert] = useState(false)
  const [edition, setEdition] = useState<string | null>(null)

  const add = useMutation({
    mutationFn: () =>
      addMedia({
        source: result.source,
        // Le représentant du groupe, toujours : la fiche est celle de l'œuvre,
        // et deux éditions du même livre ne font pas deux fiches.
        external_id: result.external_id,
        type: result.type,
        ...(edition ? { edition_id: edition } : {}),
      }),
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
          {[creditsDe(result), result.year].filter(Boolean).join(' · ')}
        </p>

        {/* `group` n'est renseigné que sur une ligne qui en réunit plusieurs —
            et jamais hors des livres, seul type que le back regroupe. */}
        {result.group ? (
          <>
            <button
              type="button"
              className={styles.deplier}
              aria-expanded={ouvert}
              onClick={() => setOuvert((etat) => !etat)}
            >
              {result.group.size} fiches · voir les éditions
            </button>
            {ouvert ? (
              <Editions
                workIds={result.group.external_ids}
                choisie={edition}
                onChoisir={setEdition}
              />
            ) : null}
          </>
        ) : null}

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
