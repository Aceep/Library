import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocation } from 'react-router-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { ACCOUNT, media, renderWithProviders, tracking } from '../test/render'

const fetchMemberLibraryPage = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchMemberLibraryPage: (...args: unknown[]) => fetchMemberLibraryPage(...args),
}))

const { default: MemberLibrary } = await import('./MemberLibrary')

const PAR_PAGE = 4
const TOTAL = 14
const PAGES = Math.ceil(TOTAL / PAR_PAGE)

const page = (numero: number) => {
  const debut = (numero - 1) * PAR_PAGE
  return {
    items: Array.from({ length: Math.max(0, Math.min(PAR_PAGE, TOTAL - debut)) }, (_, i) => ({
      ...media({
        id: `00000000-0000-4000-8000-${String(debut + i).padStart(12, '0')}`,
        title: `Œuvre ${debut + i}`,
        cover_url: '/covers/x-thumb.webp',
      }),
      tracking: { me: tracking(), following: [], others: { count: 0, average_rating: null } },
      progress: null,
    })),
    next_cursor: null,
    pages: { page: numero, size: PAR_PAGE, total: TOTAL, pages: PAGES },
  }
}

function Sonde() {
  return <span data-testid="adresse">{useLocation().search}</span>
}

const render = (adresse = '/membres/u1') =>
  renderWithProviders(
    <>
      <MemberLibrary userId="u1" pseudo="camille" isMe={false} me={ACCOUNT} trackedCount={TOTAL} />
      <Sonde />
    </>,
    { route: adresse },
  )

const adresse = () => screen.getByTestId('adresse').textContent

/**
 * La bibliothèque d'un membre pagine **comme un rayon**.
 *
 * Ce n'est pas une ressemblance à vérifier de l'œil : les deux écrans
 * partagent `usePageInUrl` et `Pagination`. Ces tests fixent ce que ce partage
 * doit produire ici, pour qu'un jour où quelqu'un réécrirait l'un des deux
 * « juste un peu différemment », la divergence ait un coût.
 */
describe('MemberLibrary — pagination numérotée', () => {
  beforeEach(() => {
    fetchMemberLibraryPage.mockReset()
    fetchMemberLibraryPage.mockImplementation((_id: string, _f: unknown, numero: number) =>
      Promise.resolve(page(numero)),
    )
  })

  it('ouvre la première page et dessine la barre', async () => {
    render()

    expect(await screen.findByText('Œuvre 0')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: /bibliothèque de camille/i })).toBeTruthy()
    expect(screen.getByText(/Page 1 sur 4/)).toBeTruthy()
  })

  it('lit la page dans l’adresse — le même paramètre que le rayon', async () => {
    render('/membres/u1?page=3')

    expect(await screen.findByText('Œuvre 8')).toBeTruthy()
    // Le même nom de paramètre des deux côtés : c'est ce qui fait qu'une
    // adresse se lit sans savoir de quel écran elle vient.
    expect(fetchMemberLibraryPage.mock.calls[0]?.[2]).toBe(3)
  })

  it('inscrit la page dans l’adresse quand on navigue', async () => {
    render()
    await screen.findByText('Œuvre 0')

    fireEvent.click(screen.getByRole('link', { name: 'Page 2' }))

    await waitFor(() => expect(adresse()).toBe('?page=2'))
    expect(await screen.findByText('Œuvre 4')).toBeTruthy()
  })

  it('répond aux flèches comme le rayon', async () => {
    render('/membres/u1?page=2')
    await screen.findByText('Œuvre 4')

    fireEvent.keyDown(screen.getByRole('navigation', { name: /camille/i }), { key: 'End' })

    await waitFor(() => expect(adresse()).toBe(`?page=${PAGES}`))
  })

  it('revient à la première page quand un filtre change', async () => {
    render('/membres/u1?page=3')
    await screen.findByText('Œuvre 8')

    fireEvent.click(screen.getByRole('button', { name: 'Films' }))

    // Rester sur la 3 en changeant de type montrerait un écran vide et ferait
    // croire que le filtre ne ramène rien.
    //
    // Le filtre vit maintenant dans l'adresse : `page` s'en va, `type` s'y
    // met, en une seule écriture. Deux écritures séparées se recouvriraient,
    // et ça se lirait ici.
    await waitFor(() => expect(adresse()).toBe('?type=movie'))
  })

  it('ne dessine pas de barre pour une seule page', async () => {
    fetchMemberLibraryPage.mockResolvedValue({
      items: page(1).items.slice(0, 2),
      next_cursor: null,
      pages: { page: 1, size: PAR_PAGE, total: 2, pages: 1 },
    })

    render()

    await screen.findByText('Œuvre 0')
    expect(screen.queryByRole('navigation', { name: /bibliothèque/i })).toBeNull()
  })

  it('propose une sortie quand la page demandée n’existe plus', async () => {
    fetchMemberLibraryPage.mockResolvedValue({
      items: [],
      next_cursor: null,
      pages: { page: 9, size: PAR_PAGE, total: TOTAL, pages: PAGES },
    })

    render('/membres/u1?page=9')

    expect(await screen.findByText(/n’en fait plus partie/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /dernière page/i })).toBeTruthy()
  })
})
