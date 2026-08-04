import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applyEpisodeWrite } from '../api/cache'
import { queryKeys } from '../api/keys'
import { batchEpisodes, fetchEpisodes, setEpisodeWatched } from '../api/endpoints'
import type { EpisodeBatch, EpisodeWriteResult } from '../api/endpoints'
import type { Account, EpisodeDetail, MediaDetail, Page } from '../api/schema'
import ErrorNotice from './ErrorNotice'
import ProgressBar from './ProgressBar'
import styles from './SeasonList.module.css'

type Season = NonNullable<Extract<MediaDetail, { type: 'tv' }>['seasons']>[number]

export default function SeasonList({
  mediaId,
  seasons,
  user,
}: {
  mediaId: string
  seasons: Season[]
  user: Account
}) {
  if (seasons.length === 0) return null

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Saisons</h2>
      <ul className={styles.seasons}>
        {seasons.map((season) => (
          <SeasonRow key={season.id} mediaId={mediaId} season={season} user={user} />
        ))}
      </ul>
    </section>
  )
}

function SeasonRow({
  mediaId,
  season,
  user,
}: {
  mediaId: string
  season: Season
  user: Account
}) {
  const mediaQueryKey = queryKeys.media(mediaId)
  // Replié par défaut : les épisodes ne sont demandés qu'au dépliage, jamais
  // préchargés avec la fiche.
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const episodes = useInfiniteQuery({
    queryKey: queryKeys.episodes(season.id),
    queryFn: ({ pageParam, signal }) => fetchEpisodes(season.id, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: open,
  })

  const items = episodes.data?.pages.flatMap((page) => page.items) ?? []

  /**
   * Toute écriture sur des épisodes suit le même chemin : on applique
   * localement tout de suite pour que la case réponde au clic, puis on range
   * les agrégats renvoyés par le serveur — sans jamais les recalculer. En cas
   * d'échec, on remet exactement ce qu'on avait avant.
   */
  const write = useMutation({
    mutationFn: (variables: WriteVariables) =>
      variables.kind === 'one'
        ? setEpisodeWatched(variables.episodeId, variables.watched)
        : batchEpisodes(variables.batch),

    onMutate: async (variables: WriteVariables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.episodes(season.id) })
      const previous = queryClient.getQueryData(queryKeys.episodes(season.id))

      queryClient.setQueryData(
        queryKeys.episodes(season.id),
        (data?: { pages: Page<EpisodeDetail>[]; pageParams: unknown[] }) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.map((episode) =>
                    affects(variables, episode, items)
                      ? { ...episode, watched: { ...episode.watched, me: watchedOf(variables) } }
                      : episode,
                  ),
                })),
              }
            : data,
      )

      return { previous }
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.episodes(season.id), context.previous)
      }
    },

    onSuccess: (result: EpisodeWriteResult) => {
      queryClient.setQueryData(mediaQueryKey, (detail?: MediaDetail) =>
        detail ? applyEpisodeWrite(detail, result) : detail,
      )
      // `next_up` n'est pas dans les réponses d'écriture : seul un rechargement
      // de la fiche le remet juste. Les listes dépendent aussi du statut dérivé.
      void queryClient.invalidateQueries({ queryKey: mediaQueryKey })
      void queryClient.invalidateQueries({ queryKey: queryKeys.home })
      void queryClient.invalidateQueries({ queryKey: queryKeys.library })
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.episodes(season.id) })
    },
  })

  const allWatched = season.progress.me.checked === season.progress.me.total
  const label = season.title ?? `Saison ${season.number}`

  return (
    <li className={styles.season}>
      <div className={styles.seasonHeader}>
        <button
          type="button"
          className={styles.disclosure}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.chevron} aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
          <span className={styles.seasonTitle}>{label}</span>
          <span className={styles.episodeCount}>
            {season.episode_count} épisode{season.episode_count > 1 ? 's' : ''}
          </span>
        </button>

        <div className={styles.seasonProgress}>
          <ProgressLine
            account={user}
            progress={season.progress.me}
            label={`Progression de ${user.pseudo} sur ${label}`}
          />
        </div>

        {/* Un seul aller-retour pour toute la saison, jamais N requêtes. */}
        <button
          type="button"
          className={styles.batchButton}
          onClick={() =>
            write.mutate({
              kind: 'batch',
              batch: { scope: 'season', season_id: season.id, watched: !allWatched },
            })
          }
          disabled={write.isPending}
        >
          {allWatched ? 'Tout décocher' : 'Tout cocher'}
        </button>
      </div>

      {open ? (
        <div className={styles.episodes}>
          {episodes.isPending ? (
            <p className={styles.quiet}>Chargement des épisodes…</p>
          ) : episodes.error ? (
            <ErrorNotice error={episodes.error} onRetry={() => void episodes.refetch()} />
          ) : (
            <>
              <ul className={styles.episodeList}>
                {items.map((episode) => (
                  <EpisodeRow
                    key={episode.id}
                    episode={episode}
                    seasonNumber={season.number}
                    disabled={write.isPending}
                    onToggle={(watched) =>
                      write.mutate({ kind: 'one', episodeId: episode.id, watched })
                    }
                    onUntilHere={() =>
                      write.mutate({
                        kind: 'batch',
                        batch: { scope: 'until', episode_id: episode.id, watched: true },
                      })
                    }
                  />
                ))}
              </ul>

              {episodes.hasNextPage ? (
                <button
                  type="button"
                  className={styles.moreButton}
                  onClick={() => void episodes.fetchNextPage()}
                  disabled={episodes.isFetchingNextPage}
                >
                  {episodes.isFetchingNextPage ? 'Chargement…' : 'Voir les épisodes suivants'}
                </button>
              ) : null}
            </>
          )}

          {write.error ? <ErrorNotice error={write.error} /> : null}
        </div>
      ) : null}
    </li>
  )
}

