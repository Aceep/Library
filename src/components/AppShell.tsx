import { useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import { useThemeMode } from '../theme/useThemeMode'
import AppFooter from './AppFooter'
import BackupAlert from './BackupAlert'
import NotificationsLink from './NotificationsLink'
import AccountMenu from './AccountMenu'
import styles from './AppShell.module.css'

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

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggle}
      aria-label={`Passer en mode ${mode === 'dark' ? 'jour' : 'nuit'}`}
    >
      {mode === 'dark' ? 'Jour' : 'Nuit'}
    </button>
  )
}

/**
 * Le champ de recherche du bandeau.
 *
 * C'est un vrai formulaire, pas un lien déguisé : on tape et on valide, et
 * `/recherche` reprend la requête depuis `?q=`. Un champ qui mènerait à un
 * écran vide mentirait sur ce qu'il vient de recevoir.
 */
function SearchField() {
  const [draft, setDraft] = useState('')
  const navigate = useNavigate()

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const q = draft.trim()
    navigate(q ? `/recherche?q=${encodeURIComponent(q)}` : '/recherche')
  }

  return (
    <form className={styles.search} onSubmit={onSubmit} role="search">
      <label className={styles.searchLabel} htmlFor="recherche-bandeau">
        Chercher
      </label>
      <input
        id="recherche-bandeau"
        className={styles.searchInput}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="un titre, un auteur…"
      />
    </form>
  )
}

/**
 * La coquille : bandeau collant, contenu, pied de page.
 *
 * **Les rayons sont un filtre d'un seul fonds, pas six destinations à
 * l'identité propre.** Ils se composent donc tous pareil, et seule leur teinte
 * — le gel porté par `data-media-type` — les distingue. « Tous » vise
 * l'accueil, qui est la vue sans filtre.
 */
export default function AppShell() {
  const { pathname } = useLocation()

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.brand}>
            Média<span className={styles.brandItalic}>thèque</span>
          </NavLink>

          <nav className={styles.rayons} aria-label="Les rayons">
            <NavLink to="/" end className={styles.rayonAll}>
              Tous
            </NavLink>
            {MEDIA_TYPES.map((type) => (
              <NavLink
                key={type}
                to={`/bibliotheque/${type}`}
                data-media-type={type}
                className={({ isActive }) =>
                  isActive ? `${styles.rayon} ${styles.rayonActive}` : styles.rayon
                }
              >
                {typeLabelPlural(type)}
              </NavLink>
            ))}
          </nav>

          <div className={styles.account}>
            <SearchField />
            <NotificationsLink />
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>
      </header>

      {/*
        L'accueil est le seul écran à pleine largeur : sa bannière porte son
        propre fond et son ticker traverse l'écran, ce qu'un `.main` contraint à
        1360px ne peut pas rendre. Chaque section de l'accueil reprend son
        conteneur — la contrainte descend d'un cran, elle ne disparaît pas.
      */}
      <main className={styles.main} data-bleed={pathname === '/' ? '' : undefined}>
        {/* En tête du contenu et non dans le bandeau : une alerte de sauvegarde
            se lit une fois et demande une action, elle n'accompagne pas la
            navigation. Elle ne s'affiche qu'aux administrateurs, et qu'en cas
            d'alerte. */}
        <div className={styles.alertSlot}>
          <BackupAlert />
        </div>
        <Outlet />
      </main>

      <AppFooter />
    </div>
  )
}
