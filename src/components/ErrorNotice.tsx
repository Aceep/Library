import { ApiError } from '../api/client'
import styles from './ErrorNotice.module.css'

/**
 * Affiche le message du serveur **tel quel**.
 *
 * Le back rédige ses messages en français, sans jargon, et y met du contexte
 * qu'on n'a pas ici (le titre de l'œuvre, le nom du tome, la durée d'attente).
 * Écrire notre propre catalogue reviendrait à le perdre.
 */
export default function ErrorNotice({
  error,
  onRetry,
  tone = 'error',
}: {
  error: unknown
  onRetry?: () => void
  tone?: 'error' | 'notice'
}) {
  const apiError = error instanceof ApiError ? error : null
  const message =
    apiError?.message ??
    (error instanceof Error
      ? error.message
      : "Une erreur inattendue est survenue. Réessaie, et signale-la si elle persiste.")

  const canRetry = onRetry && (apiError ? apiError.retryable : true)

  return (
    <div className={tone === 'notice' ? styles.notice : styles.error} role="alert">
      <p className={styles.message}>{message}</p>
      {canRetry ? (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Réessayer
        </button>
      ) : null}
    </div>
  )
}
