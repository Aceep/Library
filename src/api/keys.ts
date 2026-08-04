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
  /**
   * La bibliothèque d'un membre. Sous le préfixe `library` : elle contient mon
   * suivi à moi dans chaque `tracking.me`, et redevient donc fausse dès que
   * j'écris quelque part, exactement comme un rayon.
   */
  memberLibrary: (userId: string, filters: unknown) =>
    ['library', 'member', userId, filters] as const,
  media: (id: string) => ['media', id] as const,
  /**
   * Le journal d'un membre sur une œuvre — le mien quand `userId` est nul.
   *
   * La clé est **volontairement** préfixée par celle de la fiche : cocher le
   * dernier épisode d'une série la fait passer à « terminé », ce qui crée une
   * entrée côté serveur. Invalider `media(id)` emporte donc le journal, et le
   * panneau ne peut pas afficher un compte à jour au-dessus d'une liste d'avant.
   */
  log: (mediaId: string, userId: string | null) => ['media', mediaId, 'log', userId] as const,
  /**
   * Où regarder. Hors du préfixe `media` volontairement : ces données ne
   * dépendent d'aucune écriture de suivi, et n'ont donc aucune raison d'être
   * rejetées du cache quand on coche un épisode.
   */
  availability: (mediaId: string) => ['availability', mediaId] as const,
  episodes: (seasonId: string) => ['episodes', seasonId] as const,
  volumes: (mediaId: string) => ['volumes', mediaId] as const,
  search: (type: string, params: unknown) => ['search', type, params] as const,
  invitation: (token: string) => ['invitation', token] as const,
  mediaTrackers: (id: string) => ['people', 'trackers', 'media', id] as const,
  episodeWatchers: (id: string) => ['people', 'trackers', 'episode', id] as const,
  volumeTrackers: (id: string) => ['people', 'trackers', 'volume', id] as const,
  /** Préfixe : créer ou annuler une invitation périme tous les filtres. */
  invitationsAll: ['invitations'] as const,
  invitations: (status: string | null) => ['invitations', status] as const,
}
