import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatFigure from './StatFigure'

/**
 * La règle de l'écran, éprouvée sur le composant qui la porte : **aucune
 * valeur ne se rend sans sa couverture**. Le composant n'offre aucune façon de
 * l'omettre — `coverage` est requis et sans défaut —, ces tests vérifient que
 * ce qu'il en dit est juste dans les quatre cas.
 */
const LIVRES: [string, string] = ['livre terminé', 'livres terminés']

const figure = (
  coverage: { counted: number; missing: number },
  extra: Partial<Parameters<typeof StatFigure>[0]> = {},
) =>
  render(
    <StatFigure
      label="Livres"
      value="12 400"
      unit="pages"
      coverage={coverage}
      counted={LIVRES}
      missing="sans pagination connue"
      {...extra}
    />,
  )

describe('StatFigure — un chiffre, et ce qu’il a fallu écarter', () => {
  it('dit ce qui manque quand il manque quelque chose', () => {
    figure({ counted: 34, missing: 6 })

    expect(screen.getByText('12 400')).toBeInTheDocument()
    expect(
      screen.getByText('Sur 34 livres terminés, 6 sans pagination connue.'),
    ).toBeInTheDocument()
  })

  it('dit aussi que rien ne manque, plutôt que de se taire', () => {
    figure({ counted: 4, missing: 0 })

    expect(screen.getByText('Sur 4 livres terminés, aucun écarté.')).toBeInTheDocument()
  })

  it('distingue « rien encore » de « rien à dire »', () => {
    figure({ counted: 0, missing: 0 })

    expect(screen.getByText('Aucun livre terminé pour l’instant.')).toBeInTheDocument()
  })

  /**
   * Le cas qui compte vraiment. Quand rien n'a servi au calcul mais que des
   * œuvres ont été écartées, la valeur vaut zéro sans que le membre n'ait rien
   * fait : « 0 page » se lirait « tu n'as rien lu », alors que la vérité est
   * « on ne sait pas ». Les deux ne se disent pas de la même façon.
   */
  it('ne laisse pas un zéro d’ignorance passer pour un zéro d’inaction', () => {
    figure({ counted: 0, missing: 6 }, { value: '0' })

    expect(
      screen.getByText('On ne sait pas : les 6 livres terminés sont tous sans pagination connue.'),
    ).toBeInTheDocument()
  })

  /**
   * Une durée estimée par IGDB ne doit jamais se lire comme une durée mesurée.
   * Le mot est écrit, il n'est pas seulement suggéré par la composition.
   */
  it('nomme une estimation, et rend sa note en entier', () => {
    figure(
      { counted: 3, missing: 0 },
      {
        basis: 'estimated',
        note: 'Durée de complétion déclarée par IGDB, pas votre temps de jeu réel.',
      },
    )

    expect(screen.getByText('estimation')).toBeInTheDocument()
    expect(
      screen.getByText('Durée de complétion déclarée par IGDB, pas votre temps de jeu réel.'),
    ).toBeInTheDocument()
  })

  it('se tait sur la base quand le chiffre est mesuré', () => {
    figure({ counted: 3, missing: 0 })

    expect(screen.queryByText('estimation')).not.toBeInTheDocument()
  })

  it('accorde le singulier', () => {
    figure({ counted: 1, missing: 0 })

    expect(screen.getByText('Sur 1 livre terminé, aucun écarté.')).toBeInTheDocument()
  })
})
