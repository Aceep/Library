import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, within } from '@testing-library/react'
import type { LibraryItem, MediaType } from '../api/schema'
import { renderWithProviders, tracking } from '../test/render'

const fetchLibrary = vi.fn()
vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchLibrary: (...args: unknown[]) => fetchLibrary(...args),
}))

const item = (type: MediaType, title: string) =>
  ({
    id: `00000000-0000-4000-8000-00000000${type.length}${title.length}a`,
    type,
    source: type === 'music' ? 'musicbrainz' : 'tmdb',
    external_id: 'x',
    title,
    cover_url: null,
    release_date: null,
    year: 2001,
    tracking: {
      me: tracking(),
      following: [],
      others: { count: 0, average_rating: null, favorites: 0 },
    },
    progress: null,
  }) as unknown as LibraryItem

const { default: TypeLibrary } = await import('./TypeLibrary')

const renderShelf = (type: MediaType) =>
  renderWithProviders(
    <Routes>
      <Route path="/bibliotheque/:type" element={<TypeLibrary />} />
    </Routes>,
    { route: `/bibliotheque/${type}` },
  )

const filters = () =>
  within(screen.getByRole('group', { name: 'Filtrer par statut' }))
    .getAllByRole('button')
    .map((button) => button.textContent)

describe('TypeLibrary — le rayon', () => {
  it('titre le rayon et liste ce que l’API renvoie', async () => {
    fetchLibrary.mockResolvedValue({ items: [item('movie', 'Matrix')], next_cursor: null })
    renderShelf('movie')

    expect(await screen.findByRole('heading', { name: 'Films' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Matrix/ })).toBeInTheDocument()
  })

  /**
   * Le rayon de musique existe — c'était une page « bientôt » jusqu'à l'étape
   * 11 — et ses filtres ne proposent pas un statut que le back refuse.
   */
  it('sert la musique comme un rayon ordinaire, sans filtre « en cours »', async () => {
    fetchLibrary.mockResolvedValue({ items: [item('music', 'Kind of Blue')], next_cursor: null })
    renderShelf('music')

    expect(await screen.findByRole('heading', { name: 'Musique' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Kind of Blue/ })).toBeInTheDocument()
    expect(filters()).toEqual(['Tout', 'À écouter', 'Écouté'])
  })

  it('propose les trois statuts sur les rayons ordinaires', async () => {
    fetchLibrary.mockResolvedValue({ items: [], next_cursor: null })
    renderShelf('book')

    expect(await screen.findByRole('heading', { name: 'Livres' })).toBeInTheDocument()
    expect(filters()).toEqual(['Tout', 'À lire', 'En cours de lecture', 'Lu'])
  })
})
