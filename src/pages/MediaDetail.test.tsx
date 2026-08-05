import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import { ApiError } from '../api/client'
import type { MediaDetail as MediaDetailShape } from '../api/schema'
import { renderWithProviders, tracking } from '../test/render'

const fetchMediaDetail = vi.fn()
vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchMediaDetail: (...args: unknown[]) => fetchMediaDetail(...args),
  fetchLog: vi.fn().mockResolvedValue({ items: [], next_cursor: null }),
  fetchMediaTrackers: vi.fn().mockResolvedValue({ items: [], next_cursor: null }),
  fetchAvailability: vi.fn().mockResolvedValue({ availability: null }),
}))

/**
 * Une fiche de film, réduite à ce que l'écran lit.
 *
 * Le cast est assumé : `MediaDetail` est un `oneOf` par type d'œuvre, et
 * réécrire à la main la variante entière rendrait ce test faux dès la première
 * évolution du contrat, pour une valeur nulle — on vérifie ici que l'écran se
 * monte, pas que le back respecte son propre schéma.
 */
const FILM = {
  id: '00000000-0000-4000-8000-0000000000aa',
  type: 'movie',
  source: 'tmdb',
  external_id: '603',
  title: 'Matrix',
  original_title: 'The Matrix',
  cover_url: null,
  release_date: '1999-03-31',
  year: 1999,
  summary: 'Un programmeur découvre la nature de sa réalité.',
  refreshed_at: '2026-08-01T10:00:00.000Z',
  metadata: {},
  availability: null,
  sagas: [],
  // `progress` est toujours un objet sur une fiche, même quand rien n'est
  // cochable : c'est `progress.me` qui vaut alors `null`.
  progress: { me: null },
  tracking: { me: tracking({ status: 'done' }), following: [], others: { count: 0, average_rating: null, favorites: 0 } },
} as unknown as MediaDetailShape

const renderDetail = () =>
  renderWithProviders(
    <Routes>
      <Route path="/media/:id" element={<MediaDetailPage />} />
    </Routes>,
    { route: '/media/00000000-0000-4000-8000-0000000000aa' },
  )

// Importé après `vi.mock` pour que l'écran voie bien le module simulé.
const { default: MediaDetailPage } = await import('./MediaDetail')

describe('MediaDetail — la fiche', () => {
  it('affiche le titre de l’œuvre et le panneau de suivi', async () => {
    fetchMediaDetail.mockResolvedValue(FILM)
    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Matrix' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Statut' })).toBeInTheDocument()
  })

  /**
   * Le cas qui compte autant que le cas passant : une fiche qui échoue doit
   * **dire** qu'elle échoue. Le message vient du serveur, on ne le réécrit pas.
   */
  it('affiche le message du serveur quand la fiche est introuvable', async () => {
    fetchMediaDetail.mockRejectedValue(
      new ApiError({ code: 'NOT_FOUND', message: 'Cette œuvre n’existe pas.', retryable: false }, 404),
    )
    renderDetail()

    await waitFor(() =>
      expect(screen.getByText('Cette œuvre n’existe pas.')).toBeInTheDocument(),
    )
  })
})
