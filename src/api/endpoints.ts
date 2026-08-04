import { api, ApiError } from './client'
import type {
  CompareResponse,
  EpisodeDetail,
  HomeResponse,
  LibraryItem,
  MediaDetail,
  MediaSource,
  MediaType,
  Page,
  RefreshResponse,
  SearchResult,
  SeriesAggregate,
  Session,
  TrackingStatus,
  UserTracking,
  VolumeDetail,
} from './schema'

/**
 * Une fonction par endpoint. Aucun composant n'appelle `api` directement :
 * c'est ici, et seulement ici, que les chemins de l'API sont écrits.
 */

export const login = (pseudo: string, password: string) =>
  api.post<Session>('/auth/login', { pseudo, password })

/** Idempotent, répond 204. */
export const logout = () => api.post<void>('/auth/logout')

/**
 * Session courante. Un `401` n'est pas une erreur ici : c'est la réponse
 * normale quand personne n'est connecté.
 */
export const fetchSession = async (): Promise<Session | null> => {
  try {
    return await api.get<Session>('/auth/me')
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthenticated) return null
    throw error
  }
}

/**
 * Écran d'accueil. Volontairement borné côté back — trois en-cours par type,
 * activité du partenaire sur 30 jours et 10 entrées — et donc jamais paginé.
 */
export const fetchHome = () => api.get<HomeResponse>('/home')

export type LibrarySort = 'added' | 'title'

export interface LibraryFilters {
  type?: MediaType
  status?: TrackingStatus | null
  owned?: boolean | null
  sort?: LibrarySort
}

/**
 * Bibliothèque paginée. Le curseur est **opaque** : on le renvoie tel quel et
 * on s'arrête sur `next_cursor === null`, jamais en comparant `items.length`
 * à `limit` — le back peut très bien renvoyer une page courte non finale.
 */
export const fetchLibrary = (
  filters: LibraryFilters,
  cursor: string | null,
  signal?: AbortSignal,
) =>
  api.get<Page<LibraryItem>>(
    '/media',
    {
      type: filters.type,
      status: filters.status ?? undefined,
      owned: filters.owned ?? undefined,
      sort: filters.sort ?? 'added',
      cursor: cursor ?? undefined,
    },
    signal,
  )

export const fetchMediaDetail = (id: string, signal?: AbortSignal) =>
  api.get<MediaDetail>(`/media/${id}`, undefined, signal)

/**
 * Modification partielle de **mon** suivi.
 *
 * `user_id` est délibérément absent de ce type : le back refuse en `403` toute
 * écriture qui en contient un, et la session suffit à savoir qui écrit. Ne pas
 * pouvoir l'exprimer vaut mieux que se souvenir de ne pas l'envoyer.
 *
 * `status` n'est acceptable que sur `movie`, `book` et `game` — sur `tv` et
 * `comic_series` il est dérivé des éléments cochés et le back répond `400`.
 * Voir `isDerivedStatusType`.
 */
export interface TrackingPatch {
  owned?: boolean
  status?: TrackingStatus
  rating?: number | null
  review?: string | null
  started_at?: string | null
  finished_at?: string | null
}

export interface TrackingUpdate {
  tracking: UserTracking
  /** Agrégat recalculé sur les types à statut dérivé, `null` ailleurs. */
  series: SeriesAggregate | null
}

export const updateTracking = (id: string, patch: TrackingPatch) =>
  api.patch<TrackingUpdate>(`/media/${id}/tracking`, patch)

/** Retirer l'œuvre de ma bibliothèque. Le geste courant. Répond 204. */
export const deleteTracking = (id: string) => api.delete<void>(`/media/${id}/tracking`)

/**
 * Supprimer l'œuvre pour tout le monde. Peut être refusé en `409` — le message
 * du back explique alors pourquoi, et il est affiché tel quel.
 */
export const deleteMedia = (id: string) => api.delete<void>(`/media/${id}`)

/** Recherche de nouveautés auprès de la source. Manuel, jamais automatique. */
export const refreshMedia = (id: string) => api.post<RefreshResponse>(`/media/${id}/refresh`)

/* ------------------------------------------------------------------ */
/* Recherche et ajout                                                  */
/* ------------------------------------------------------------------ */

export interface SearchPage extends Page<SearchResult> {
  /** Total annoncé par la source, toutes pages confondues. */
  total: number
}

