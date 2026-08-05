import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatRanking from './StatRanking'

/**
 * Un classement affirme quelque chose : que celui-ci passe devant celui-là.
 * Trois situations le rendent faux, et toutes trois se présentent sur un compte
 * jeune — c'est-à-dire tout le temps, au début. Ce fichier les épingle une par
 * une, parce qu'aucune n'est visible en développement sur un jeu de données
 * fourni.
 */
const NOUN: [string, string] = ['livre', 'livres']

describe('StatRanking — quand il n’y a pas de classement', () => {
  it('ne classe rien quand il n’y a rien', () => {
    render(<StatRanking tallies={[]} noun={NOUN} />)

    expect(screen.getByText('Rien à classer pour l’instant.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  /**
   * L'auteur le plus lu de quelqu'un qui n'a lu qu'un auteur n'est pas un
   * palmarès, c'est un fait.
   */
  it('présente une entrée seule comme un fait, pas comme un premier rang', () => {
    render(<StatRanking tallies={[{ label: 'Miriam Kessler', count: 3 }]} noun={NOUN} />)

    expect(screen.getByText('Miriam Kessler')).toBeInTheDocument()
    expect(screen.getByText('— 3 livres')).toBeInTheDocument()
    expect(screen.getByText('Un seul nom : ce n’est pas encore un classement.')).toBeInTheDocument()
    // Ni rang, ni liste ordonnée : rien qui suggère une place.
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  /**
   * Cinq réalisateurs à un film chacun — ce qui arrive dès qu'on a vu cinq
   * films différents. Cinq barres identiques laisseraient croire à un ordre.
   */
  it('ne dessine pas de rangs quand tout est à égalité', () => {
    render(
      <StatRanking
        tallies={[
          { label: 'Ana Sequeira', count: 1 },
          { label: 'Christopher Nolan', count: 1 },
          { label: 'Denis Villeneuve', count: 1 },
        ]}
        noun={['film', 'films']}
      />,
    )

    expect(screen.getByText('Tous à égalité — aucun ne se détache.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByText('1')).not.toBeInTheDocument()
    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })

  it('classe, et numérote, quand quelque chose se détache vraiment', () => {
    render(
      <StatRanking
        // Décomptes choisis pour ne coïncider avec aucun rang : sans ça,
        // « 1 » désignerait aussi bien la première place qu'un décompte, et
        // l'assertion ne prouverait rien.
        tallies={[
          { label: 'Miriam Kessler', count: 7 },
          { label: 'Paul Ferrand', count: 3 },
        ]}
        noun={NOUN}
      />,
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByText(/aucun ne se détache/)).not.toBeInTheDocument()
    expect(screen.queryByText(/pas encore un classement/)).not.toBeInTheDocument()
  })
})
