import type { StatTally } from '../api/schema'
import styles from './StatRanking.module.css'

/**
 * Un palmarès — et les trois cas où **il n'y en a pas**.
 *
 * Un classement affirme quelque chose : que celui-ci passe devant celui-là.
 * Trois situations le rendent faux, et toutes trois se présentent sur un compte
 * jeune, c'est-à-dire tout le temps au début :
 *
 * - **vide** — rien à classer, et une liste vide vaut mieux qu'un titre suivi
 *   de blanc ;
 * - **une seule entrée** — l'auteur le plus lu de quelqu'un qui n'a lu qu'un
 *   auteur n'est pas un palmarès, c'est un fait ;
 * - **tout à égalité** — cinq réalisateurs à un film chacun, ce qui arrive dès
 *   qu'on a vu cinq films différents. Cinq barres identiques laisseraient
 *   croire à un ordre que la donnée ne porte pas.
 *
 * Dans ces trois cas : ni barres, ni numéros de rang, et une phrase qui dit ce
 * qu'on regarde. Les barres et les rangs sont réservés au cas où quelque chose
 * se détache réellement.
 */
export default function StatRanking({
  tallies,
  noun,
}: {
  tallies: StatTally[]
  /** Ce que les décomptes comptent, au singulier puis au pluriel. */
  noun: [string, string]
}) {
  if (tallies.length === 0) {
    return <p className={styles.quiet}>Rien à classer pour l’instant.</p>
  }

  const compte = (n: number) => `${n} ${n > 1 ? noun[1] : noun[0]}`

  if (tallies.length === 1) {
    const seul = tallies[0]
    if (!seul) return null
    return (
      <div>
        <p className={styles.single}>
          {seul.label} <span className={styles.singleCount}>— {compte(seul.count)}</span>
        </p>
        <p className={styles.quiet}>Un seul nom : ce n’est pas encore un classement.</p>
      </div>
    )
  }

  const max = Math.max(...tallies.map((tally) => tally.count))
  const egalite = tallies.every((tally) => tally.count === max)

  if (egalite) {
    return (
      <div>
        <ul className={styles.flat}>
          {tallies.map((tally) => (
            <li key={tally.label} className={styles.flatRow}>
              {tally.label} <span className={styles.singleCount}>— {compte(tally.count)}</span>
            </li>
          ))}
        </ul>
        <p className={styles.quiet}>Tous à égalité — aucun ne se détache.</p>
      </div>
    )
  }

  return (
    <ol className={styles.ranked}>
      {tallies.map((tally, index) => (
        <li key={tally.label} className={styles.rankedRow}>
          <span className={styles.rank}>{index + 1}</span>
          <span className={styles.label}>{tally.label}</span>
          <span className={styles.track} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${(tally.count / max) * 100}%` }} />
          </span>
          <span className={styles.count}>
            {tally.count}
            <span className="sr-only"> {tally.count > 1 ? noun[1] : noun[0]}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
