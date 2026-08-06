import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import type { HomeResponse, MediaType, QuestSummary, WatchItem } from '../api/schema'
import { ACCOUNT, media, renderWithProviders, tracking } from '../test/render'

/**
 * L'accueil.
 *
 * Cet écran n'avait aucun test, et c'est précisément ce qui a permis à deux
 * blocs entièrement inventés — un bandeau de « quête du jour » signé « K.B. »,
 * trois fausses annonces d'auteurs — d'y rester pendant tout le développement :
 * rien n'échouait, puisque rien ne regardait. Les tests ci-dessous vérifient
 * donc d'abord **que ce qui s'affiche vient du serveur**, avant toute question
 * de mise en page.
 */

const fetchHome = vi.fn()
const fetchQuests = vi.fn()
const fetchWatches = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchHome: (...args: unknown[]) => fetchHome(...args),
  fetchQuests: (...args: unknown[]) => fetchQuests(...args),
  fetchWatches: (...args: unknown[]) => fetchWatches(...args),
}))

const { default: Dashboard, queteEnAvant } = await import('./Dashboard')

// --- de quoi composer des réponses --------------------------------------------

const SEAUX_VIDES = {
  book: [],
  comic_series: [],
  game: [],
  movie: [],
  music: [],
  tv: [],
}

const home = (over: Partial<HomeResponse> = {}): HomeResponse =>
  ({
    in_progress: SEAUX_VIDES,
    feed: [],
    following_count: 0,
    ...over,
  }) as unknown as HomeResponse

const enCours = (titre: string, coverUrl: string | null, type: MediaType = 'movie') => ({
  media: media({ title: titre, cover_url: coverUrl, type }),
  tracking: tracking({ status: 'doing' }),
  progress: null,
  next_up: null,
})

const quete = (over: Partial<QuestSummary> = {}): QuestSummary =>
  ({
    id: 'q1',
    title: 'Une quête',
    description: null,
    status: 'published',
    threshold: null,
    due_at: null,
    published_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    progress: { done: 0, total: 3, required: 3, completed: false, completed_at: null },
    badge: {
      id: 'b1',
      slug: 'quete-0001',
      name: 'Le badge',
      description: null,
      icon: '🎯',
      color: '#F18F01',
      kind: 'quest',
      quest_id: 'q1',
    },
    item_count: 3,
    ...over,
  }) as unknown as QuestSummary

const veille = (titre: string, over: Partial<WatchItem> = {}): WatchItem =>
  ({
    id: `w-${titre}`,
    target: 'media',
    since: '2026-05-27T18:24:24.002Z',
    created_at: '2026-08-05T18:24:24.005Z',
    media: media({ title: titre, type: 'tv', cover_url: null }),
    saga: null,
    next_check_at: '2026-08-07T18:24:24.002Z',
    ...over,
  }) as unknown as WatchItem

/** Les trois requêtes de l'écran, servies d'un coup. */
const monter = ({
  homeData = home(),
  quetes = [] as QuestSummary[],
  veilles = [] as WatchItem[],
}: {
  homeData?: HomeResponse
  quetes?: QuestSummary[]
  veilles?: WatchItem[]
} = {}) => {
  fetchHome.mockResolvedValue(homeData)
  fetchQuests.mockResolvedValue({ items: quetes, next_cursor: null })
  fetchWatches.mockResolvedValue({ items: veilles, next_cursor: null })
  return renderWithProviders(<Dashboard />)
}

// --- ce qui a disparu ----------------------------------------------------------

