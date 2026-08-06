import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes, useLocation } from 'react-router-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { media, renderWithProviders, tracking } from '../test/render'

const fetchLibraryPage = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchLibraryPage: (...args: unknown[]) => fetchLibraryPage(...args),
}))

const { default: TypeLibrary } = await import('./TypeLibrary')

const PAR_PAGE = 3
const TOTAL = 12
const PAGES = Math.ceil(TOTAL / PAR_PAGE)

/** Ce que le back rend en pagination numérotée : `pages` plein, curseur nul. */
const page = (numero: number) => {
  const debut = (numero - 1) * PAR_PAGE
  return {
    items: Array.from({ length: Math.max(0, Math.min(PAR_PAGE, TOTAL - debut)) }, (_, i) => ({
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
    next_cursor: null,
    pages: { page: numero, size: PAR_PAGE, total: TOTAL, pages: PAGES },
  }
}

/**
 * L'adresse du routeur, rendue pour être lisible.
 *
 * `window.location` ne bouge pas sous `MemoryRouter` : l'assertion doit porter
 * sur ce que le routeur croit, qui est justement ce dont dépend le partage.
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

const adresse = () => screen.getByTestId('adresse').textContent

/**
 * Les appels de **la grille**, à l'exclusion de ceux des autres sections.
 *
 * Le rayon interroge `fetchLibraryPage` deux fois pour deux choses distinctes :
 * la grille paginée, et les trois suivis commencés en tête d'écran. Compter les
 * appels bruts mêlerait les deux et ferait échouer ce fichier au premier bloc
 * ajouté à l'écran, sans que la pagination ait rien changé.
 *
 * La grille est celle qui **ne borne pas** sa page : `limit` n'appartient qu'aux
 * sections qui n'en montrent que quelques-unes.
 */
const appelsDeGrille = () =>
  fetchLibraryPage.mock.calls.filter(
    (call) => (call[0] as { limit?: number }).limit === undefined,
  )

/**
 * `?page=N` remplace le `?pages=N` de l'étape précédente, et la différence
 * n'est pas cosmétique : l'ancien voulait dire « les N premières » et ne
 * savait que rétablir une pile ; celui-ci désigne **une** page, que le back
 * rend directement.
 */
describe('Rayon — la page dans l’adresse', () => {
  beforeEach(() => {
    fetchLibraryPage.mockReset()
    // La section « en cours » du rayon a sa propre requête, filtrée sur
    // `doing`. Elle n'est pas le sujet de ce fichier : on la laisse vide pour
    // que ses œuvres ne se mêlent pas à celles de la grille, ce qui rendrait
    // « la page 3 ne montre pas Film 0 » invérifiable.
    fetchLibraryPage.mockImplementation((filters: { status?: string | null }, numero: number) =>
      Promise.resolve(
        filters.status === 'doing'
          ? { items: [], next_cursor: null, pages: { page: 1, size: 3, total: 0, pages: 0 } }
          : page(numero),
      ),
    )
  })

  it('ouvre la première page sans paramètre, en un seul appel', async () => {
    render('/bibliotheque/movie')

    expect(await screen.findByText('Film 0')).toBeTruthy()
    // Un appel, pas quatre : c'est tout l'intérêt d'aller directement à la
    // page voulue plutôt que de rattraper une pile.
    expect(appelsDeGrille()).toHaveLength(1)
    expect(appelsDeGrille()[0]?.[1]).toBe(1)
  })

  it('ouvre directement la page demandée par l’adresse', async () => {
    render('/bibliotheque/movie?page=3')

    expect(await screen.findByText('Film 6')).toBeTruthy()
    expect(screen.queryByText('Film 0')).toBeNull()
    expect(appelsDeGrille()).toHaveLength(1)
    expect(appelsDeGrille()[0]?.[1]).toBe(3)
  })

  it('inscrit la page dans l’adresse quand on navigue', async () => {
    render('/bibliotheque/movie')
    await screen.findByText('Film 0')

    fireEvent.click(screen.getByRole('link', { name: 'Page 2' }))

    await waitFor(() => expect(adresse()).toBe('?page=2'))
    expect(await screen.findByText('Film 3')).toBeTruthy()
  })

  it('laisse la première page sans paramètre', async () => {
    render('/bibliotheque/movie?page=3')
    await screen.findByText('Film 6')

    fireEvent.click(screen.getByRole('link', { name: 'Page 1' }))

    // Une adresse partagée doit être la plus courte qui dise la chose.
    await waitFor(() => expect(adresse()).toBe(''))
  })

  it('revient à la première page quand le tri change', async () => {
    render('/bibliotheque/movie?page=3')
    await screen.findByText('Film 6')

    fireEvent.change(screen.getByLabelText(/Trier par/), { target: { value: 'title' } })

    // Rester sur la 3 en changeant de tri afficherait un écran qui n'a rien à
    // voir avec le geste qu'on vient de faire.
    await waitFor(() => expect(adresse()).toBe(''))
  })

  it('borne une adresse déraisonnable au lieu de laisser passer un 400', async () => {
    render('/bibliotheque/movie?page=99999')

    await waitFor(() => expect(appelsDeGrille().length).toBeGreaterThan(0))
    expect(appelsDeGrille()[0]?.[1]).toBe(1000)
  })

  it('ignore une valeur qui n’est pas un numéro de page', async () => {
    render('/bibliotheque/movie?page=troisieme')

    await screen.findByText('Film 0')
    expect(appelsDeGrille()[0]?.[1]).toBe(1)
  })

  it('propose une sortie quand la page demandée n’existe plus', async () => {
    // Le cas d'une adresse gardée en favori après que le rayon a rétréci. Un
    // écran vide sans issue serait un cul-de-sac.
    fetchLibraryPage.mockResolvedValue({
      items: [],
      next_cursor: null,
      pages: { page: 9, size: PAR_PAGE, total: TOTAL, pages: PAGES },
    })

    render('/bibliotheque/movie?page=9')

    expect(await screen.findByText(/Cette page n’existe plus/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /dernière page/i })).toBeTruthy()
  })
})
