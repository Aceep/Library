import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, within } from '@testing-library/react'
import type { LibraryItem, MediaType } from '../api/schema'
import { renderWithProviders, tracking } from '../test/render'

const fetchLibraryPage = vi.fn()
vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchLibraryPage: (...args: unknown[]) => fetchLibraryPage(...args),
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

/** Une réponse d'une seule page : `pages` renseigné, `next_cursor` nul. */
const uneSeulePage = (items: LibraryItem[]) => ({
  items,
  next_cursor: null,
  pages: { page: 1, size: 40, total: items.length, pages: items.length === 0 ? 0 : 1 },
})

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
    fetchLibraryPage.mockResolvedValue(uneSeulePage([item('movie', 'Matrix')]))
    renderShelf('movie')

    expect(await screen.findByRole('heading', { name: 'Films' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Matrix/ })).toBeInTheDocument()
  })

  /**
   * Le rayon de musique existe — c'était une page « bientôt » jusqu'à l'étape
   * 11 — et ses filtres ne proposent pas un statut que le back refuse.
   */
  it('sert la musique comme un rayon ordinaire, sans filtre « en cours »', async () => {
    fetchLibraryPage.mockResolvedValue(uneSeulePage([item('music', 'Kind of Blue')]))
    renderShelf('music')

    expect(await screen.findByRole('heading', { name: 'Musique' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Kind of Blue/ })).toBeInTheDocument()
    expect(filters()).toEqual(['Tout', 'À écouter', 'Écouté'])
  })

  it('propose les trois statuts sur les rayons ordinaires', async () => {
    fetchLibraryPage.mockResolvedValue(uneSeulePage([]))
    renderShelf('book')

    expect(await screen.findByRole('heading', { name: 'Livres' })).toBeInTheDocument()
    expect(filters()).toEqual(['Tout', 'À lire', 'En cours de lecture', 'Lu'])
  })
})
