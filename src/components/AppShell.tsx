import { useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import { useThemeMode } from '../theme/useThemeMode'
import { useNewScreen } from './useNewScreen'
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
 * L'accès à la recherche.
 *
 * La maquette remplace le champ du bandeau par un bouton : la recherche y est
 * une superposition, pas une frappe au vol. Tant que cette superposition
 * n'existe pas, le bouton mène à l'écran de recherche — une destination réelle
 * plutôt qu'un geste promis.
 */
function SearchLink() {
  return (
    <NavLink to="/recherche" className={styles.search}>
      Chercher
    </NavLink>
  )
}

/**
 * La coquille : bandeau collant, contenu, pied de page.
 *
 * **Les rayons sont un filtre d'un seul fonds, pas six destinations à
 * l'identité propre.** Ils se composent donc tous pareil, et seule leur teinte
 * — le gel porté par `data-media-type` — les distingue. À l'état actif, la
 * pastille se remplit de son gel et le texte passe en `--gel-ink` : c'est la
 * distinction de *forme* qui sépare un rayon (aplat) d'un membre (pastille
 * bordée), et elle ne s'inverse pas.
 *
 * Deux destinations ferment la rangée : **Quêtes** en doré, parce qu'on y va
 * pour faire quelque chose, et **Le cercle** en ambre, parce qu'il nomme une
 * structure. La marque mène à l'accueil — inutile de lui donner une seconde
 * pastille dans la même barre.
 *
 * **La rangée n'est écrite qu'une fois.** La maquette la recopie sous le
 * bandeau pour en faire un rail défilant sous 1180px ; nous la laissons où elle
 * est et c'est la grille qui la fait passer à la ligne. Deux copies des mêmes
 * huit liens seraient deux fois lues par un lecteur d'écran, alors qu'une seule
 * est visible.
 */
export default function AppShell() {
  const { pathname } = useLocation()
  const contenu = useRef<HTMLElement>(null)
  useNewScreen(contenu)

  return (
    <div className={styles.shell}>
      {/*
        Le premier nœud focalisable du document. Un vrai lien de fragment, sans
        JavaScript : c'est `tabIndex={-1}` sur la cible qui fait que le focus y
        atterrit vraiment, pas un gestionnaire de clic.

        Sans lui, atteindre le contenu au clavier demandait de traverser les
        huit destinations du bandeau, à chaque écran.
      */}
      <a href="#contenu" className={styles.skip}>
        Aller au contenu
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.brand}>
            Média<span className={styles.brandItalic}>thèque</span>
          </NavLink>

          <nav className={styles.rayons} aria-label="Les rayons">
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
            <NavLink
              to="/quetes"
              className={({ isActive }) =>
                isActive ? `${styles.quetes} ${styles.quetesActive}` : styles.quetes
              }
            >
              Quêtes
            </NavLink>
            <NavLink
              to="/membres"
              className={({ isActive }) =>
                isActive ? `${styles.cercle} ${styles.cercleActive}` : styles.cercle
              }
            >
              Le cercle
            </NavLink>
          </nav>

          <div className={styles.account}>
            <SearchLink />
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
      <main
        id="contenu"
        ref={contenu}
        tabIndex={-1}
        className={styles.main}
        data-bleed={pathname === '/' ? '' : undefined}
      >
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
