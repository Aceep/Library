import { NavLink } from 'react-router-dom'
import styles from './AppFooter.module.css'

/**
 * Le pied de page ne sert qu'à une chose : rendre les attributions joignables
 * de n'importe où.
 *
 * TMDB **exige** que leur mention figure quelque part dans l'application, avec
 * leur logo — c'est une condition d'utilisation de leur API, pas un usage. La
 * page « À propos » la porte en entier ; ce lien garantit qu'on y arrive sans
 * la chercher. Le retirer reviendrait à cacher la mention.
 */
export default function AppFooter() {
  return (
    <footer className={styles.footer}>
      <NavLink to="/a-propos" className={styles.link}>
        D'où viennent ces fiches
      </NavLink>
    </footer>
  )
}
