import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import type { WatchItem, WatchList } from '../api/schema'
import { media, renderWithProviders } from '../test/render'

const fetchWatches = vi.fn()
vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchWatches: (...args: unknown[]) => fetchWatches(...args),
}))

const { default: Watches } = await import('./Watches')

const surSerie = (over: Partial<WatchItem> = {}) =>
  ({
    id: '00000000-0000-4000-8000-0000000000d1',
    target: 'media',
    since: '2026-06-01T00:00:00.000Z',
    created_at: '2026-06-01T00:00:00.000Z',
    media: media({ id: '00000000-0000-4000-8000-0000000000aa', type: 'tv', title: 'Severance' }),
    saga: null,
    next_check_at: '2026-08-06T09:00:00.000Z',
    ...over,
  }) as unknown as WatchItem

const surSaga = () =>
  ({
    id: '00000000-0000-4000-8000-0000000000d2',
    target: 'saga',
    since: '2026-07-15T00:00:00.000Z',
    created_at: '2026-07-15T00:00:00.000Z',
    media: null,
    saga: { id: '00000000-0000-4000-8000-0000000000c1', title: 'Dune - Saga' },
    next_check_at: null,
  }) as unknown as WatchItem

const page = (items: WatchItem[]): WatchList =>
  ({ items, next_cursor: null }) as unknown as WatchList

describe('Watches — ce que je surveille', () => {
  it('mêle les œuvres et les sagas, et lie chacune au bon écran', async () => {
    fetchWatches.mockResolvedValue(page([surSerie(), surSaga()]))
    renderWithProviders(<Watches />)

    const lignes = await screen.findAllByRole('listitem')
    expect(within(lignes[0]).getByRole('link', { name: 'Severance' })).toHaveAttribute(
      'href',
      '/media/00000000-0000-4000-8000-0000000000aa',
    )
    expect(within(lignes[1]).getByRole('link', { name: 'Dune - Saga' })).toHaveAttribute(
      'href',
      '/sagas/00000000-0000-4000-8000-0000000000c1',
    )
  })

  /**
   * `since` seul ne veut rien dire pour qui lit. C'est lui qui explique
   * qu'une série reprise après deux ans ne déverse pas deux ans d'épisodes.
   */
  it('explique le repère plutôt que d’afficher une date brute', async () => {
    fetchWatches.mockResolvedValue(page([surSerie()]))
    renderWithProviders(<Watches />)

    expect(
      await screen.findByText(/Rien de paru avant le 1 juin 2026 ne t'a été annoncé/),
    ).toBeInTheDocument()
  })

  /** La réponse à « c'est sorti ce matin, pourquoi je n'ai rien ? ». */
  it('annonce la prochaine vérification quand elle est connue', async () => {
    fetchWatches.mockResolvedValue(page([surSerie()]))
    renderWithProviders(<Watches />)

    expect(await screen.findByText(/Prochaine vérification le 6 août 2026/)).toBeInTheDocument()
  })

  it('se tait sur la prochaine vérification quand elle est inconnue', async () => {
    fetchWatches.mockResolvedValue(page([surSaga()]))
    renderWithProviders(<Watches />)

    await screen.findByRole('link', { name: 'Dune - Saga' })
    expect(screen.queryByText(/Prochaine vérification/)).not.toBeInTheDocument()
  })

  /**
   * La veille n'a rien à voir avec le suivi ni la possession — c'est la
   * confusion la plus facile à faire, et l'écran doit la fermer.
   */
  it('dit que la veille est sans rapport avec la bibliothèque', async () => {
    fetchWatches.mockResolvedValue(page([surSerie()]))
    renderWithProviders(<Watches />)

    expect(await screen.findByText(/Sans rapport avec ta bibliothèque/)).toBeInTheDocument()
  })

  it('invite à surveiller quand la liste est vide', async () => {
    fetchWatches.mockResolvedValue(page([]))
    renderWithProviders(<Watches />)

    expect(await screen.findByText('Aucune veille')).toBeInTheDocument()
  })
})
