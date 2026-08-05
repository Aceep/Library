import type { MediaType, TrackingStatus } from '../api/schema'
import { useReference } from '../reference/ReferenceContext'
import styles from './StatusBadge.module.css'

/**
 * Le type est exigé, pas facultatif : c'est lui qui décide du mot. « Lu » sur
 * un livre, « Vu » sur un film, « Écouté » sur un album — l'API les rédit, on
 * ne les invente pas ici.
 */
export default function StatusBadge({ status, type }: { status: TrackingStatus; type: MediaType }) {
  const { statusLabel } = useReference()

  return (
    <span className={styles.badge} data-status={status}>
      {statusLabel(type, status)}
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
