import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes, useLocation } from 'react-router-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { media, renderWithProviders, tracking } from '../test/render'

const fetchLibrary = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchLibrary: (...args: unknown[]) => fetchLibrary(...args),
}))

const { default: TypeLibrary } = await import('./TypeLibrary')

const PAR_PAGE = 3
const TOTAL = 12

/** Une bibliothèque paginée, avec des curseurs opaques comme ceux de l'API. */
const page = (curseur: string | null) => {
  const debut = curseur ? Number(curseur) : 0
  return {
    items: Array.from({ length: Math.min(PAR_PAGE, TOTAL - debut) }, (_, i) => ({
      // Avec jaquette : sans elle, `Cover` reprend le titre en repli
      // typographique et chaque titre apparaîtrait deux fois.
      ...media({
        id: `00000000-0000-4000-8000-${String(debut + i).padStart(12, '0')}`,
        title: `Film ${debut + i}`,
        cover_url: '/covers/x-thumb.webp',
      }),
      tracking: { me: tracking(), following: [], others: { count: 0, average_rating: null } },
      progress: null,
    })),
    next_cursor: debut + PAR_PAGE < TOTAL ? String(debut + PAR_PAGE) : null,
  }
}

/**
 * L'adresse du routeur, rendue pour être lisible.
 *
 * `window.location` ne bouge pas sous `MemoryRouter` : l'assertion doit porter
 * sur ce que le routeur croit, qui est justement ce dont dépend le rétablissement.
 */
function Sonde() {
  return <span data-testid="adresse">{useLocation().search}</span>
}

const render = (adresse: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/bibliotheque/:type" element={<TypeLibrary />} />
      </Routes>
      <Sonde />
    </>,
    { route: adresse },
  )

/**
 * `?pages=N` ne fait qu'une chose : rétablir ce qu'on avait déjà demandé.
 *
 * Ce n'est pas une pagination numérotée — `?pages=4` veut dire « les quatre
 * premières », jamais « la quatrième ». La distinction est le cœur de la
 * décision qu'on a prise en gardant l'accumulation, et ces tests la fixent.
 */
describe('Rayon — le nombre de pages dans l’adresse', () => {
  beforeEach(() => {
    fetchLibrary.mockReset()
    fetchLibrary.mockImplementation((_f: unknown, curseur: string | null) =>
      Promise.resolve(page(curseur)),
    )
  })

  it('ne charge qu’une page sans paramètre', async () => {
    render('/bibliotheque/movie')

    expect(await screen.findByText('Film 0')).toBeInTheDocument()
    expect(screen.queryByText('Film 3')).not.toBeInTheDocument()
    expect(fetchLibrary).toHaveBeenCalledTimes(1)
  })

  it('rétablit les quatre premières pages depuis l’adresse', async () => {
    render('/bibliotheque/movie?pages=4')

    // Douze œuvres : les quatre pages ont bien été redemandées, dans l'ordre —
    // le curseur de chacune vient de la précédente.
    expect(await screen.findByText('Film 11')).toBeInTheDocument()
    await waitFor(() => expect(fetchLibrary).toHaveBeenCalledTimes(4))
  })

  it('inscrit dans l’adresse ce qu’on charge à la main', async () => {
    render('/bibliotheque/movie')
    await screen.findByText('Film 0')

    fireEvent.click(screen.getByRole('button', { name: 'Charger la suite' }))

    expect(await screen.findByText('Film 3')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('adresse')).toHaveTextContent('pages=2'))
  })

  it('borne un paramètre déraisonnable', async () => {
    render('/bibliotheque/movie?pages=9999')

    // Quatre pages suffisent à épuiser la liste : la borne empêche surtout de
    // lancer neuf mille requêtes, pas d'afficher douze films.
    expect(await screen.findByText('Film 11')).toBeInTheDocument()
    await waitFor(() => expect(fetchLibrary).toHaveBeenCalledTimes(4))
  })

  it('ignore une valeur qui n’est pas un nombre de pages', async () => {
    render('/bibliotheque/movie?pages=zero')

    expect(await screen.findByText('Film 0')).toBeInTheDocument()
    expect(screen.queryByText('Film 3')).not.toBeInTheDocument()
  })
})
