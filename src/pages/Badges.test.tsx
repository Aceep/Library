import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import type { AwardedBadge, QuestSummary, UserDetail } from '../api/schema'
import { ACCOUNT, ADMIN_SESSION, renderWithProviders } from '../test/render'

const fetchUser = vi.fn()
const fetchQuests = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchUser: (...args: unknown[]) => fetchUser(...args),
  fetchQuests: (...args: unknown[]) => fetchQuests(...args),
}))

const { default: Badges } = await import('./Badges')

const QUEST_A = '00000000-0000-4000-8000-0000000000a1'
const QUEST_B = '00000000-0000-4000-8000-0000000000a2'
const BADGE_A = '00000000-0000-4000-8000-0000000000b1'
const BADGE_B = '00000000-0000-4000-8000-0000000000b2'

const badge = (id: string, name: string, questId: string | null) => ({
  id,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  description: null,
  icon: '🏅',
  color: '#B07D2B',
  kind: 'quest',
  quest_id: questId,
})

const awarded = (id: string, name: string, questId: string | null, at: string) =>
  ({ ...badge(id, name, questId), awarded_at: at }) as unknown as AwardedBadge

const profil = (badges: AwardedBadge[]) =>
  ({
    user: ACCOUNT,
    joined_at: '2026-01-01T00:00:00.000Z',
    tracked_count: 0,
    following_count: 0,
    followers_count: 0,
    followed_by_me: false,
    counts: { by_type: {}, by_status: { todo: 0, doing: 0, done: 0 } },
    showcase: [],
    badges,
  }) as unknown as UserDetail

const quete = (
  id: string,
  title: string,
  badgeId: string,
  progress: { done: number; required: number },
  status: 'draft' | 'published' = 'published',
) =>
  ({
    id,
    title,
    description: null,
    status,
    threshold: null,
    due_at: null,
    published_at: status === 'published' ? '2026-07-01T00:00:00.000Z' : null,
    created_at: '2026-07-01T00:00:00.000Z',
    item_count: progress.required,
    progress: { ...progress, total: progress.required, completed: false, completed_at: null },
    badge: badge(badgeId, `Badge de ${title}`, id),
  }) as unknown as QuestSummary

const render = (session?: typeof ADMIN_SESSION) =>
  renderWithProviders(<Badges />, { route: '/badges', session })

describe('Badges — les miens, et ce qu’il reste', () => {
  it('date chaque badge obtenu', async () => {
    fetchUser.mockResolvedValue(profil([awarded(BADGE_A, 'Cinéphile', QUEST_A, '2026-07-12T00:00:00.000Z')]))
    fetchQuests.mockResolvedValue({ items: [] })
    render()

    expect(await screen.findByText('Cinéphile')).toBeInTheDocument()
    expect(screen.getByText('Obtenu le 12 juillet 2026')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '1 badge' })).toBeInTheDocument()
  })

  /**
   * Le nœud de l'écran : les deux sources ne se recoupent nulle part côté
   * serveur. Un badge déjà obtenu ne doit pas reparaître dans « à obtenir »
   * sous prétexte que sa quête est toujours publiée.
   */
  it('ne recompte pas un badge déjà obtenu quand sa quête reste publiée', async () => {
    fetchUser.mockResolvedValue(profil([awarded(BADGE_A, 'Cinéphile', QUEST_A, '2026-07-12T00:00:00.000Z')]))
    fetchQuests.mockResolvedValue({
      items: [
        quete(QUEST_A, 'Trois films', BADGE_A, { done: 3, required: 3 }),
        quete(QUEST_B, 'Trois livres', BADGE_B, { done: 1, required: 3 }),
      ],
    })
    render()

    await screen.findByText('Cinéphile')
    expect(screen.getByRole('heading', { name: 'À obtenir' })).toBeInTheDocument()
    expect(screen.getByText(/Trois livres — 1 sur 3/)).toBeInTheDocument()
    // Un seul « obtenu » : celui du haut. La quête achevée n'en rajoute pas.
    expect(screen.getAllByText('obtenu')).toHaveLength(1)
  })

  it('range le plus proche en tête', async () => {
    fetchUser.mockResolvedValue(profil([]))
    fetchQuests.mockResolvedValue({
      items: [
        quete(QUEST_A, 'Loin', BADGE_A, { done: 0, required: 5 }),
        quete(QUEST_B, 'Presque', BADGE_B, { done: 4, required: 5 }),
      ],
    })
    render()

    const notes = await screen.findAllByText(/sur 5/)
    expect(notes[0]).toHaveTextContent('Presque — 4 sur 5')
  })

  /**
   * Un brouillon n'est visible que des administrateurs et sa publication
   * notifiera tout le monde : le promettre ici dévoilerait une quête qui
   * n'existe pas encore. Il est donc écarté — et dit, sinon un administrateur
   * croirait à un badge perdu en route.
   */
  it('écarte les brouillons, et le dit à l’administrateur', async () => {
    fetchUser.mockResolvedValue(profil([]))
    fetchQuests.mockResolvedValue({
      items: [quete(QUEST_A, 'Pas encore prête', BADGE_A, { done: 0, required: 3 }, 'draft')],
    })
    render(ADMIN_SESSION)

    expect(await screen.findByText(/en brouillon ne décerne encore rien/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'À obtenir' })).not.toBeInTheDocument()
  })

  it('ne parle pas de brouillons à qui ne les voit pas', async () => {
    fetchUser.mockResolvedValue(profil([]))
    fetchQuests.mockResolvedValue({ items: [] })
    render()

    expect(await screen.findByText('Aucun badge pour l’instant')).toBeInTheDocument()
    expect(screen.queryByText(/brouillon/)).not.toBeInTheDocument()
  })

  it('renvoie chaque badge vers la quête qui le décerne', async () => {
    fetchUser.mockResolvedValue(profil([awarded(BADGE_A, 'Cinéphile', QUEST_A, '2026-07-12T00:00:00.000Z')]))
    fetchQuests.mockResolvedValue({ items: [] })
    render()

    expect(await screen.findByRole('link', { name: /Cinéphile/ })).toHaveAttribute(
      'href',
      `/quetes/${QUEST_A}`,
    )
  })

  /** `milestone` n'existe pas encore côté serveur, mais le contrat le prévoit. */
  it('n’invente pas de lien pour un badge sans quête', async () => {
    fetchUser.mockResolvedValue(profil([awarded(BADGE_A, 'Cent films', null, '2026-07-12T00:00:00.000Z')]))
    fetchQuests.mockResolvedValue({ items: [] })
    render()

    expect(await screen.findByText('Cent films')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Cent films/ })).not.toBeInTheDocument()
  })
})
