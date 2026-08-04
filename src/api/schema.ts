import type { components, paths } from './types'

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

/**
 * Une entrée de journal : une fois qu'une œuvre a été lue ou vue.
 *
 * Elle n'a pas de schéma nommé dans le contrat — elle est déclarée en ligne
 * dans chaque route. On la dérive donc de la route de lecture plutôt que de la
 * réécrire : si le back ajoute un champ, il apparaît ici tout seul.
 *
 * `finished_at` est la seule date obligatoire : on se souvient d'avoir fini
 * bien plus souvent que d'avoir commencé, et c'est elle qui ordonne le journal.
 */
export type LogEntry =
  paths['/media/{id}/log']['get']['responses'][200]['content']['application/json']['items'][number]

export type MediaType = MediaSummary['type']
export type TrackingStatus = UserTracking['status']
export type MediaSource = MediaSummary['source']

/** Progression sur les éléments cochables. `total` peut valoir 0. */
export interface Progress {
  checked: number
  total: number
}

/**
 * Profil public d'un compte, dérivé du contrat plutôt que redéclaré : l'objet
 * est inline partout dans la spec, `CompareResponse.with` en est la copie la
 * plus lisible.
 */
export type Account = CompareResponse['with']

export type UserRole = Account['role']

/**
 * Ce que renvoient `/auth/login` et `/auth/me`.
 *
 * Depuis le passage aux comptes multiples, il n'y a plus de `partner` : les
 * autres membres n'arrivent plus par la session mais par chaque charge utile,
 * dans `tracking.following`. La session ne dit que qui je suis.
 */
export interface Session {
  user: Account
}

/** Le suivi d'un compte auquel je suis abonné, tel qu'il accompagne une œuvre. */
export type FollowedTracking = LibraryItem['tracking']['following'][number]

/**
 * Résumé des suiveurs que je ne suis pas : un compte et une moyenne, jamais
 * leurs identités. Les abonnements trient ce qu'on voit, ils ne protègent rien
 * — mais l'API ne déballe pas pour autant la liste entière.
 */
export type OthersSummary = LibraryItem['tracking']['others']

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
 * Comment se compte une fois, selon le type. `times` vaut le même entier
 * partout, mais « 3 lectures » et « 3 parties » ne se disent pas pareil.
 *
 * Le nom est toujours employé derrière un nombre, jamais derrière un article :
 * ça évite d'avoir à accorder « une lecture » et « un visionnage ».
 */
const TIMES_NOUNS: Record<MediaType, [string, string]> = {
  movie: ['visionnage', 'visionnages'],
  tv: ['visionnage', 'visionnages'],
  book: ['lecture', 'lectures'],
  comic_series: ['lecture', 'lectures'],
  game: ['partie', 'parties'],
}

export const timesNoun = (type: MediaType, times: number) =>
  TIMES_NOUNS[type][times > 1 ? 1 : 0]

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
