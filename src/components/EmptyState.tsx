import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

/**
 * L'API répond `200` avec des listes vides sur un compte neuf, jamais une
 * erreur : le vide est un état normal et mérite un écran, pas un blanc.
 */
export default function EmptyState({
  title,
  note,
  action,
}: {
  title: string
  note?: string
  action?: ReactNode
}) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{title}</p>
      {note ? <p className={styles.note}>{note}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  )
}
