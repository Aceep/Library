import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { useDocumentTitle } from './useDocumentTitle'

const Ecran = ({ titre }: { titre: string | null }) => {
  useDocumentTitle(titre)
  return null
}

/**
 * Tous les écrans partageaient le titre statique d'`index.html` : trois onglets
 * ouverts étaient indistinguables, et l'historique du bouton retour proposait
 * une liste de « Médiathèque partagée » identiques.
 */
describe('useDocumentTitle — l’onglet dit où l’on est', () => {
  it('compose le titre de l’écran avec le nom de l’application', () => {
    render(<Ecran titre="Stalker" />)

    expect(document.title).toBe('Stalker · Médiathèque')
  })

  /**
   * `null` veut dire « on ne sait pas encore », et c'est ce qu'il faut passer
   * pendant le chargement. Surtout pas « Chargement… » : le titre est aussi le
   * nom de l'entrée d'historique et du signet, et il s'y inscrirait
   * définitivement — le retour arrière offrirait une liste de « Chargement… »
   * indistincts, ce qui est pire que le défaut qu'on répare.
   */
  it('retombe sur le titre nu quand l’écran n’a pas encore de mot à lui', () => {
    render(<Ecran titre={null} />)

    expect(document.title).toBe('Médiathèque partagée')
  })

  /**
   * Sans nettoyage, un écran qui n'appelle pas le hook — ou dont la requête
   * échoue — hériterait du titre du précédent, et l'onglet mentirait sur ce
   * qu'il montre.
   */
  it('ne laisse pas son titre derrière lui en se démontant', () => {
    const vue = render(<Ecran titre="Stalker" />)
    expect(document.title).toBe('Stalker · Médiathèque')

    vue.unmount()

    expect(document.title).toBe('Médiathèque partagée')
  })

  it('suit le titre quand la donnée arrive', () => {
    const vue = render(<Ecran titre={null} />)
    expect(document.title).toBe('Médiathèque partagée')

    vue.rerender(<Ecran titre="Solaris" />)

    expect(document.title).toBe('Solaris · Médiathèque')
  })
})
