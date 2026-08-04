/**
 * Clés de cache, rassemblées ici plutôt que semées en chaînes littérales.
 *
 * Elles servent aussi d'invalidation par préfixe : invalider `['library']`
 * rafraîchit tous les rayons quels que soient leurs filtres, et `['media', id]`
 * ne touche qu'une fiche.
 */
export const queryKeys = {
  session: ['session'] as const,
  home: ['home'] as const,
  compare: ['compare'] as const,
  compareWith: (userId: string) => ['compare', userId] as const,
  /** Préfixe commun : un abonnement pris ou rendu périme toutes ces listes. */
  people: ['people'] as const,
  users: (params: unknown) => ['people', 'users', params] as const,
  user: (id: string) => ['people', 'user', id] as const,
  following: (userId: string) => ['people', 'following', userId] as const,
  followers: (userId: string) => ['people', 'followers', userId] as const,
  library: ['library'] as const,
  libraryWith: (filters: unknown) => ['library', filters] as const,
  media: (id: string) => ['media', id] as const,
  episodes: (seasonId: string) => ['episodes', seasonId] as const,
  volumes: (mediaId: string) => ['volumes', mediaId] as const,
  search: (type: string, params: unknown) => ['search', type, params] as const,
}
