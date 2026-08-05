import styles from './StatBars.module.css'

export interface StatBarRow {
  label: string
  count: number
}

/**
 * Une distribution, en lignes à filets — la répartition par type, celle des
 * notes.
 *
 * **Une seule série de données à la fois**, donc rien à distinguer et aucune
 * teinte à employer : la barre est en encre, et c'est la position qui classe.
 * C'est aussi pourquoi il n'y a pas de bibliothèque de graphiques derrière —
 * elle apporterait une palette catégorielle dont le principe même est « une
 * couleur par série », et il faudrait la combattre.
 *
 * Une ligne à zéro ne reçoit pas de barre de largeur nulle, invisible et donc
 * ambiguë : elle reçoit un point, qui se voit et qui dit zéro.
 */
export default function StatBars({
  rows,
  legend,
}: {
  rows: StatBarRow[]
  /** Ce que la colonne de droite décompte, pour le lecteur d'écran. */
  legend: string
}) {
  const max = Math.max(...rows.map((row) => row.count), 0)

  return (
    <ul className={styles.list}>
      {rows.map((row) => (
        <li key={row.label} className={styles.row}>
          <span className={styles.label}>{row.label}</span>
          <span className={styles.track} aria-hidden="true">
            {row.count > 0 && max > 0 ? (
              <span className={styles.fill} style={{ width: `${(row.count / max) * 100}%` }} />
            ) : (
              <span className={styles.zero}>·</span>
            )}
          </span>
          <span className={styles.count}>
            {row.count}
            <span className="sr-only"> {legend}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
