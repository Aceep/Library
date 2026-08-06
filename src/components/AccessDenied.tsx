import { Link } from 'react-router-dom'
import EmptyState from './EmptyState'
import styles from './AccessDenied.module.css'

/**
 * Un écran réservé à l'administration, vu par quelqu'un qui ne l'est pas.
 *
 * Les deux écrans d'administration redirigeaient vers l'accueil en silence. Le
 * geste était identique à celui d'une adresse inconnue : un membre qui suivait
 * le lien d'un administrateur se retrouvait ailleurs sans pouvoir distinguer
 * un refus d'un lien cassé, et sans savoir qu'il n'avait rien fait de mal.
 *
 * Ce n'est pas une sécurité — le back revérifie et répond `403`. C'est une
 * phrase.
 */
export default function AccessDenied() {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Administration</p>
      <EmptyState
        title="Cet écran est réservé à l’administration."
        note="Votre compte n’y a pas accès. Ce n’est pas une erreur de votre part : le lien est simplement réservé."
        action={
          <Link to="/" className={styles.retour}>
            Retour à l’accueil
          </Link>
        }
      />
    </div>
  )
}
