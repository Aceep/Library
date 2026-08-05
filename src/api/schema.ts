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

/**
 * Le profil détaillé d'un membre — ce que rend `GET /users/:id`, et lui seul.
 *
 * Il porte deux choses que l'annuaire n'a pas : `counts`, la répartition de sa
 * bibliothèque, et `showcase`, les œuvres qu'il met en avant. L'annuaire s'en
 * passe délibérément — quarante répartitions par page pour un chiffre que
 * personne n'affiche.
 */
export type UserDetail =
  paths['/users/{id}']['get']['responses'][200]['content']['application/json']

/** La vitrine : jusqu'à huit œuvres, tous types confondus, dans son ordre à lui. */
export type Showcase = UserDetail['showcase']

/**
 * Un badge **obtenu** : le badge, plus le jour où il a été mérité.
 *
 * `awarded_at` porte la date de l'achèvement et non celle de l'écriture — une
 * quête publiée aujourd'hui et achevée d'emblée décerne un badge daté d'hier.
 * Ils sont publics, et ne se retirent jamais.
 */
export type AwardedBadge = UserDetail['badges'][number]

/**
 * Où regarder un film ou une série. **Films et séries seulement** — la route
 * répond `400` sur un livre, un manga ou un jeu, et le champ n'existe pas sur
 * leur fiche.
 *
 * Les cinq tableaux sont toujours présents, vides s'il n'y a rien. Le bloc
 * entier, lui, est nullable : cache froid, aucune plateforme dans ce pays, ou
 * source injoignable — trois cas, une seule réponse `200`, jamais une erreur.
 *
 * `attribution` voyage **dans** la donnée et non dans une constante du front :
 * l'afficher est une condition d'utilisation de l'API TMDB, et le bloc ne peut
 * donc pas être dessiné sans avoir la mention sous la main.
 */
export type Availability = NonNullable<
  paths['/media/{id}/availability']['get']['responses'][200]['content']['application/json']['availability']
>

/** Une plateforme : identifiant TMDB, nom, logo. */
export type WatchProvider = Availability['subscription'][number]

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

/** Les six types d'œuvres, dans l'ordre d'affichage retenu pour la navigation. */
export const MEDIA_TYPES = ['movie', 'tv', 'book', 'comic_series', 'game', 'music'] as const

const TYPE_LABELS: Record<MediaType, { singular: string; plural: string }> = {
  movie: { singular: 'Film', plural: 'Films' },
  tv: { singular: 'Série', plural: 'Séries' },
  book: { singular: 'Livre', plural: 'Livres' },
  comic_series: { singular: 'Manga / BD', plural: 'Mangas & BD' },
  game: { singular: 'Jeu', plural: 'Jeux vidéo' },
  // L'unité est l'album, pas la piste ni l'artiste — le pluriel nomme le rayon,
  // comme « Jeux vidéo » nomme celui dont l'unité est « Jeu ».
  music: { singular: 'Album', plural: 'Musique' },
}

export const typeLabel = (type: MediaType) => TYPE_LABELS[type].singular
export const typeLabelPlural = (type: MediaType) => TYPE_LABELS[type].plural

/**
 * Les statuts **sans type d'œuvre sous la main**.
 *
 * À n'employer que là où le type n'existe pas : un filtre qui porte sur une
 * bibliothèque entière mêle des livres et des films, et aucun libellé accordé
 * n'y a de sens. Partout ailleurs — une fiche, une carte, un rayon —, c'est
 * `useReference().statusLabel(type, status)` qui donne le mot juste, celui que
 * l'API rédige.
 *
 * Ce n'est donc pas une copie de la règle du serveur : c'est le vocabulaire
 * d'un cas que le serveur ne modélise pas, faute de type auquel l'accorder.
 */
const CROSS_TYPE_STATUS_LABELS: Record<TrackingStatus, string> = {
  todo: 'À faire',
  doing: 'En cours',
  done: 'Terminé',
}

export const crossTypeStatusLabel = (status: TrackingStatus) => CROSS_TYPE_STATUS_LABELS[status]

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
  music: ['écoute', 'écoutes'],
}

export const timesNoun = (type: MediaType, times: number) =>
  TIMES_NOUNS[type][times > 1 ? 1 : 0]

/**
 * Ce que l'API dit des statuts, par type d'œuvre — la réponse de
 * `GET /reference/statuses`.
 *
 * Les deux règles qu'elle porte étaient auparavant **recopiées ici** : qu'un
 * album n'a que deux états, et qu'une série voit son statut recalculé plutôt
 * qu'écrit. Ni l'une ni l'autre n'était un champ de réponse, donc rien ne les
 * imposait — et le front s'est trompé, en proposant « en cours » sur un album.
 *
 * Elles se lisent désormais, via `useReference()`. Un troisième régime, ou un
 * second type à deux états, arrivera tout seul.
 */
export type ReferenceStatuses =
  paths['/reference/statuses']['get']['responses'][200]['content']['application/json']

export type StatusOption = ReferenceStatuses['types'][number]['statuses'][number]

/** Pourcentage de progression, avec la garde sur `total === 0`. */
export const progressRatio = (progress: Progress | null | undefined): number | null => {
  if (!progress || progress.total <= 0) return null
  return progress.checked / progress.total
}

