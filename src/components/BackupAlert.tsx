import { useQuery } from '@tanstack/react-query'
import { fetchBackupStatus } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import { useSession } from '../session/SessionContext'
import styles from './BackupAlert.module.css'

/** Une heure : l'état change au rythme d'une passe quotidienne. */
const FRAICHEUR = 60 * 60 * 1000

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

/**
 * Le bandeau qui dit qu'on ne sauvegarde plus.
 *
 * **Pourquoi il existe.** Le 5 août, le service de sauvegarde est reparti après
 * un redémarrage de la machine avant que Postgres accepte les connexions. La
 * passe a échoué en trois secondes, puis le service s'est rendormi vingt-quatre
 * heures. Le conteneur était `Up`, rien n'était cassé — et plus rien n'était
 * sauvegardé depuis dix heures quand quelqu'un a fini par demander.
 *
 * Le réessai et le contrôle de santé du conteneur ferment la panne. Ils ne
 * ferment pas le **silence** : `docker compose ps` n'est pas un endroit qu'on
 * regarde tous les jours. L'application, si.
 *
 * Trois choix qui font qu'il sera lu plutôt qu'ignoré :
 *
 * - **Seulement aux administrateurs**, et seulement quand il y a lieu. Un
 *   bandeau permanent devient un élément de décor au bout d'une semaine.
 * - **Deux messages distincts** : « le service ne tourne pas » et « la
 *   sauvegarde est en retard » demandent des gestes opposés — regarder les
 *   conteneurs, ou regarder le disque. Les confondre ferait chercher au mauvais
 *   endroit un jour où le temps compte.
 * - **Un échec de la nuit n'affiche rien** tant que la dernière réussite est
 *   fraîche : le réessai d'un quart d'heure va le rattraper, et crier pour un
 *   incident transitoire apprend à ne plus lire les cris.
 *
 * Un échec de la requête n'affiche rien non plus. « Je n'ai pas pu demander »
 * n'est pas « il n'y a pas de sauvegarde », et un bandeau rouge qui se
 * trompe coûte sa crédibilité à tous les suivants.
 */
export default function BackupAlert() {
  const { isAdmin } = useSession()

  const { data } = useQuery({
    queryKey: queryKeys.backups,
    queryFn: ({ signal }) => fetchBackupStatus(signal),
    enabled: isAdmin,
    staleTime: FRAICHEUR,
    gcTime: FRAICHEUR,
    retry: false,
  })

  if (!isAdmin || !data) return null

  const { backups } = data
  if (!backups.stale) return null

  return (
    <div className={styles.banner} role="status">
      <p className={styles.title}>
        {backups.configured
          ? 'Les sauvegardes ont pris du retard'
          : 'Aucune sauvegarde n’a jamais été enregistrée'}
      </p>
      <p className={styles.body}>
        {backups.configured ? (
          backups.last_success_at ? (
            <>
              La dernière réussite remonte au {formatDate(backups.last_success_at)}, il y a{' '}
              <strong>{Math.round(backups.age_hours ?? 0)} heures</strong> — le seuil est de{' '}
              {backups.stale_after_hours} h. Regarde l’espace disque et le journal du service :{' '}
              <code>docker compose logs sauvegarde</code>.
            </>
          ) : (
            <>
              Le service tourne mais <strong>aucune passe n’a jamais abouti</strong>. Ce n’est pas
              un retard, c’est une panne : <code>docker compose logs sauvegarde</code>.
            </>
          )
        ) : (
          <>
            Le service de sauvegarde n’a jamais atteint cette base. Il ne tourne pas, ou il ne la
            joint pas : <code>docker compose --profile full up -d</code>.
          </>
        )}
      </p>
      {backups.last_run && !backups.last_run.succeeded ? (
        <p className={styles.detail}>
          Dernière tentative le {formatDate(backups.last_run.ran_at)} — {backups.last_run.detail}
        </p>
      ) : null}
    </div>
  )
}
