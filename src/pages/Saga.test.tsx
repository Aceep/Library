import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, within } from '@testing-library/react'
import type { SagaPart, SagaResponse } from '../api/schema'
import { media, renderWithProviders } from '../test/render'

const fetchSaga = vi.fn()
vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchSaga: (...args: unknown[]) => fetchSaga(...args),
}))

const { default: Saga } = await import('./Saga')

const SAGA_ID = '00000000-0000-4000-8000-0000000000c1'

const part = (position: number, over: Partial<SagaPart> = {}) =>
  ({
    id: `00000000-0000-4000-8000-00000000c1${position}0`,
    position,
    title: `Partie ${position}`,
    release_date: `200${position}-01-01`,
    in_library: false,
    media: null,
    my_status: null,
    ...over,
  }) as unknown as SagaPart

const saga = (parts: SagaPart[], checked: number): SagaResponse => {
  const inLibrary = parts.filter((p) => p.in_library).length
  return {
    saga: {
      id: SAGA_ID,
      title: 'Le Seigneur des anneaux',
      source: 'tmdb',
      part_count: parts.length,
      in_library_count: inLibrary,
      watched: false,
      summary: null,
      cover_url: null,
      refreshed_at: null,
      parts,
      progress: { checked, total: parts.length },
    },
  } as unknown as SagaResponse
}

const render = () =>
  renderWithProviders(
    <Routes>
      <Route path="/sagas/:id" element={<Saga />} />
    </Routes>,
    { route: `/sagas/${SAGA_ID}` },
  )

const presente = (position: number, status: string | null) =>
  part(position, {
    in_library: true,
    media: media({ id: `00000000-0000-4000-8000-0000000000a${position}`, type: 'movie' }),
    my_status: status as SagaPart['my_status'],
  })

describe('Saga — la progression compte les parties absentes', () => {
  /**
   * Le cœur de l'étape. « 1 sur 3 » quand deux parties ne sont même pas dans
   * la médiathèque se lit à tort comme « il m'en reste deux à voir ».
   */
  it('dit combien de parties manquent, et qu’elles comptent quand même', async () => {
    fetchSaga.mockResolvedValue(saga([presente(1, 'done'), part(2), part(3)], 1))
    render()

    expect(await screen.findByText(/1 sur 3/)).toBeInTheDocument()
    const note = screen.getByText(/pas dans la médiathèque/)
    expect(note).toHaveTextContent('Sur ces 3 parties, 2 ne sont pas dans la médiathèque.')
    expect(note).toHaveTextContent(/comptent quand même dans le total/)
  })

  it('se tait quand toutes les parties sont là', async () => {
    fetchSaga.mockResolvedValue(saga([presente(1, 'done'), presente(2, 'todo')], 1))
    render()

    expect(await screen.findByText(/1 sur 2/)).toBeInTheDocument()
    expect(screen.queryByText(/pas dans la médiathèque/)).not.toBeInTheDocument()
  })

  /** Une ligne sans rien se lirait comme un oubli d'affichage. */
  it('marque une partie absente en toutes lettres, et sans lien', async () => {
    fetchSaga.mockResolvedValue(saga([presente(1, 'done'), part(2)], 1))
    render()

    const lignes = await screen.findAllByRole('listitem')
    expect(within(lignes[1]).getByText('absente de la médiathèque')).toBeInTheDocument()
    expect(within(lignes[1]).queryByRole('link')).toBeNull()
  })

  it('lie une partie présente à sa fiche, avec le mot de l’API', async () => {
    fetchSaga.mockResolvedValue(saga([presente(1, 'done'), part(2)], 1))
    render()

    const lignes = await screen.findAllByRole('listitem')
    expect(within(lignes[0]).getByRole('link')).toHaveAttribute(
      'href',
      '/media/00000000-0000-4000-8000-0000000000a1',
    )
    // « Vu » — le libellé du type `movie`, pas un « Terminé » générique.
    expect(within(lignes[0]).getByText('Vu')).toBeInTheDocument()
  })

  it('distingue « pas suivie » de « absente »', async () => {
    fetchSaga.mockResolvedValue(saga([presente(1, null), part(2)], 0))
    render()

    const lignes = await screen.findAllByRole('listitem')
    expect(within(lignes[0]).getByText('pas dans ta bibliothèque')).toBeInTheDocument()
    expect(within(lignes[1]).getByText('absente de la médiathèque')).toBeInTheDocument()
  })

  it('propose de surveiller la saga', async () => {
    fetchSaga.mockResolvedValue(saga([presente(1, 'done'), part(2)], 1))
    render()

    expect(await screen.findByRole('button', { name: 'Surveiller' })).toBeInTheDocument()
  })
})
