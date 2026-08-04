import type { EpisodeWriteResult, TrackingUpdate } from './endpoints'
import type { MediaDetail, SeriesAggregate } from './schema'

/**
 * Recopie dans la fiche en cache les agrégats renvoyés par une écriture.
 *
 * Rien n'est recalculé ici : le statut dérivé, la progression et
 * `has_new_content` viennent du serveur, qui est seul à savoir les établir.
 * Ces fonctions ne font que *ranger* sa réponse au bon endroit.
 *
 * Le cast est assumé : `MediaDetail` est une union `OneOf` par type, et
 * TypeScript ne sait pas reconstruire une branche à l'identique par étalement.
 * Les champs touchés, eux, sont communs à toutes les branches.
 */

export const applyTrackingUpdate = (
  detail: MediaDetail,
  update: TrackingUpdate,
): MediaDetail => {
  const next = {
    ...detail,
    tracking: { ...detail.tracking, me: update.tracking },
  } as MediaDetail

  if (update.series) next.progress = { ...detail.progress, me: update.series.progress }

  return next
}

export const applyEpisodeWrite = (
  detail: MediaDetail,
  result: EpisodeWriteResult,
): MediaDetail => {
  const next = applySeries(detail, result.series)

  // `season` est nul quand le lot a traversé plusieurs saisons : dans ce cas
  // seul l'agrégat de série est fiable, et les saisons se recorrigeront au
  // prochain chargement de la fiche.
  if (result.season && 'seasons' in next && Array.isArray(next.seasons)) {
    const touched = result.season
    next.seasons = next.seasons.map((season) =>
      season.id === touched.id
        ? { ...season, progress: { ...season.progress, me: touched.progress } }
        : season,
    )
  }

  return next
}

export const applySeries = (detail: MediaDetail, series: SeriesAggregate): MediaDetail => {
  const next = { ...detail } as MediaDetail

  next.progress = { ...detail.progress, me: series.progress }

  // Le statut d'un type dérivé n'existe que dans l'agrégat : on le reporte sur
  // le suivi affiché, sinon la fiche montrerait encore l'état d'avant le clic.
  if (detail.tracking.me) {
    next.tracking = {
      ...detail.tracking,
      me: {
        ...detail.tracking.me,
        status: series.status,
        completed_at: series.completed_at,
        has_new_content: series.has_new_content,
      },
    }
  }

  if ('volumes' in next && next.volumes) {
    next.volumes = { ...next.volumes, progress: { ...next.volumes.progress, me: series.progress } }
  }

  return next
}
