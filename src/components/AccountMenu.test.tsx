import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import AccountMenu from './AccountMenu'
import { renderWithProviders } from '../test/render'

/**
 * Le premier menu de l'application. Ce qui s'éprouve ici n'est pas qu'il
 * s'ouvre — un survol suffirait à le montrer — mais qu'il se pilote et se
 * quitte **au clavier**, et que ce qui est replié soit réellement hors de
 * portée plutôt que seulement invisible.
 */
const ouvrir = () => {
  const trigger = screen.getByRole('button', { name: /mon compte/i })
  fireEvent.click(trigger)
  return trigger
}

describe('AccountMenu — le repli du compte', () => {
  it('garde ses entrées hors de portée tant qu’il est fermé', () => {
    renderWithProviders(<AccountMenu />)

    expect(screen.getByRole('button', { name: /mon compte/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    // Introuvable **par son rôle** : caché de l'arbre d'accessibilité et de la
    // tabulation, pas seulement masqué à l'œil.
    expect(screen.queryByRole('link', { name: 'Mes badges' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mon compte' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Déconnexion' })).not.toBeInTheDocument()
  })

  it('s’ouvre au clic et annonce son panneau', () => {
    renderWithProviders(<AccountMenu />)
    const trigger = ouvrir()

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', expect.stringMatching(/.+/))
    expect(screen.getByRole('link', { name: 'Mes badges' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mon compte' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Déconnexion' })).toBeInTheDocument()
  })

  it('s’ouvre à la flèche basse en posant le focus sur la première entrée', () => {
    renderWithProviders(<AccountMenu />)
    const trigger = screen.getByRole('button', { name: /mon compte/i })

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Mes badges' })).toHaveFocus()
  })

  it('s’ouvre à la flèche haute en posant le focus sur la dernière', () => {
    renderWithProviders(<AccountMenu />)

    fireEvent.keyDown(screen.getByRole('button', { name: /mon compte/i }), { key: 'ArrowUp' })

    expect(screen.getByRole('button', { name: 'Déconnexion' })).toHaveFocus()
  })

  /**
   * Écrit sans nommer les entrées du milieu : le menu est fait pour en gagner
   * — badges, puis statistiques —, et un test qui les énumérerait casserait à
   * chaque ajout sans rien dire de plus sur le comportement.
   */
  it('descend d’un cran à la fois, et boucle aux deux bouts', () => {
    renderWithProviders(<AccountMenu />)
    const trigger = ouvrir()
    const premier = screen.getByRole('link', { name: 'Mes badges' })
    const dernier = screen.getByRole('button', { name: 'Déconnexion' })

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(premier).toHaveFocus()

    // Un cran, pas un saut : descendre puis remonter ramène au point de départ.
    fireEvent.keyDown(premier, { key: 'ArrowDown' })
    expect(premier).not.toHaveFocus()
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowUp' })
    expect(premier).toHaveFocus()

    // Boucle : avant la première on va à la dernière, et après la dernière on
    // revient à la première.
    fireEvent.keyDown(premier, { key: 'ArrowUp' })
    expect(dernier).toHaveFocus()

    fireEvent.keyDown(dernier, { key: 'ArrowDown' })
    expect(premier).toHaveFocus()
  })

  it('va au premier et au dernier avec Origine et Fin', () => {
    renderWithProviders(<AccountMenu />)
    const trigger = ouvrir()

    fireEvent.keyDown(trigger, { key: 'End' })
    expect(screen.getByRole('button', { name: 'Déconnexion' })).toHaveFocus()

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' })
    expect(screen.getByRole('link', { name: 'Mes badges' })).toHaveFocus()
  })

  /**
   * Le point qui se rate le plus souvent : fermer sans rendre le focus laisse
   * l'utilisateur au clavier revenu au début de la page, sans rien lui dire.
   */
  it('se ferme par Échap en rendant le focus au déclencheur', () => {
    renderWithProviders(<AccountMenu />)
    const trigger = ouvrir()

    fireEvent.keyDown(screen.getByRole('link', { name: 'Mon compte' }), { key: 'Escape' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Mon compte' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('se ferme quand la tabulation sort du menu', () => {
    renderWithProviders(
      <>
        <AccountMenu />
        <button type="button">Ailleurs</button>
      </>,
    )
    ouvrir()
    const dehors = screen.getByRole('button', { name: 'Ailleurs' })

    fireEvent.blur(screen.getByRole('link', { name: 'Mon compte' }), { relatedTarget: dehors })

    expect(screen.queryByRole('link', { name: 'Mon compte' })).not.toBeInTheDocument()
  })

  it('reste ouvert quand le focus passe d’une entrée à l’autre', () => {
    renderWithProviders(<AccountMenu />)
    ouvrir()
    const premier = screen.getByRole('link', { name: 'Mon compte' })
    const dernier = screen.getByRole('button', { name: 'Déconnexion' })

    fireEvent.blur(premier, { relatedTarget: dernier })

    expect(screen.getByRole('link', { name: 'Mon compte' })).toBeInTheDocument()
  })

  it('se ferme au clic ailleurs dans la page', () => {
    renderWithProviders(<AccountMenu />)
    ouvrir()

    fireEvent.mouseDown(document.body)

    expect(screen.queryByRole('link', { name: 'Mon compte' })).not.toBeInTheDocument()
  })
})
