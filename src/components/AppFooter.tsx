import { NavLink } from 'react-router-dom'
import styles from './AppFooter.module.css'

/**
 * Trois mentions sourdes, en mono, d'un bord à l'autre.
 *
 * La maquette en propose trois : ce qu'est le fonds, avec quoi il est composé,
 * et ce qu'on n'y fait pas. La troisième — « Rien à consommer ici » — cède sa
 * place au lien d'attribution.
 *
 * Ce n'est pas un arbitrage de goût : TMDB **exige** que leur mention figure
 * quelque part dans l'application, avec leur logo — c'est une condition
 * d'utilisation de leur API, pas un usage. La page « À propos » la porte en
 * entier ; ce lien garantit qu'on y arrive sans la chercher. Le retirer pour
 * coller à la maquette reviendrait à cacher la mention.
 */
export default function AppFooter() {
  return (
    <footer className={styles.footer}>
      <span>Médiathèque · fonds privé du cercle</span>
      <span>Cormorant Garamond &amp; IBM Plex Mono</span>
      <NavLink to="/a-propos" className={styles.link}>
        D'où viennent ces fiches
      </NavLink>
    </footer>
  )
}
