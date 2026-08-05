import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import TrackingPanel from './TrackingPanel'
import { ACCOUNT, renderWithProviders, tracking } from '../test/render'
import type { MediaType } from '../api/schema'

const panel = (type: MediaType) =>
  renderWithProviders(
    <TrackingPanel
      tracking={tracking()}
      type={type}
      account={ACCOUNT}
      onPatch={vi.fn()}
      onRemove={vi.fn()}
      isSaving={false}
      error={null}
    />,
  )

const statuses = () =>
  within(screen.getByRole('group', { name: 'Statut' }))
    .getAllByRole('button')
    .map((button) => button.textContent)

describe('TrackingPanel — le sélecteur de statut', () => {
  it('propose les trois statuts sur un film', () => {
    panel('movie')
    expect(statuses()).toEqual(['À voir', 'En cours', 'Terminé'])
  })

  /**
   * Le cœur de l'étape 11. Un album n'a que deux états, et le back **refuse**
   * `doing` : proposer le geste serait proposer une erreur.
   */
  it('n’offre jamais « en cours » sur un album', () => {
    panel('music')
    expect(statuses()).toEqual(['À voir', 'Terminé'])
    expect(screen.queryByRole('button', { name: 'En cours' })).not.toBeInTheDocument()
  })

  it('ne montre aucun sélecteur quand le statut est dérivé', () => {
    panel('tv')
    expect(screen.queryByRole('group', { name: 'Statut' })).not.toBeInTheDocument()
  })

  it('dit que l’œuvre est absente quand il n’y a pas de suivi', () => {
    renderWithProviders(
      <TrackingPanel
        tracking={null}
        type="movie"
        account={ACCOUNT}
        onPatch={vi.fn()}
        onRemove={vi.fn()}
        isSaving={false}
        error={null}
      />,
    )
    expect(screen.getByText(/n'est pas dans ta bibliothèque/)).toBeInTheDocument()
  })
})