function EpisodeRow({
  episode,
  seasonNumber,
  disabled,
  onToggle,
  onUntilHere,
}: {
  episode: EpisodeDetail
  seasonNumber: number
  disabled: boolean
  onToggle: (watched: boolean) => void
  onUntilHere: () => void
}) {
  const code = `S${seasonNumber}E${String(episode.number).padStart(2, '0')}`

  return (
    <li className={styles.episode}>
      <label className={styles.episodeCheck}>
        <input
          type="checkbox"
          checked={episode.watched.me}
          onChange={(event) => onToggle(event.target.checked)}
          disabled={disabled}
          aria-label={`${code} vu`}
        />
      </label>

      <span className={styles.episodeCode}>{code}</span>
      <span className={styles.episodeTitle}>{episode.title ?? 'Sans titre'}</span>

      <span className={styles.episodeSide}>
        {episode.runtime_min ? (
          <span className={styles.episodeRuntime}>{episode.runtime_min} min</span>
        ) : null}

        {/* L'API ne nomme plus qui a vu quoi épisode par épisode : elle en
            donne le nombre. Les identités sont derrière
            `GET /episodes/:id/watchers`, qu'on ne demande pas ici. */}
        {episode.watched.others > 0 ? (
          <span
            className={styles.othersCount}
            title={`${episode.watched.others} autre${episode.watched.others > 1 ? 's' : ''} membre${episode.watched.others > 1 ? 's l’ont' : ' l’a'} vu`}
          >
            +{episode.watched.others}
          </span>
        ) : null}

        {!episode.watched.me ? (
          <button type="button" className={styles.untilHere} onClick={onUntilHere} disabled={disabled}>
            Cocher jusqu'ici
          </button>
        ) : null}
      </span>
    </li>
  )
}

function ProgressLine({
  account,
  progress,
  label,
}: {
  account: Account
  progress: { checked: number; total: number }
  label: string
}) {
  return (
    <span className={styles.progressLine}>
      <span
        className={styles.progressDot}
        style={{ background: account.identity_color }}
        aria-hidden="true"
      />
      <ProgressBar progress={progress} color={account.identity_color} label={label} />
    </span>
  )
}

type WriteVariables =
  | { kind: 'one'; episodeId: string; watched: boolean }
  | { kind: 'batch'; batch: EpisodeBatch }

const watchedOf = (variables: WriteVariables) =>
  variables.kind === 'one' ? variables.watched : variables.batch.watched

/**
 * Quels épisodes une écriture touche, du point de vue de l'affichage optimiste.
 *
 * Le serveur reste seul juge : `until` peut déborder sur les saisons
 * précédentes, qu'on ne voit pas d'ici. On ne devine que ce qui est sous les
 * yeux, et le rechargement qui suit corrige le reste.
 */
const affects = (
  variables: WriteVariables,
  episode: EpisodeDetail,
  loaded: EpisodeDetail[],
): boolean => {
  if (variables.kind === 'one') return episode.id === variables.episodeId

  const batch = variables.batch
  if (batch.scope === 'season') return true

  const target = loaded.find((item) => item.id === batch.episode_id)
  if (!target) return false
  return episode.number <= target.number
}
