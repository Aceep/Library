import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { Quest as QuestShape, QuestResponse } from '../api/schema'
import { ADMIN_SESSION, media, renderWithProviders } from '../test/render'

const fetchQuest = vi.fn()
const addQuestItem = vi.fn()
const searchExternal = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchQuest: (...args: unknown[]) => fetchQuest(...args),
  addQuestItem: (...args: unknown[]) => addQuestItem(...args),
  searchExternal: (...args: unknown[]) => searchExternal(...args),
}))

const { default: Quest } = await import('./Quest')

const QUEST_ID = '00000000-0000-4000-8000-0000000000e1'

const item = (n: number, done: boolean) => ({
  position: n,
  media: media({ id: `00000000-0000-4000-8000-0000000000f${n}`, title: `Œuvre ${n}` }),
  done,
})

const quest = (over: Partial<QuestShape> = {}): QuestResponse =>
  ({
    quest: {
      id: QUEST_ID,
      title: 'Trois films pour commencer',
      description: 'Parce qu’il faut bien commencer quelque part.',
      status: 'published',
      threshold: null,
      due_at: null,
      published_at: '2026-07-01T00:00:00.000Z',
      created_at: '2026-07-01T00:00:00.000Z',
      progress: { done: 1, total: 3, required: 3, completed: false, completed_at: null },
      badge: {
        id: 'b1',
        slug: 'trois-films',
        name: 'Cinéphile débutant',
        description: null,
        icon: '🏅',
        color: '#B07D2B',
        kind: 'quest',
        quest_id: QUEST_ID,
      },
      items: [item(1, true), item(2, false), item(3, false)],
      standings: [],
      ...over,
    },
  }) as unknown as QuestResponse

const render = (session?: typeof ADMIN_SESSION) =>
  renderWithProviders(
    <Routes>
      <Route path="/quetes/:id" element={<Quest />} />
    </Routes>,
    { route: `/quetes/${QUEST_ID}`, session },
  )

describe('Quest — la fiche d’une quête', () => {
  it('annonce la progression et liste les œuvres', async () => {
    fetchQuest.mockResolvedValue(quest())
    render()

    expect(await screen.findByRole('heading', { name: 'Trois films pour commencer' })).toBeInTheDocument()
    expect(screen.getByText('1 sur 3')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  /**
   * Le piège du seuil. « 3 sur 7 » sur une quête de dix œuvres se lit comme une
   * erreur d'affichage si rien ne dit que sept suffisent.
   */
  it('explique le seuil au lieu de laisser deux nombres se contredire', async () => {
    fetchQuest.mockResolvedValue(
      quest({
        threshold: 7,
        progress: { done: 3, total: 10, required: 7, completed: false, completed_at: null },
      }),
    )
    render()

    expect(await screen.findByText('3 sur 7')).toBeInTheDocument()
    expect(screen.getByText('7 suffisent sur les 10 de la quête')).toBeInTheDocument()
  })

  it('se tait sur le seuil quand il faut tout terminer', async () => {
    fetchQuest.mockResolvedValue(quest())
    render()

    await screen.findByText('1 sur 3')
    expect(screen.queryByText(/suffisent sur les/)).not.toBeInTheDocument()
  })

  it('marque l’échéance comme indicative', async () => {
    fetchQuest.mockResolvedValue(quest({ due_at: '2026-12-31T00:00:00.000Z' }))
    render()

    expect(await screen.findByText(/Rien ne se ferme/)).toBeInTheDocument()
  })

  it('montre le badge, et dit s’il est obtenu', async () => {
    fetchQuest.mockResolvedValue(quest())
    render()

    expect(await screen.findByText('Cinéphile débutant')).toBeInTheDocument()
    expect(screen.getByText('à obtenir')).toBeInTheDocument()
  })

  it('n’ouvre l’administration qu’aux administrateurs', async () => {
    fetchQuest.mockResolvedValue(quest())
    render()

    await screen.findByText('1 sur 3')
    expect(screen.queryByRole('heading', { name: 'Administration' })).not.toBeInTheDocument()
  })

  it('prévient qu’une publication ne se défait pas', async () => {
    fetchQuest.mockResolvedValue(quest({ status: 'draft' }))
    render(ADMIN_SESSION)

    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeInTheDocument()
    expect(screen.getByText(/ne se défait pas/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publier' })).toBeEnabled()
  })

  it('refuse de publier une quête vide', async () => {
    fetchQuest.mockResolvedValue(quest({ status: 'draft', items: [] }))
    render(ADMIN_SESSION)

    expect(await screen.findByRole('button', { name: 'Publier' })).toBeDisabled()
    expect(screen.getByText(/Une quête vide ne peut pas être publiée/)).toBeInTheDocument()
  })

  /**
   * Le cœur de l'étape. Sans la recherche chez les sources, un administrateur
   * ne pourrait proposer que ce que quelqu'un a déjà ajouté — et une quête ne
   * serait jamais qu'un résumé du passé.
   */
  it('ajoute une œuvre absente de la médiathèque, cherchée chez la source', async () => {
    fetchQuest.mockResolvedValue(quest({ status: 'draft' }))
    searchExternal.mockResolvedValue({
      items: [
        {
          source: 'tmdb',
          external_id: '603',
          type: 'movie',
          title: 'Matrix',
          year: 1999,
          cover_url: null,
        },
      ],
      next_cursor: null,
    })
    addQuestItem.mockResolvedValue(quest())
    render(ADMIN_SESSION)

    const champ = await screen.findByLabelText('Chercher une œuvre')
    fireEvent.change(champ, { target: { value: 'matrix' } })
    fireEvent.submit(champ.closest('form') as HTMLFormElement)

    // Le titre apparaît deux fois — la jaquette le reprend en repli. On vise
    // donc le bouton, qui est unique.
    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter' }))

    await waitFor(() =>
      expect(addQuestItem).toHaveBeenCalledWith(QUEST_ID, {
        source: 'tmdb',
        external_id: '603',
        type: 'movie',
      }),
    )
  })
})
