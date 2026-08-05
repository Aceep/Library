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
        top_genres: [
          { label: 'Roman', count: 4 },
          { label: 'Drame', count: 3 },
        ],
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
    expect(fetchStats).toHaveBeenCalledWith(ACCOUNT.id, null, expect.anything())
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

/**
 * La comparaison.
 *
 * Les valeurs viennent de l'instance réelle, et elles disent pourquoi cet écran
 * est fait ainsi : alice a lu 1 232 pages sur 4 livres, bob 344 sur 1 seul. En
 * pages brutes alice l'emporte largement ; **par livre, c'est bob** — 344 contre
 * 308. Les deux lectures pointent en sens inverse, et seule la seconde survit à
 * l'écart de volume.
 */
const BOB = {
  id: '00000000-0000-4000-8000-0000000000b0',
  pseudo: 'bob',
  avatar_url: null,
  identity_color: '#3A7CA5',
  role: 'user',
  deactivated: false,
}

const totalsBob = () =>
  totals({
    counts: {
      finished: 8,
      finished_by_type: { book: 1, comic_series: 0, movie: 6, tv: 1, game: 0, music: 0 },
      rereads: 0,
      episodes_watched: 20,
      volumes_read: 0,
      volumes_with_estimated_date: 0,
      albums_listened: 0,
    },
    quantities: {
      pages_read: quantity(344, 'pages', 1, 0),
      movie_minutes: quantity(733, 'minutes', 6, 0),
      tv_minutes: quantity(900, 'minutes', 20, 0),
      album_minutes: quantity(0, 'minutes', 0, 0),
      game_hours: quantity(0, 'hours', 0, 0, 'estimated', 'Durée déclarée par IGDB.'),
    },
  })

const avecComparaison = (): StatsResponse => {
  const base = stats()
  return {
    ...base,
    comparison: {
      scope: { ...base.dashboard.scope, user: BOB },
      periods: {
        week: totalsBob(),
        month: totalsBob(),
        year: totalsBob(),
        all: totalsBob(),
      },
      highlights: {
        top_authors: [],
        top_directors: [],
        top_creators: [],
        top_genres: [
          { label: 'Drame', count: 3 },
          { label: 'Comédie', count: 2 },
        ],
        busiest_month: null,
        ratings: {
          distribution: [{ rating: 7, count: 4 }],
          average: 6.9,
          coverage: { counted: 8, missing: 30 },
        },
      },
    },
  } as unknown as StatsResponse
}

describe('Statistiques — la comparaison', () => {
  beforeEach(() => fetchStats.mockClear())

  it('nomme les deux membres à côté de leur couleur, jamais la couleur seule', async () => {
    fetchStats.mockResolvedValue(avecComparaison())
    render()

    // Chaque duel écrit les deux pseudos : un écran en noir et blanc dit la
    // même chose que l'écran en couleurs.
    expect((await screen.findAllByText('Alice')).length).toBeGreaterThan(1)
    expect(screen.getAllByText('bob').length).toBeGreaterThan(1)
  })

  /**
   * Le cœur de l'écran. Le classement brut et le classement par œuvre sont
   * **inverses** ici, et c'est le second qui a du sens : alice a lu plus de
   * pages, bob lit des livres plus longs.
   */
  it('rapporte les grandeurs à l’œuvre comptée, pas au total', async () => {
    fetchStats.mockResolvedValue(avecComparaison())
    render()

    // 1 232 / 4 = 308 ; 344 / 1 = 344.
    expect(await screen.findByText('308 pages')).toBeInTheDocument()
    expect(screen.getByText('344 pages')).toBeInTheDocument()
    // Et le total brut, celui qui induirait en erreur, n'est pas affiché ici.
    expect(screen.queryByText('1 232 pages')).not.toBeInTheDocument()
  })

  it('exprime la répartition en parts du total de chacun', async () => {
    fetchStats.mockResolvedValue(avecComparaison())
    render()

    // 8 films sur 13 pour l'une, 6 sur 8 pour l'autre — deux volumes
    // différents, deux parts qui restent comparables.
    expect(await screen.findByText('62 %')).toBeInTheDocument()
    expect(screen.getByText('75 %')).toBeInTheDocument()
    expect(screen.getByText('8 sur 13')).toBeInTheDocument()
    expect(screen.getByText('6 sur 8')).toBeInTheDocument()
  })

  it('porte la couverture des deux côtés', async () => {
    fetchStats.mockResolvedValue(avecComparaison())
    render()

    expect(await screen.findByText('sur 4 livres terminés')).toBeInTheDocument()
    expect(screen.getByText('sur 1 livre terminé')).toBeInTheDocument()
  })

  /**
   * La règle demandée : un écart entre deux valeurs de couvertures différentes
   * ne se calcule pas. Ici il ne s'en calcule **aucun**, quelle que soit la
   * couverture — imprimer une différence, c'est affirmer qu'elle veut dire
   * quelque chose.
   */
  it('ne calcule aucune différence', async () => {
    fetchStats.mockResolvedValue(avecComparaison())
    render()

    await screen.findByText('308 pages')
    expect(screen.queryByText(/de plus/)).not.toBeInTheDocument()
    expect(screen.queryByText(/d’écart|d'écart/)).not.toBeInTheDocument()
    // 14 − 8 = 6 : le nombre ne doit apparaître nulle part comme un écart.
    expect(screen.getByText(/pas l’une moins l’autre/)).toBeInTheDocument()
  })

  it('met les moyennes de notes côte à côte, avec leurs assiettes', async () => {
    fetchStats.mockResolvedValue(avecComparaison())
    render()

    expect(await screen.findByText('8,4')).toBeInTheDocument()
    expect(screen.getByText('6,9')).toBeInTheDocument()
    expect(screen.getByText('sur 14 entrées notées, 30 sans note')).toBeInTheDocument()
    expect(screen.getByText('sur 8 entrées notées, 30 sans note')).toBeInTheDocument()
  })

  /**
   * Les palmarès sont tronqués : dire « leurs goûts communs » serait faux, et
   * la phrase qui accompagne la liste le dit exactement.
   */
  it('ne présente les genres communs que comme une intersection de palmarès', async () => {
    fetchStats.mockResolvedValue(avecComparaison())
    render()

    // « Drame » est dans les deux palmarès ; « Roman » n'est que dans l'un.
    const communs = await screen.findByRole('heading', { name: 'En commun' })
    expect(communs).toBeInTheDocument()
    expect(screen.getByText('Drame')).toBeInTheDocument()
    expect(screen.getByText(/les palmarès ne gardent que les premiers/)).toBeInTheDocument()
  })

  it('ne montre pas la vue solo quand une comparaison est en cours', async () => {
    fetchStats.mockResolvedValue(avecComparaison())
    render()

    await screen.findByText('308 pages')
    expect(screen.queryByRole('heading', { name: 'Estimé' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mesuré' })).not.toBeInTheDocument()
  })
})