/**
 * Recherche chez la source externe du type demandé.
 *
 * C'est le seul endroit de l'application qui puisse répondre `503` : la source
 * peut être absente de la configuration (`SERVICE_UNCONFIGURED`) ou en panne
 * (`UPSTREAM_UNAVAILABLE`). Ça ne concerne jamais que l'onglet courant — le
 * reste de la médiathèque continue de fonctionner.
 *
 * Les sources sont lentes : compter plusieurs secondes, parfois davantage.
 */
export const searchExternal = (
  params: { type: MediaType; q?: string; isbn?: string },
  cursor: string | null,
  signal?: AbortSignal,
) =>
  api.get<SearchPage>(
    '/search',
    {
      type: params.type,
      q: params.q || undefined,
      isbn: params.isbn || undefined,
      cursor: cursor ?? undefined,
    },
    signal,
  )

/**
 * Ajout d'une œuvre à partir d'un résultat de recherche.
 *
 * Idempotent sur `(source, external_id)` : `created: false` signifie que la
 * fiche existait déjà et que le suivi vient d'y être rattaché. Ce n'est pas une
 * erreur, et surtout pas un doublon — dans les deux cas on ouvre la fiche.
 */
export const addMedia = (body: {
  source: MediaSource
  external_id: string
  type: MediaType
  owned?: boolean
}) => api.post<{ created: boolean; media: { id: string } }>('/media', body)

export const fetchCompare = (signal?: AbortSignal) =>
  api.get<CompareResponse>('/compare', undefined, signal)

/* ------------------------------------------------------------------ */
/* Épisodes                                                            */
/* ------------------------------------------------------------------ */

/**
 * Épisodes d'une saison. Jamais préchargés : `GET /media/:id` ne renvoie qu'un
 * résumé des saisons, et le détail ne se demande qu'au dépliage.
 */
export const fetchEpisodes = (seasonId: string, cursor: string | null, signal?: AbortSignal) =>
  api.get<Page<EpisodeDetail>>(
    `/seasons/${seasonId}/episodes`,
    { cursor: cursor ?? undefined },
    signal,
  )

/** Ce que renvoie toute écriture sur des épisodes : les agrégats recalculés. */
export interface EpisodeWriteResult {
  /** Épisodes réellement modifiés — cocher un épisode déjà coché n'en touche aucun. */
  episode_ids: string[]
  watched: boolean
  /** Progression de la saison touchée, `null` quand le lot en traverse plusieurs. */
  season: { id: string; number: number; progress: { checked: number; total: number } } | null
  series: SeriesAggregate
}

export const setEpisodeWatched = (episodeId: string, watched: boolean) =>
  api.put<EpisodeWriteResult>(`/episodes/${episodeId}/watched`, { watched })

/**
 * Cochage par lot, en une transaction.
 *
 * `season` coche toute une saison, `until` coche tout jusqu'à un épisode
 * inclus — c'est le geste de quelqu'un qui reprend une série en cours de route.
 * Toujours préférable à N requêtes unitaires.
 */
export type EpisodeBatch =
  | { scope: 'season'; season_id: string; watched: boolean }
  | { scope: 'until'; episode_id: string; watched: boolean }

export const batchEpisodes = (body: EpisodeBatch) =>
  api.put<EpisodeWriteResult>('/episodes/batch', body)

/* ------------------------------------------------------------------ */
/* Tomes                                                               */
/* ------------------------------------------------------------------ */

export const fetchVolumes = (mediaId: string, cursor: string | null, signal?: AbortSignal) =>
  api.get<Page<VolumeDetail>>(`/media/${mediaId}/volumes`, { cursor: cursor ?? undefined }, signal)

export interface VolumeWriteResult {
  volume: VolumeTracking & { id: string; number: number; title: string | null }
  series: SeriesAggregate
}

export interface VolumeTracking {
  owned: boolean
  status: TrackingStatus
  rating: number | null
  review: string | null
}

/** Comme pour les œuvres, `user_id` est inexprimable ici : il vaudrait un 403. */
export const updateVolumeTracking = (volumeId: string, patch: Partial<VolumeTracking>) =>
  api.patch<VolumeWriteResult>(`/volumes/${volumeId}/tracking`, patch)

export interface NewVolume {
  number: number
  title?: string | null
  isbn13?: string | null
}

/** Ajout manuel. Le back répond `409` si le numéro existe déjà. */
export const addVolume = (mediaId: string, volume: NewVolume) =>
  api.post<{ volume: VolumeDetail; series: SeriesAggregate }>(`/media/${mediaId}/volumes`, volume)

/** Seuls les tomes ajoutés à la main (`manual`) sont supprimables. */
export const deleteVolume = (volumeId: string) =>
  api.delete<{ series: SeriesAggregate }>(`/volumes/${volumeId}`)
