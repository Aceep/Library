import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Announcer, useAnnounce } from './Announcer'

function Bouton({ phrase }: { phrase: string }) {
  const annoncer = useAnnounce()
  return (
    <button type="button" onClick={() => annoncer(phrase)}>
      dire
    </button>
  )
}

const region = () => document.querySelector('[aria-live="polite"]')

describe('Announcer — la région polie de l’application', () => {
  /**
   * La raison d'être du composant, et elle est technique : *une région insérée
   * dans le DOM avec son texte déjà dedans n'est pas annoncée.* Toutes les
   * régions par écran de la forme `{enCours ? <p aria-live>…</p> : null}` sont
   * ce cas exact et resteraient muettes. Elle doit exister, vide, **avant**
   * qu'on ait quelque chose à dire.
   */
  it('existe et reste vide avant qu’on ait quelque chose à dire', () => {
    render(
      <Announcer>
        <Bouton phrase="Deux résultats." />
      </Announcer>,
    )

    expect(region()).toBeInTheDocument()
    expect(region()).toHaveTextContent('')
  })

  it('dit la phrase qu’on lui donne', () => {
    render(
      <Announcer>
        <Bouton phrase="Deux résultats pour stalker." />
      </Announcer>,
    )

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'dire' }))
    })

    expect(region()).toHaveTextContent('Deux résultats pour stalker.')
  })

  /**
   * Le défaut muet compte : les autres fichiers de test montent leurs écrans
   * sans cette enveloppe. Sans lui, ils tomberaient tous pour une raison qui
   * n'a rien à voir avec ce qu'ils éprouvent.
   */
  it('ne casse pas un écran monté hors de l’enveloppe', () => {
    render(<Bouton phrase="Rien du tout." />)

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'dire' }))).not.toThrow()
  })
})
