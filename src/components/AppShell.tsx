import { NavLink, Outlet } from 'react-router-dom'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import { useSession } from '../session/SessionContext'
import { useThemeMode } from '../theme/useThemeMode'
import AppFooter from './AppFooter'
import BackupAlert from './BackupAlert'
import NotificationsLink from './NotificationsLink'
import AccountMenu from './AccountMenu'
import styles from './AppShell.module.css'

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink

/**
 * L'interrupteur Jour / Nuit.
 *
 * Le libellé annonce **où l'on va**, pas où l'on est : en nuit il dit « Jour ».
 * C'est la convention de la maquette, et celle des interrupteurs en général.
 *
 * Pas d'`aria-pressed` : ce n'est pas un état activé ou non, c'est une bascule
 * entre deux valeurs nommées — `aria-label` porte la phrase entière.
 */
export function ThemeToggle() {
  const { mode, toggle } = useThemeMode()
  const cible = mode === 'dark' ? 'jour' : 'nuit'

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggle}
      aria-label={`Passer en mode ${cible}`}
    >
      {mode === 'dark' ? 'Jour' : 'Nuit'}
    </button>
  )
}

export default function AppShell() {
  const { isAdmin } = useSession()

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
            {/* Ce qui se regarde tous les jours reste dehors — c'est la seule
                raison de ne pas le replier avec le reste. */}
            <NavLink to="/veille" className={styles.adminLink}>
              Veille
            </NavLink>
            <NotificationsLink />
            <NavLink to="/recherche" className={styles.searchLink}>
              Ajouter une œuvre
            </NavLink>
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* En tête du contenu et non dans le bandeau : une alerte de sauvegarde
            se lit une fois et demande une action, elle n'accompagne pas la
            navigation. Elle ne s'affiche qu'aux administrateurs, et qu'en cas
            d'alerte. */}
        <BackupAlert />
        <Outlet />
      </main>

      <AppFooter />
    </div>
  )
}