describe('l’accueil ne montre plus de contenu inventé', () => {
  it('ne parle plus de signatures que rien ne peut servir', async () => {
    monter({ veilles: [veille('Crime Story')] })
    await screen.findByRole('heading', { name: /surveilles/i })

    // Les trois entrées de la maquette : des annonces sur des personnes réelles
    // qu'aucune route ne pouvait produire — l'API suit des membres et surveille
    // des œuvres, jamais des auteurs.
    for (const invente of ['Ted Chiang', 'Sciamma', 'Godspeed', 'suivi par']) {
      expect(screen.queryByText(new RegExp(invente, 'i'))).toBeNull()
    }
  })

  it('ne montre plus la quête en dur ni son cadre de jaquette vide', async () => {
    monter({ quetes: [quete({ title: 'Trois séries à rattraper' })] })
    await screen.findByRole('heading', { level: 1, name: /Trois séries/ })

    for (const invente of ['K.B.', 'Nº 214', 'une seule par jour', 'jaquette · 2:3']) {
      expect(screen.queryByText(new RegExp(invente.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')))
        .toBeNull()
    }
  })
})

// --- les jaquettes -------------------------------------------------------------

describe('les œuvres en cours', () => {
  it('affiche la jaquette que /home envoie', async () => {
    // La régression d'origine : `cover_url` arrivait et la tuile dessinait un
    // cadre vide. L'accueil était le seul écran du dépôt dans ce cas.
    const { container } = monter({
      homeData: home({
        in_progress: {
          ...SEAUX_VIDES,
          movie: [enCours('La Dune', 'http://api.test/covers/dune-thumb.webp')],
        },
      } as Partial<HomeResponse>),
    })

    await screen.findByText('La Dune')
    // `alt=""` : la jaquette est décorative, le titre est juste à côté. Elle
    // porte donc le rôle `presentation` et non `img` — on la cherche par la
    // balise, ce qui est bien ce qu'on veut éprouver ici.
    const image = container.querySelector('img')
    expect(image?.getAttribute('src')).toContain('dune-thumb.webp')
  })

  it('retombe sur le titre composé quand l’œuvre n’a pas de jaquette', async () => {
    const { container } = monter({
      homeData: home({
        in_progress: { ...SEAUX_VIDES, book: [enCours('Sans image', null, 'book')] },
      } as Partial<HomeResponse>),
    })

    // Pas d'image cassée : `Cover` compose le titre dans le cadre. Le cas est
    // le plus fréquent, `cover_url` étant nul sur la majorité des œuvres.
    //
    // Le titre apparaît alors deux fois — dans le repli et sous la tuile — et
    // c'est la convention du dépôt : `MediaCard` fait exactement pareil, le
    // repli étant une notice de catalogue, pas une légende.
    await screen.findAllByText('Sans image')
    expect(screen.getAllByText('Sans image')).toHaveLength(2)
    expect(container.querySelector('img')).toBeNull()
  })
})

// --- la veille -----------------------------------------------------------------

describe('la veille', () => {
  it('montre ce que l’API surveille vraiment, trois au plus', async () => {
    monter({ veilles: ['Un', 'Deux', 'Trois', 'Quatre'].map((titre) => veille(titre)) })

    await screen.findByRole('link', { name: 'Un' })
    expect(screen.getByRole('link', { name: 'Trois' })).toBeInTheDocument()
    // L'accueil annonce, il ne remplace pas l'écran de veille.
    expect(screen.queryByRole('link', { name: 'Quatre' })).toBeNull()
    expect(screen.getByRole('link', { name: /Toute la veille/ })).toBeInTheDocument()
  })

  it('dit la même chose que l’écran de veille sur le repère', async () => {
    monter({ veilles: [veille('Crime Story')] })
    // « Rien de paru avant ne notifie » est ce qui explique qu'une série reprise
    // ne déverse pas deux ans d'épisodes. Les deux écrans doivent le dire.
    expect(await screen.findByText(/surveillée depuis le 27 mai 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Prochaine vérification le 7 août 2026/)).toBeInTheDocument()
  })

  it('ne fait pas tomber l’accueil quand elle échoue', async () => {
    fetchHome.mockResolvedValue(home())
    fetchQuests.mockResolvedValue({ items: [], next_cursor: null })
    fetchWatches.mockRejectedValue(new Error('réseau'))
    renderWithProviders(<Dashboard />)

    // Un bloc secondaire qui échoue le dit à sa place ; les traces et les
    // murmures restent à l'écran.
    expect(await screen.findByText(/La veille n’a pas pu être chargée/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /murmures/i })).toBeInTheDocument()
  })
})

// --- le choix de la quête mise en avant -----------------------------------------

describe('queteEnAvant — laquelle mérite le bandeau', () => {
  it('écarte les quêtes achevées et les brouillons', () => {
    const achevee = quete({
      id: 'finie',
      progress: { done: 3, total: 3, required: 3, completed: true, completed_at: '2026-02-01' },
    })
    const brouillon = quete({ id: 'brouillon', status: 'draft' })
    // Rien à faire sur une quête finie, et un brouillon n'existe pas pour le
    // membre : le bandeau appelle à agir, il ne peut pointer ni l'un ni l'autre.
    expect(queteEnAvant([achevee, brouillon])).toBeNull()
  })

  it('met l’échéance devant tout le reste', () => {
    const presqueFinie = quete({ id: 'presque', progress: { done: 2, total: 3, required: 3, completed: false, completed_at: null } })
    const datee = quete({ id: 'datee', due_at: '2026-10-03' })
    // C'est la seule contrainte que le membre ne s'est pas donnée lui-même.
    expect(queteEnAvant([presqueFinie, datee])?.id).toBe('datee')
  })

  it('choisit la plus proche échéance entre deux datées', () => {
    const tard = quete({ id: 'tard', due_at: '2026-12-01' })
    const tot = quete({ id: 'tot', due_at: '2026-09-01' })
    expect(queteEnAvant([tard, tot])?.id).toBe('tot')
  })

  it('sinon celle où il reste le moins à faire, seuil compris', () => {
    const loin = quete({ id: 'loin', progress: { done: 0, total: 5, required: 5, completed: false, completed_at: null } })
    // « Cinq suffisent sur sept » : il reste deux œuvres, pas quatre. C'est
    // `required` qui décide de l'achèvement, donc du reste.
    const seuil = quete({ id: 'seuil', threshold: 5, progress: { done: 3, total: 7, required: 5, completed: false, completed_at: null } })
    expect(queteEnAvant([loin, seuil])?.id).toBe('seuil')
  })

  it('départage à égalité par la plus récemment publiée', () => {
    const vieille = quete({ id: 'vieille', published_at: '2026-01-01T00:00:00.000Z' })
    const neuve = quete({ id: 'neuve', published_at: '2026-07-01T00:00:00.000Z' })
    expect(queteEnAvant([vieille, neuve])?.id).toBe('neuve')
  })
})

describe('le bandeau', () => {
  it('porte le titre, la progression et le badge de la vraie quête', async () => {
    monter({
      quetes: [
        quete({
          title: 'Le tour du monde en dix films',
          description: 'Dix pays, dix films.',
          item_count: 10,
          progress: { done: 4, total: 10, required: 10, completed: false, completed_at: null },
        }),
      ],
    })

    const banniere = await screen.findByRole('heading', { level: 1, name: /Le tour du monde/ })
    expect(banniere).toBeInTheDocument()
    expect(screen.getByText('Dix pays, dix films.')).toBeInTheDocument()
    expect(screen.getByText(/4 sur 10/)).toBeInTheDocument()
    // Le badge remplace le cadre 2:3 qui n'a jamais porté d'image : une quête
    // réunit plusieurs œuvres, aucune n'est *son* artwork.
    expect(screen.getByText('Le badge')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voir la quête/ }).getAttribute('href')).toBe('/quetes/q1')
  })

  it('annonce l’échéance quand il y en a une', async () => {
    monter({ quetes: [quete({ due_at: '2026-10-03' })] })
    expect(await screen.findByText(/à viser pour le 3 octobre 2026/)).toBeInTheDocument()
  })

  it('garde un h1 quand tout est achevé, sans appel à l’action sans objet', async () => {
    monter({
      quetes: [
        quete({ progress: { done: 3, total: 3, required: 3, completed: true, completed_at: '2026-02-01' } }),
      ],
    })

    const titre = await screen.findByRole('heading', { level: 1 })
    expect(titre.textContent).toMatch(/achevé toutes les quêtes/)
    expect(screen.queryByRole('link', { name: /Voir la quête\b/ })).toBeNull()
  })

  it('distingue « aucune quête publiée » de « toutes achevées »', async () => {
    monter({ quetes: [] })
    const titre = await screen.findByRole('heading', { level: 1 })
    expect(titre.textContent).toMatch(/Aucune quête proposée/)
  })
})

// --- le reste de l'écran, qui venait déjà du serveur ----------------------------

describe('les traces et les murmures', () => {
  const trace = (pseudo: string, review: string | null) => ({
    user: { ...ACCOUNT, id: `u-${pseudo}`, pseudo },
    kind: 'finished' as const,
    at: '2026-08-05T18:24:23.310Z',
    media: media({ title: `Œuvre de ${pseudo}` }),
    rating: 5,
    review,
  })

  it('ne cite que les traces qui portent un texte', async () => {
    monter({
      homeData: home({
        feed: [trace('salome', 'Un vrai choc.'), trace('octave', null)],
        following_count: 2,
      } as Partial<HomeResponse>),
    })

    // Un « terminé » sans texte n'a rien à citer : un cadre autour de rien.
    expect(await screen.findByText(/Un vrai choc/)).toBeInTheDocument()
    const murmures = screen.getByRole('heading', { name: /murmures/i }).closest('section, div')
    expect(within(murmures as HTMLElement).queryByText(/Œuvre de octave/)).toBeNull()
  })
})
