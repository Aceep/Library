import type { ReactNode } from 'react'
import styles from './StatDuel.module.css'

export interface DuelSide {
  name: string
  /** La couleur d'identité du membre — la seule chromie forte du système. */
  color: string
  /** Déjà formaté. Le composant ne calcule rien. */
  value: string
  /** De 0 à 1, sur une échelle **partagée** par les deux côtés. */
  ratio: number
  /** La couverture, ou ce qu'il faut savoir avant de lire ce chiffre. */
  note?: ReactNode
}

/**
 * Deux membres sur une même grandeur.
 *
 * **Deux séries de données coexistent pour la première fois**, et le système a
 * déjà sa réponse : la couleur d'identité, qui existe précisément pour
 * distinguer des personnes et qu'on emploie déjà partout où deux suivis se
 * côtoient. Rien d'autre n'est inventé — pas de palette catégorielle, pas de
 * hachure, pas de seconde teinte sémantique.
 *
 * La couleur ne porte jamais seule : chaque côté est **nommé en toutes
 * lettres** à côté de sa pastille, comme sur l'écran « Comparer ». Un daltonien,
 * un écran en noir et blanc ou un lecteur d'écran lisent la même chose.
 *
 * **Aucune différence n'est calculée.** Imprimer un écart, c'est affirmer qu'il
 * veut dire quelque chose. Entre deux valeurs dont les couvertures diffèrent, la
 * soustraction hérite des deux trous sans pouvoir les nommer ; et même à
 * couverture égale, « 932 pages de plus » ne dit rien quand l'un a terminé
 * quatre livres et l'autre un seul. Les deux barres, sur une échelle partagée,
 * disent la magnitude sans prétendre à une précision que la donnée ne porte pas.
 */
export default function StatDuel({
  label,
  sides,
  note,
}: {
  label: string
  sides: [DuelSide, DuelSide]
  /** Ce qui vaut pour la ligne entière, sous les deux côtés. */
  note?: ReactNode
}) {
  return (
    <div className={styles.duel}>
      <p className={styles.label}>{label}</p>

      {sides.map((side) => (
        <div key={side.name} className={styles.side}>
          <span className={styles.who}>
            <span className={styles.dot} style={{ background: side.color }} aria-hidden="true" />
            <span className={styles.name}>{side.name}</span>
          </span>

          <span className={styles.track} aria-hidden="true">
            {side.ratio > 0 ? (
              <span
                className={styles.fill}
                style={{ width: `${Math.min(side.ratio, 1) * 100}%`, background: side.color }}
              />
            ) : (
              <span className={styles.zero}>·</span>
            )}
          </span>

          <span className={styles.value}>{side.value}</span>

          {side.note ? <span className={styles.sideNote}>{side.note}</span> : null}
        </div>
      ))}

      {note ? <p className={styles.note}>{note}</p> : null}
    </div>
  )
}
