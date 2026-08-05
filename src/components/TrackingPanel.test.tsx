import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import TrackingPanel from './TrackingPanel'
import { ACCOUNT, renderWithProviders, tracking } from '../test/render'
import type { MediaType, ReferenceStatuses } from '../api/schema'

const panel = (type: MediaType, reference?: ReferenceStatuses) =>
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
    { reference },
  )

const statuses = () =>
  within(screen.getByRole('group', { name: 'Statut' }))
    .getAllByRole('button')
    .map((button) => button.textContent)

describe('TrackingPanel — le sélecteur de statut', () => {
  it('propose les trois statuts sur un film, dans les mots de l’API', () => {
    panel('movie')
    expect(statuses()).toEqual(['À voir', 'En cours', 'Vu'])
  })

  it('accorde le mot au type — on lit un livre, on ne le voit pas', () => {
    panel('book')
    expect(statuses()).toEqual(['À lire', 'En cours de lecture', 'Lu'])
  })

  /**
   * La preuve que les libellés sont **lus** et non rejoués depuis une table
   * locale : une référence inventée doit s'afficher telle quelle.
   */
  it('affiche ce que la référence dit, quel que soit le mot', () => {
    panel('movie', {
      types: [
        {
          type: 'movie',
          derived_status: false,
          statuses: [
            { value: 'todo', label: 'Un jour peut-être' },
            { value: 'done', label: 'C’est fait' },
          ],
        },
      ],
    })

    expect(statuses()).toEqual(['Un jour peut-être', 'C’est fait'])
  })

  /**
   * Le cœur de l'étape 11. Un album n'a que deux états, et le back **refuse**
   * `doing` : proposer le geste serait proposer une erreur.
   */
  it('n’offre jamais « en cours » sur un album', () => {
    panel('music')
    expect(statuses()).toEqual(['À écouter', 'Écouté'])
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
