import { NavLink, Outlet } from 'react-router-dom'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import { useSession } from '../session/SessionContext'
import IdentityDot from './IdentityDot'
import styles from './AppShell.module.css'

/** Sections annoncées mais pas encore servies par l'API. */
const PENDING_SECTIONS = [
  { to: '/musique', label: 'Music History' },
  { to: '/quetes', label: 'Quests' },
]

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
            {PENDING_SECTIONS.map((section) => (
              <NavLink
                key={section.to}
                to={section.to}
                className={({ isActive }) =>
                  isActive
                    ? `${styles.navLink} ${styles.navLinkPending} ${styles.navLinkActive}`
                    : `${styles.navLink} ${styles.navLinkPending}`
                }
              >
                {section.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.account}>
            {isAdmin ? (
              <NavLink to="/administration/invitations" className={styles.adminLink}>
                Inviter
              </NavLink>
            ) : null}
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
    </div>
  )
}
