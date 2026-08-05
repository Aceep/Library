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
   * L'écran le plus partagé du dépôt, et celui que l'étape 3 vient rouvrir.
   * La section n'apparaît que s'il y a une saga — la plupart des œuvres n'en
   * ont aucune, et un intitulé vide se lirait comme un manque.
   */
  it('ne montre aucune section « saga » quand l’œuvre n’en a pas', async () => {
    fetchMediaDetail.mockResolvedValue(FILM)
    renderDetail()

    await screen.findByRole('heading', { name: 'Matrix' })
    expect(screen.queryByRole('heading', { name: /^Sagas?$/ })).not.toBeInTheDocument()
  })

  it('annonce la saga et ce qui lui manque, sans quitter la fiche', async () => {
    fetchMediaDetail.mockResolvedValue({
      ...FILM,
      sagas: [
        {
          id: '00000000-0000-4000-8000-0000000000c1',
          title: 'The Matrix — la trilogie',
          source: 'tmdb',
          part_count: 3,
          in_library_count: 1,
          watched: false,
        },
      ],
    })
    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Saga' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'The Matrix — la trilogie' })).toHaveAttribute(
      'href',
      '/sagas/00000000-0000-4000-8000-0000000000c1',
    )
    // Les deux nombres sont dits séparément : « 1 partie » effacerait ce que
    // la veille est là pour surveiller.
    expect(screen.getByText('3 parties, dont 2 pas encore dans la médiathèque')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Surveiller' })).toBeInTheDocument()
  })

  /**
   * La veille ne concerne que ce qui peut gagner du contenu. Un film ne
   * sortira pas une deuxième fois — c'est sa saga qu'on surveille.
   */
  it('n’offre pas de veille sur un film', async () => {
    fetchMediaDetail.mockResolvedValue(FILM)
    renderDetail()

    await screen.findByRole('heading', { name: 'Matrix' })
    expect(screen.queryByRole('heading', { name: 'Veille' })).not.toBeInTheDocument()
  })

  it('offre la veille sur une série, hors du panneau de suivi', async () => {
    fetchMediaDetail.mockResolvedValue({
      ...FILM,
      type: 'tv',
      title: 'Severance',
      watched: false,
      seasons: [],
    })
    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Veille' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Surveiller' })).toBeInTheDocument()
    // La confusion la plus facile à faire, fermée en toutes lettres.
    expect(screen.getByText(/Sans rapport avec ton suivi/)).toBeInTheDocument()
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
