import type { Progress } from '../api/schema'
import { progressRatio } from '../api/schema'
import styles from './ProgressBar.module.css'

/**
 * `total` peut valoir 0 — une série dont la source n'a jamais publié la liste
 * des épisodes. `progressRatio` renvoie alors `null` et on n'affiche pas de
 * barre plutôt qu'un `NaN%`.
 */
export default function ProgressBar({
  progress,
  color,
  label,
}: {
  progress: Progress | null | undefined
  /** Couleur d'identité du compte concerné. */
  color?: string
  label?: string
}) {
  const ratio = progressRatio(progress)
  if (ratio === null || !progress) return null

  const percent = Math.round(ratio * 100)

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={progress.checked}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-label={label ?? 'Progression'}
      >
        <div
          className={styles.fill}
          style={{ width: `${percent}%`, background: color ?? 'var(--ink-soft)' }}
        />
      </div>
      <span className={styles.count}>
        {progress.checked}&nbsp;/&nbsp;{progress.total}
      </span>
    </div>
  )
}
