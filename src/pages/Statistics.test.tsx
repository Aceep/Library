import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import type { StatsResponse } from '../api/schema'
import { ACCOUNT, renderWithProviders } from '../test/render'

const fetchStats = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchStats: (...args: unknown[]) => fetchStats(...args),
}))

const { default: Statistics } = await import('./Statistics')

const quantity = (
  value: number,
  unit: 'pages' | 'minutes' | 'hours',
  counted: number,
  missing: number,
  basis: 'measured' | 'estimated' = 'measured',
  note: string | null = null,
) => ({ value, unit, basis, coverage: { counted, missing }, note })

const totals = (over: Record<string, unknown> = {}) => ({
  from: '2026-01-01',
  to: '2026-08-05',
  counts: {
    finished: 13,
    finished_by_type: { book: 4, comic_series: 0, movie: 8, tv: 1, game: 0, music: 0 },
    rereads: 2,
    episodes_watched: 75,
    volumes_read: 30,
    volumes_with_estimated_date: 30,
    albums_listened: 0,
  },
  quantities: {
    pages_read: quantity(1232, 'pages', 4, 0),
    movie_minutes: quantity(952, 'minutes', 8, 0),
    tv_minutes: quantity(3150, 'minutes', 75, 0),
    album_minutes: quantity(0, 'minutes', 0, 0),
    game_hours: quantity(0, 'hours', 0, 0, 'estimated', 'Durée déclarée par IGDB.'),
  },
  ...over,
})

const stats = (over: Record<string, unknown> = {}): StatsResponse =>
  ({
    dashboard: {
      scope: {
        user: ACCOUNT,
        timezone: 'Europe/Paris',
        week_starts_on: 'monday',
        generated_at: '2026-08-05T16:11:33.634Z',
      },
      periods: {
        week: totals({ from: '2026-08-03' }),
        month: totals({ from: '2026-08-01' }),
        year: totals(),
        all: totals({ from: null }),
      },
      highlights: {
        top_authors: [
          { label: 'Miriam Kessler', count: 3 },
          { label: 'Paul Ferrand', count: 1 },
        ],
        top_directors: [],
        top_creators: [],
        top_genres: [],
        busiest_month: { month: '2026-07', count: 4 },
        ratings: {
          distribution: [{ rating: 9, count: 6 }],
          average: 8.4,
          coverage: { counted: 14, missing: 30 },
        },
      },
      ...over,
    },
    comparison: null,
  }) as unknown as StatsResponse

const render = (route = '/statistiques') =>
  renderWithProviders(<Statistics />, { route })

describe('Statistiques — des chiffres auxquels on peut se fier', () => {
  // Le compteur d'appels est une assertion de ce fichier : sans remise à
  // zéro, il porterait sur toute la suite.
  beforeEach(() => fetchStats.mockClear())

  it('rend chaque grandeur avec sa couverture, jamais la valeur seule', async () => {
    fetchStats.mockResolvedValue(stats())
    render()

    expect(await screen.findByText('1 232')).toBeInTheDocument()
    expect(screen.getByText('Sur 4 livres terminés, aucun écarté.')).toBeInTheDocument()
    // Autant de phrases de couverture que de grandeurs : aucune ne passe nue.
    expect(screen.getAllByText(/^(Sur \d|Aucun |On ne sait pas)/)).toHaveLength(6)
  })

  /**
   * La moyenne d'alice repose sur 14 entrées de journal alors que 30 n'ont pas
   * de note. Un « 8,4 » en gros caractères mentirait autant qu'un total de
   * pages amputé — c'est la même règle, appliquée à autre chose qu'une
   * grandeur.
   */
  it('soumet la moyenne des notes à la même règle', async () => {
    fetchStats.mockResolvedValue(stats())
    render()

    expect(await screen.findByText('8,4')).toBeInTheDocument()
    expect(screen.getByText('Sur 14 entrées notées, 30 sans note.')).toBeInTheDocument()
  })

  it('met les minutes en heures sans rien inventer', async () => {
    fetchStats.mockResolvedValue(stats())
    render()

    // 3 150 minutes d'épisodes cochés, et 952 de films.
    expect(await screen.findByText('52 h 30')).toBeInTheDocument()
    expect(screen.getByText('15 h 52')).toBeInTheDocument()
  })

  it('tient l’estimation IGDB à l’écart des mesures', async () => {
    fetchStats.mockResolvedValue(stats())
    render()

    expect(await screen.findByRole('heading', { name: 'Estimé' })).toBeInTheDocument()
    expect(screen.getByText('estimation')).toBeInTheDocument()
    expect(screen.getByText('Durée déclarée par IGDB.')).toBeInTheDocument()
    expect(screen.getByText(/ne s’additionnent à rien/)).toBeInTheDocument()
  })

  /**
   * Les 30 tomes ont tous une date devinée : le décompte est exact, sa place
   * dans la semaine ne l'est pas. Sur « depuis toujours », la date ne décide de
   * rien et la mention n'aurait aucun sens.
   */
  it('avertit que la place des tomes dans la période est approximative', async () => {
    fetchStats.mockResolvedValue(stats())
    render()

    fireEvent.click(await screen.findByRole('button', { name: 'Cette semaine' }))
    expect(screen.getByText(/dont 30 à date estimée/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Depuis toujours' }))
    expect(screen.queryByText(/à date estimée/)).not.toBeInTheDocument()
  })

  it('change de période sans redemander à l’API', async () => {
    fetchStats.mockResolvedValue(stats())
    render()

    await screen.findByText('1 232')
    fireEvent.click(screen.getByRole('button', { name: 'Cette semaine' }))

    expect(screen.getByRole('button', { name: 'Cette semaine' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // Les quatre périodes viennent dans la même réponse : rien à recharger.
    expect(fetchStats).toHaveBeenCalledTimes(1)
  })

  it('dit que les palmarès ne suivent pas la période', async () => {
    fetchStats.mockResolvedValue(stats())
    render()

    expect(
      await screen.findByText(/ne suivent pas la période choisie plus haut/),
    ).toBeInTheDocument()
  })

  it('annonce le fuseau et le début de semaine qui ont servi', async () => {
    fetchStats.mockResolvedValue(stats())
    render()

    expect(await screen.findByText(/Semaines du lundi/)).toBeInTheDocument()
    expect(screen.getByText(/Europe\/Paris/)).toBeInTheDocument()
  })

  it('lit le tableau de bord d’un autre membre quand on le demande', async () => {
    fetchStats.mockResolvedValue(stats())
    render(`/statistiques?membre=${ACCOUNT.id}`)

    await screen.findByText('1 232')
    expect(fetchStats).toHaveBeenCalledWith(ACCOUNT.id, expect.anything())
  })

  it('se tait sur les notes quand il n’y en a aucune', async () => {
    fetchStats.mockResolvedValue(
      stats({
        highlights: {
          top_authors: [],
          top_directors: [],
          top_creators: [],
          top_genres: [],
          busiest_month: null,
          ratings: { distribution: [], average: null, coverage: { counted: 0, missing: 0 } },
        },
      }),
    )
    render()

    expect(await screen.findByText('Aucune note posée pour l’instant.')).toBeInTheDocument()
    expect(screen.queryByText(/entrées notées/)).not.toBeInTheDocument()
    expect(screen.getAllByText('Rien à classer pour l’instant.')).toHaveLength(4)
  })
})