/**
 * Une nouveauté qui me concerne (§10) : un épisode paru, un tome sorti, une
 * œuvre ajoutée à une saga que je suis, une quête publiée ou achevée.
 *
 * `label` est **rédigé par le serveur** et s'affiche tel quel, comme les
 * messages d'erreur. Le sujet, lui, arrive dans le champ correspondant au
 * `kind` — les autres sont nuls.
 */
export type NotificationList =
  paths['/notifications']['get']['responses'][200]['content']['application/json']

export type NotificationItem = NotificationList['items'][number]

export type NotificationKind = NotificationItem['kind']

/** Ce que répondent les deux routes de lecture : combien, et combien il en reste. */
export type NotificationRead =
  paths['/notifications/read-all']['post']['responses'][200]['content']['application/json']

/**
 * Une saga : des œuvres distinctes qui se suivent, chacune avec sa fiche.
 *
 * C'est la forme qui manquait pour les suites de films — une série a des
 * saisons, un manga des tomes, une trilogie a **trois fiches**.
 *
 * Le point à ne pas manquer : `parts` contient des œuvres **absentes de la
 * médiathèque** (`in_library: false`, `media: null`). Ce n'est pas un trou dans
 * la donnée, c'est le sujet : c'est cette ligne-là que la veille surveille, et
 * elle compte au dénominateur de `progress`. « 1 sur 3 » reste vrai quand deux
 * parties n'ont pas encore de fiche.
 */
export type SagaResponse =
  paths['/sagas/{id}']['get']['responses'][200]['content']['application/json']

export type Saga = SagaResponse['saga']

export type SagaPart = Saga['parts'][number]

/** Le résumé d'une saga, tel qu'il accompagne une fiche d'œuvre. */
export type SagaSummary = NonNullable<MediaDetail['sagas']>[number]

/**
 * Ce que je surveille — œuvres et sagas mêlées (§10).
 *
 * `since` est le **repère** : rien de paru avant lui n'a été annoncé.
 * `next_check_at` dit quand la prochaine vérification est prévue, ce qui
 * explique pourquoi une nouveauté d'aujourd'hui n'est pas encore là.
 */
export type WatchList =
  paths['/watches']['get']['responses'][200]['content']['application/json']

export type WatchItem = WatchList['items'][number]

// ---------------------------------------------------------------------------
// Les quêtes (§12)
// ---------------------------------------------------------------------------

/**
 * Une quête : une liste d'œuvres **choisies à la main** par un administrateur,
 * avec un titre et une raison. Le thème n'est pas un critère calculé — c'est
 * pourquoi ces œuvres-là ont été réunies.
 *
 * La progression se lit dans le suivi existant, donc **rétroactivement** : une
 * quête publiée aujourd'hui peut être achevée d'emblée par qui a déjà tout
 * terminé. Une œuvre compte quand elle est terminée.
 */
export type QuestListResponse =
  paths['/quests']['get']['responses'][200]['content']['application/json']

export type QuestSummary = QuestListResponse['items'][number]

export type QuestResponse =
  paths['/quests/{id}']['get']['responses'][200]['content']['application/json']

export type Quest = QuestResponse['quest']

export type QuestItem = Quest['items'][number]

/** Où en sont les autres. Tout est public — les achevées d'abord. */
export type QuestStanding = Quest['standings'][number]

/** Le badge que la quête décerne. Jamais repris une fois obtenu. */
export type Badge = Quest['badge']

// --- Statistiques (§14) ----------------------------------------------------

/**
 * Le tableau de bord d'un membre. Tout est public, comme le reste.
 *
 * La forme de ces types porte une règle, et c'est la seule chose à retenir
 * d'eux : **aucune grandeur ne se rend sans sa couverture**. `StatQuantity`
 * n'est jamais décomposé pour n'en garder que `value` — les composants prennent
 * l'objet entier, et `StatFigure` exige `coverage` sans valeur par défaut. Un
 * total amputé en silence n'est pas approximatif, il est faux.
 */
export type StatsResponse = paths['/stats']['get']['responses'][200]['content']['application/json']

export type StatDashboard = StatsResponse['dashboard']

export type StatPeriod = keyof StatDashboard['periods']

export type StatTotals = StatDashboard['periods'][StatPeriod]

export type StatCounts = StatTotals['counts']

export type StatQuantities = StatTotals['quantities']

/** Un chiffre calculé, et de quoi savoir ce qu'il vaut. Indissociables. */
export type StatQuantity = StatQuantities[keyof StatQuantities]

/** Sur combien d'œuvres il porte, et combien ont été écartées faute de donnée. */
export type StatCoverage = StatQuantity['coverage']

/**
 * `measured` — attribut réel de l'œuvre consommée. `estimated` — chiffre venu
 * d'ailleurs, qui ne décrit pas ce que le membre a fait. Les deux ne se
 * composent pas de la même façon, et ne s'additionnent jamais.
 */
export type StatBasis = StatQuantity['basis']

export type StatHighlights = StatDashboard['highlights']

/** Une valeur et son décompte — une ligne de palmarès. */
export type StatTally = StatHighlights['top_genres'][number]

export type QuestStatus = Quest['status']
