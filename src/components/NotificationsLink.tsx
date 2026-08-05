import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchNotifications } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import styles from './NotificationsLink.module.css'

/** Une seule notification suffit : c'est `unread_count` qu'on vient chercher. */
const FILTRES = { unread: true, limit: 1 }

/**
 * L'entrée « Nouveautés » de la coquille, et son compte de non lues.
 *
 * Le compteur vient de `unread_count`, qui accompagne chaque page et vaut pour
 * l'ensemble — pas de la longueur de `items`, qui n'en serait qu'une tranche.
 * On demande donc **une** notification et on jette la liste.
 *
 * Pas de sondage périodique : les nouveautés arrivent au rythme d'une veille
 * qui tourne au quart d'heure, et une requête toutes les trente secondes pour
 * ça serait du bruit. Le compteur se rafraîchit au retour sur l'onglet et après
 * chaque lecture — c'est le rythme auquel il change vraiment.
 *
 * Un échec ne montre rien plutôt qu'un zéro : « aucune nouveauté » et « je n'ai
 * pas pu demander » ne se disent pas de la même façon, et le second n'a pas sa
 * place dans un en-tête.
 */
export default function NotificationsLink() {
  const { data } = useQuery({
    queryKey: queryKeys.notificationsWith(FILTRES),
    queryFn: ({ signal }) => fetchNotifications(FILTRES, null, signal),
    refetchOnWindowFocus: true,
  })

  const unread = data?.unread_count ?? 0

  return (
    <NavLink
      to="/notifications"
      className={({ isActive }) =>
        isActive ? `${styles.link} ${styles.linkActive}` : styles.link
      }
      title={unread > 0 ? `${unread} nouveauté(s) non lue(s)` : 'Nouveautés'}
    >
      Nouveautés
      {unread > 0 ? (
        <span className={styles.count} aria-label={`${unread} non lue${unread > 1 ? 's' : ''}`}>
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </NavLink>
  )
}
