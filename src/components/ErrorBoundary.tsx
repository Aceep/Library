import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

/**
 * Le dernier filet, sous toute l'application.
 *
 * Une exception levée pendant le rendu démonte l'arbre React entier : sans
 * frontière, l'écran devient **blanc**, sans un mot, et la seule trace est dans
 * la console. C'est le pire des échecs — indiscernable d'une page qui n'a pas
 * fini de charger, et impossible à signaler autrement que par « ça ne marche
 * plus ».
 *
 * À ne pas confondre avec `ErrorNotice`, qui dit une erreur **attendue** venue
 * du serveur, là où elle se produit. Ici on attrape ce que personne n'avait
 * prévu, et la seule chose honnête à proposer est de recharger.
 *
 * React impose une classe : `componentDidCatch` et `getDerivedStateFromError`
 * n'ont pas d'équivalent en hook. C'est le seul composant de classe du projet.
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Pas de service de collecte ici : la console est la seule destination, et
    // la pile de composants vaut plus que la pile d'appels pour retrouver
    // l'écran fautif.
    console.error('Exception de rendu :', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className={styles.page}>
        <div className={styles.panel} role="alert">
          <p className={styles.eyebrow}>Erreur</p>
          <h1 className={styles.title}>Cet écran s'est interrompu.</h1>
          <p className={styles.message}>
            Ce n'est pas ta connexion ni le serveur : c'est un défaut de l'interface elle-même.
            Recharger repart d'un état propre.
          </p>
          {/* Le message technique est donné, pas caché : c'est lui qu'on
              recopie dans un signalement, et il ne veut rien dire de sensible. */}
          <p className={styles.detail}>{error.message}</p>
          <button type="button" className={styles.reload} onClick={() => window.location.reload()}>
            Recharger la page
          </button>
        </div>
      </div>
    )
  }
}
