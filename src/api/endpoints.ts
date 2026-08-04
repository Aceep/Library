import { api, ApiError } from './client'
import type {
  Account,
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
 * fil des comptes suivis sur 30 jours et 10 entrées — et donc jamais paginé.
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

/* ------------------------------------------------------------------ */
/* Comptes et abonnements                                              */
/* ------------------------------------------------------------------ */

/** Un compte accompagné de ses compteurs, tel que listé par l'annuaire. */
export interface UserSummary {
  user: Account
  following_count: number
  followers_count: number
  tracked_count: number
  followed_by_me: boolean
  joined_at: string
}

/* ------------------------------------------------------------------ */
/* Déplier les compteurs                                               */
/* ------------------------------------------------------------------ */

/**
 * Ailleurs, l'API ne donne qu'un nombre : `others.count` sur une œuvre,
 * `watched.others` sur un épisode, `tracking.others` sur un tome. Ces trois
 * routes sont le seul moyen d'aller voir qui se cache derrière, et elles ne
 * sont appelées qu'à la demande — jamais ligne par ligne dans une liste.
 *
 * Elles renvoient **tout le monde**, pas seulement mes abonnements : suivre
 * quelqu'un trie ce qui remonte, ça ne protège rien.
 */
export const fetchMediaTrackers = (id: string, cursor: string | null, signal?: AbortSignal) =>
  api.get<Page<{ user: Account; tracking: UserTracking }>>(
    `/media/${id}/trackers`,
    { cursor: cursor ?? undefined },
    signal,
  )

/** Les épisodes renvoient des comptes à plat, sans suivi : cocher n'a pas de nuance. */
export const fetchEpisodeWatchers = (id: string, cursor: string | null, signal?: AbortSignal) =>
  api.get<Page<Account>>(`/episodes/${id}/watchers`, { cursor: cursor ?? undefined }, signal)

export const fetchVolumeTrackers = (id: string, cursor: string | null, signal?: AbortSignal) =>
  api.get<Page<{ user: Account; tracking: VolumeTracking }>>(
    `/volumes/${id}/trackers`,
    { cursor: cursor ?? undefined },
    signal,
  )

/* ------------------------------------------------------------------ */
/* Mon compte                                                          */
/* ------------------------------------------------------------------ */

/**
 * Modifier son profil.
 *
 * `identity_color` est **libre** : aucune unicité n'est imposée et deux
 * membres peuvent partager une teinte. C'est pourtant elle qui les distingue
 * partout — l'interface prévient donc quand le choix se rapproche de celui
 * d'un compte suivi, sans jamais l'interdire.
 */
export const updateMe = (patch: { identity_color?: string; avatar_url?: string | null }) =>
  api.patch<{ user: Account }>('/me', patch)

/** Changer son mot de passe. Répond 204. L'ancien est exigé. */
export const changePassword = (body: { current_password: string; new_password: string }) =>
  api.post<void>('/me/password', body)

/* ------------------------------------------------------------------ */
/* Invitations et inscription — les seules routes sans session          */
/* ------------------------------------------------------------------ */

export interface InvitationCheck {
  valid: boolean
  /** `invite` pour une inscription, `password_reset` pour un mot de passe. Nul si invalide. */
  kind: 'invite' | 'password_reset' | null
  /** Le compte visé, pour une réinitialisation seulement. */
  pseudo: string | null
}

/**
 * Vérifie un jeton avant d'afficher le moindre formulaire.
 *
 * Répond **toujours** `200`, et ne dit jamais *pourquoi* un jeton est
 * invalide : expiré, révoqué, déjà consommé ou inventé donnent la même
 * réponse. Ne pas chercher à en tirer un message plus précis — il n'y en a pas,
 * et c'est délibéré.
 */
export const checkInvitation = (token: string, signal?: AbortSignal) =>
  api.get<InvitationCheck>(`/invitations/${encodeURIComponent(token)}`, undefined, signal)

/**
 * Création du compte. Sur invitation uniquement : le serveur n'envoie aucun
 * e-mail et n'en enverra pas. Le nouveau membre suit d'office celui qui l'a
 * invité, sans quoi sa première page d'accueil serait vide.
 */
export const register = (body: { token: string; pseudo: string; password: string }) =>
  api.post<{ user: Account }>('/auth/register', body)

/** Même mécanique de jeton, pour un mot de passe oublié. */
export const resetPassword = (body: { token: string; password: string }) =>
  api.post<{ user: Account }>('/auth/reset-password', body)

/* ------------------------------------------------------------------ */
/* Administration des invitations                                      */
/* ------------------------------------------------------------------ */

export type InvitationStatus = 'pending' | 'used' | 'revoked' | 'expired'

export interface Invitation {
  id: string
  kind: 'invite' | 'password_reset'
  created_by: Account
  target_user: Account | null
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  created_at: string
  status: InvitationStatus
}

/**
 * Fabrique un lien d'invitation. C'est à l'administrateur de le transmettre —
 * par le canal qu'il veut, l'API ne s'en charge pas.
 *
 * `note` est un aide-mémoire privé, jamais montré à l'invité.
 */
export const createInvitation = (body: { expires_in_hours?: number; note?: string }) =>
  api.post<{
    invitation: Invitation
    /** Affiché une seule fois : la base n'en garde qu'une empreinte. */
    token: string
    /** Nul tant que `PUBLIC_APP_URL` n'est pas configurée côté serveur. */
    url: string | null
  }>('/admin/invitations', body)

export const fetchInvitations = (
  status: InvitationStatus | null,
  cursor: string | null,
  signal?: AbortSignal,
) =>
  api.get<Page<Invitation>>(
    '/admin/invitations',
    { status: status ?? undefined, cursor: cursor ?? undefined },
    signal,
  )

/**
 * Révoquer une invitation. `409` si elle a déjà servi — une invitation
 * consommée n'est plus révocable. L'invitation mise à jour est renvoyée
 * telle quelle, sans enveloppe.
 */
export const revokeInvitation = (id: string) =>
  api.delete<Invitation>(`/admin/invitations/${id}`)

/**
 * L'annuaire des membres.
 *
 * `include_deactivated` reste faux par défaut : un compte parti ne s'affiche
 * plus dans les listes, mais ce qu'il a écrit demeure sur les fiches. Ne pas
 * le lister n'est pas l'effacer.
 */
export const fetchUsers = (
  params: { sort?: 'pseudo' | 'joined'; includeDeactivated?: boolean },
  cursor: string | null,
  signal?: AbortSignal,
) =>
  api.get<Page<UserSummary>>(
    '/users',
    {
      sort: params.sort ?? 'pseudo',
      include_deactivated: params.includeDeactivated ? 'true' : undefined,
      cursor: cursor ?? undefined,
    },
    signal,
  )

export const fetchUser = (id: string, signal?: AbortSignal) =>
  api.get<UserSummary>(`/users/${id}`, undefined, signal)

/**
 * S'abonner, ou se désabonner. Les deux gestes renvoient l'état **après**
 * coup : on le prend tel quel plutôt que d'inverser un booléen localement.
 *
 * L'abonnement trie ce qu'on voit, il ne protège rien — suivre quelqu'un ne
 * demande pas son accord, et ne lui donne accès à rien de plus.
 */
export const setFollow = (id: string, follow: boolean) =>
  follow
    ? api.put<FollowResult>(`/users/${id}/follow`)
    : api.delete<FollowResult>(`/users/${id}/follow`)

export interface FollowResult {
  /** État après le geste. */
  following: boolean
  user: Account
}

/**
 * Les comptes auxquels `userId` est abonné. `me` est accepté à la place d'un
 * identifiant, ce qui évite d'avoir à porter le sien jusqu'ici.
 */
export const fetchFollowing = (userId: string, cursor: string | null, signal?: AbortSignal) =>
  api.get<Page<UserSummary>>(
    `/users/${userId}/following`,
    { cursor: cursor ?? undefined },
    signal,
  )

/** Les comptes abonnés à `userId`. */
export const fetchFollowers = (userId: string, cursor: string | null, signal?: AbortSignal) =>
  api.get<Page<UserSummary>>(
    `/users/${userId}/followers`,
    { cursor: cursor ?? undefined },
    signal,
  )

/**
 * Comparaison avec **un** compte donné.
 *
 * `user_id` est désormais obligatoire : il n'y a plus de partenaire implicite,
 * donc plus de comparaison par défaut. C'est à l'écran de dire avec qui.
 */
export const fetchCompare = (userId: string, signal?: AbortSignal) =>
  api.get<CompareResponse>('/compare', { user_id: userId }, signal)

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
