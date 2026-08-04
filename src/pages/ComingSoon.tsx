import styles from './ComingSoon.module.css'

/**
 * Sections annoncées dans la navigation mais que l'API ne sert pas encore.
 * Volontairement vide : pas de données fictives, qui laisseraient croire à une
 * fonctionnalité qui n'existe pas.
 */
export default function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Bientôt disponible</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.note}>{note}</p>
    </div>
  )
}
