import type { TrackingStatus } from '../api/schema'
import { statusLabel } from '../api/schema'
import styles from './StatusBadge.module.css'

export default function StatusBadge({ status }: { status: TrackingStatus }) {
  return (
    <span className={styles.badge} data-status={status}>
      {statusLabel(status)}
    </span>
  )
}

/**
 * Pastille « du neuf est paru ».
 *
 * C'est le seul signal qui justifie de ressortir une œuvre terminée d'une
 * liste d'archives : il se lève quand du contenu est arrivé après le premier
 * achèvement, et ne retombe que sur un vrai rattrapage.
 */
export function NewContentBadge() {
  return <span className={styles.newBadge}>Du neuf</span>
}
