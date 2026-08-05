import type { Quest } from '../api/schema'
import styles from './QuestProgress.module.css'

/**
 * Où j'en suis sur une quête, dit en toutes lettres.
 *
 * Deux nombres cohabitent et se confondent facilement : `total` est le nombre
 * d'œuvres de la quête, `required` combien il en faut pour l'achever. Ils sont
 * égaux sauf si un seuil a été fixé — « sept sur dix ». Afficher « 7/10 »
 * laisserait croire qu'il en reste trois à faire ; c'est le seuil qui décide,
 * et il faut le dire.
 *
 * `completed_at` est **figé** au moment de l'achèvement : une quête achevée le
 * reste, même si le seuil change ensuite ou qu'une œuvre en sort.
 */
export default function QuestProgress({
  progress,
  className,
}: {
  progress: Quest['progress']
  className?: string
}) {
  const { done, total, required, completed } = progress
  const seuil = required < total

  return (
    <p className={[styles.line, completed ? styles.done : '', className].filter(Boolean).join(' ')}>
      <strong className={styles.count}>
        {done} sur {required}
      </strong>
      {completed ? (
        <span className={styles.state}>achevée</span>
      ) : (
        <span className={styles.state}>{done === 0 ? 'pas commencée' : 'en cours'}</span>
      )}
      {/* Le seuil n'est pas un détail : sans cette phrase, « 3 sur 7 » sur une
          quête de dix œuvres se lit comme une erreur d'affichage. */}
      {seuil ? (
        <span className={styles.threshold}>
          {required} suffisent sur les {total} de la quête
        </span>
      ) : null}
    </p>
  )
}
