import type { components } from './types'

type S = components['schemas']

/**
 * Alias de confort sur les schémas générés depuis `docs/openapi.json`.
 * On ne redéclare jamais une forme à la main : si le contrat du back bouge,
 * `npm run types` la met à jour et la compilation nous prévient.
 */
export type ApiErrorBody = S['ApiError']
export type MediaSummary = S['MediaSummary']
export type MediaDetail = S['MediaDetail']
export type LibraryItem = S['LibraryItem']
export type UserTracking = S['UserTracking']
export type SeriesAggregate = S['SeriesAggregate']
export type EpisodeDetail = S['EpisodeDetail']
export type VolumeDetail = S['VolumeDetail']
export type SearchResult = S['SearchResult']
export type HomeResponse = S['HomeResponse']
export type CompareResponse = S['CompareResponse']
export type RefreshResponse = S['RefreshResponse']

export type MediaType = MediaSummary['type']
export type TrackingStatus = UserTracking['status']
export type MediaSource = MediaSummary['source']

/** Progression sur les éléments cochables. `total` peut valoir 0. */
export interface Progress {
  checked: number
  total: number
}

/** Profil public d'un compte. */
export interface Account {
  id: string
  pseudo: string
  avatar_url: string | null
  identity_color: string
}

/**
 * Ce que renvoient `/auth/login` et `/auth/me`.
 * `partner` est nullable côté API : ne jamais supposer qu'il y a exactement
 * deux comptes — c'est ce qui rendra le passage à N comptes indolore.
 */
export interface Session {
  user: Account
  partner: Account | null
}

/** Une page de résultats. `next_cursor` vaut `null` sur la dernière. */
export interface Page<T> {
  items: T[]
  next_cursor: string | null
}

/** Les cinq types d'œuvres, dans l'ordre d'affichage retenu pour la navigation. */
export const MEDIA_TYPES = ['movie', 'tv', 'book', 'comic_series', 'game'] as const

const TYPE_LABELS: Record<MediaType, { singular: string; plural: string }> = {
  movie: { singular: 'Film', plural: 'Films' },
  tv: { singular: 'Série', plural: 'Séries' },
  book: { singular: 'Livre', plural: 'Livres' },
  comic_series: { singular: 'Manga / BD', plural: 'Mangas & BD' },
  game: { singular: 'Jeu', plural: 'Jeux vidéo' },
}

export const typeLabel = (type: MediaType) => TYPE_LABELS[type].singular
export const typeLabelPlural = (type: MediaType) => TYPE_LABELS[type].plural

const STATUS_LABELS: Record<TrackingStatus, string> = {
  todo: 'À voir',
  doing: 'En cours',
  done: 'Terminé',
}

export const statusLabel = (status: TrackingStatus) => STATUS_LABELS[status]

/**
 * Les types dont le statut est **dérivé** des éléments cochés.
 * Écrire `status` dessus est refusé par le back (400 VALIDATION) : l'interface
 * ne doit même pas proposer le geste.
 */
export const isDerivedStatusType = (type: MediaType) => type === 'tv' || type === 'comic_series'

/** Pourcentage de progression, avec la garde sur `total === 0`. */
export const progressRatio = (progress: Progress | null | undefined): number | null => {
  if (!progress || progress.total <= 0) return null
  return progress.checked / progress.total
}
