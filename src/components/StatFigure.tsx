import type { StatBasis, StatCoverage } from '../api/schema'
import styles from './StatFigure.module.css'

/**
 * Un chiffre calculé, et ce qu'il a fallu écarter pour l'obtenir.
 *
 * **`coverage` est un paramètre requis, sans valeur par défaut.** C'est tout le
 * sujet de ce composant : il n'existe aucune façon de lui faire afficher une
 * valeur sans dire sur quoi elle porte. « 12 400 pages » donne envie d'y
 * croire ; « 12 400 pages sur 34 livres, 6 sans pagination connue » est un
 * chiffre auquel on peut se fier. Le second demande une ligne de plus, c'est la
 * seule différence — et le contrat côté serveur a été écrit pour qu'on ne
 * puisse pas les séparer.
 *
 * `basis` sépare deux choses qu'on confondrait vite. Une durée `estimated` —
 * la complétion « normale » que déclare IGDB — ne décrit pas ce que le membre a
 * fait. Elle ne se compose donc pas comme une mesure : pas de chiffre display,
 * un sourcil qui la nomme, et sa `note` rendue en entier, jamais tronquée.
 */
export default function StatFigure({
  label,
  value,
  unit,
  coverage,
  counted,
  missing,
  basis = 'measured',
  note,
}: {
  /** De quoi on parle : « Films », « Livres ». */
  label: string
  /** Déjà formaté — « 1 232 », « 52 h 30 ». Le composant ne calcule rien. */
  value: string
  /** Ce que compte la valeur, quand la valeur ne le dit pas : « pages ». */
  unit?: string
  /** Requis, et c'est le point. */
  coverage: StatCoverage
  /** L'œuvre sur laquelle porte le calcul, au singulier puis au pluriel. */
  counted: [string, string]
  /** Ce qui manque à celles qu'on a écartées : « sans pagination connue ». */
  missing: string
  basis?: StatBasis
  note?: string | null
}) {
  const estime = basis === 'estimated'

  return (
    <div className={estime ? `${styles.figure} ${styles.estimated}` : styles.figure}>
      <p className={styles.label}>
        {label}
        {estime ? <span className={styles.basisTag}>estimation</span> : null}
      </p>

      <p className={styles.value}>
        <span className={styles.number}>{value}</span>
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </p>

      <p className={styles.coverage}>{couverture(coverage, counted, missing)}</p>

      {note ? <p className={styles.note}>{note}</p> : null}
    </div>
  )
}

/**
 * La phrase de couverture, et ses quatre cas.
 *
 * Le troisième est le seul qui compte vraiment : quand **rien** n'a servi au
 * calcul mais que des œuvres ont été écartées, la valeur vaut zéro sans que le
 * membre n'ait rien fait. « 0 page » se lirait alors comme « tu n'as rien lu »,
 * alors que la vérité est « on ne sait pas ». Les deux ne se disent pas de la
 * même façon.
 */
function couverture(
  { counted: n, missing: m }: StatCoverage,
  [singulier, pluriel]: [string, string],
  missing: string,
): string {
  const nom = (count: number) => (count > 1 ? pluriel : singulier)

  if (n === 0 && m === 0) return `Aucun ${singulier} pour l’instant.`
  if (n === 0) return `On ne sait pas : les ${m} ${pluriel} sont tous ${missing}.`
  if (m === 0) return `Sur ${n} ${nom(n)}, aucun écarté.`
  return `Sur ${n} ${nom(n)}, ${m} ${missing}.`
}
