import { Link, useLocation } from 'react-router-dom'
import { useDocumentTitle } from '../components/useDocumentTitle'
import styles from './NotFound.module.css'

/**
 * Rien à cette adresse.
 *
 * Avant, la route `*` faisait `<Navigate to="/" replace />` : un lien périmé,
 * une faute de frappe et un accès refusé produisaient tous les trois le même
 * silence, et on se retrouvait à l'accueil sans savoir qu'on s'était trompé —
 * ni de quoi. Une adresse qui n'existe pas mérite qu'on le dise, et qu'on la
 * montre : c'est elle qui contient la faute de frappe.
 *
 * Pas d'illustration, pas de « 404 » en chiffres géants : un bloc en tireté,
 * comme l'état vide de la recherche. Une place vide se dessine comme une place
 * vide.
 */
export default function NotFound() {
  useDocumentTitle('Adresse inconnue')
  const { pathname } = useLocation()

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Rien à cette adresse</p>

      <div className={styles.bloc}>
        <h1 className={styles.title}>Cette page n’existe pas, ou n’existe plus.</h1>

        {/* Montrer l'adresse demandée : c'est là qu'est la coquille, et c'est
            la seule information que nous ayons et que le lecteur n'ait pas. */}
        <p className={styles.adresse}>{pathname}</p>

        <p className={styles.note}>
          Un lien a peut-être vieilli, ou une œuvre a été retirée du fonds. Rien n’est perdu de
          votre côté.
        </p>

        <div className={styles.actions}>
          <Link to="/" className={styles.cta}>
            Retour à l’accueil <span aria-hidden="true">→</span>
          </Link>
          <Link to="/recherche" className={styles.lien}>
            Chercher une œuvre
          </Link>
        </div>
      </div>
    </div>
  )
}
