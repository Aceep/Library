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
  /**
   * La couleur de la barre, choisie par l'appelant — c'est lui qui sait de quoi
   * la progression parle. Dans un rayon c'est l'identité du membre : la barre
   * dit *à qui* elle appartient, au milieu de plusieurs. Sur sa propre une il
   * n'y a personne à désigner, et l'accueil y passe l'ocre d'action.
   */
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
