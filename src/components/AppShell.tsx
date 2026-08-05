import { NavLink, Outlet } from 'react-router-dom'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import { useSession } from '../session/SessionContext'
import AppFooter from './AppFooter'
import NotificationsLink from './NotificationsLink'
import IdentityDot from './IdentityDot'
import styles from './AppShell.module.css'

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink

export default function AppShell() {
  const { user, isAdmin, logout } = useSession()

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.brand}>
            Médiathèque
          </NavLink>

          <nav className={styles.nav} aria-label="Navigation principale">
            <NavLink to="/" end className={navClass}>
              Accueil
            </NavLink>
            {MEDIA_TYPES.map((type) => (
              <NavLink key={type} to={`/bibliotheque/${type}`} className={navClass}>
                {typeLabelPlural(type)}
              </NavLink>
            ))}
            <NavLink to="/membres" className={navClass}>
              Membres
            </NavLink>
            <NavLink to="/comparer" className={navClass}>
              Comparer
            </NavLink>
            <span className={styles.navSeparator} aria-hidden="true" />
            <NavLink to="/quetes" className={navClass}>
              Quêtes
            </NavLink>
          </nav>

          <div className={styles.account}>
            {isAdmin ? (
              <span className={styles.adminGroup}>
                <NavLink to="/administration/invitations" className={styles.adminLink}>
                  Inviter
                </NavLink>
                <NavLink to="/administration/membres" className={styles.adminLink}>
                  Comptes
                </NavLink>
              </span>
            ) : null}
            <NavLink to="/veille" className={styles.adminLink}>
              Veille
            </NavLink>
            <NotificationsLink />
            <NavLink to="/recherche" className={styles.searchLink}>
              Ajouter une œuvre
            </NavLink>
            <NavLink to="/mon-compte" className={styles.identityLink} title="Mon compte">
              <IdentityDot account={user} withName />
            </NavLink>
            <button type="button" className={styles.logout} onClick={() => void logout()}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <AppFooter />
    </div>
  )
}
