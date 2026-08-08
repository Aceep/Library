import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import { ApiError } from '../api/client'
import { renderWithProviders } from '../test/render'

const searchExternal = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  searchExternal: (...args: unknown[]) => searchExternal(...args),
}))

const { default: Search } = await import('./Search')

const resultat = (type: string, title: string) => ({
  source: 'tmdb',
  external_id: `${type}-1`,
  type,
  title,
  original_title: title,
  year: 1979,
  // Avec jaquette : sans elle, `Cover` reprend le titre en repli typographique
  // et chaque titre apparaîtrait deux fois dans la page.
  cover_url: '/covers/x-thumb.webp',
  summary: null,
  detail_level: 'search',
  in_library: false,
  media_id: null,
  metadata: {},
})

const render = (adresse: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/recherche" element={<Search />} />
    </Routes>,
    { route: adresse },
  )

/**
 * L'éventail : `/search` exige un `type`, donc une recherche lance **une
 * requête par rayon**. Ce qui s'éprouve ici n'est pas le nombre d'appels, c'est
 * que les six issues restent lisibles séparément.
 */
describe('Recherche — l’éventail sur les six rayons', () => {
  beforeEach(() => {
    searchExternal.mockReset()
    window.localStorage.clear()
  })

  it('groupe les résultats par rayon', async () => {
    searchExternal.mockImplementation(({ type }: { type: string }) =>
      Promise.resolve({
        items: type === 'movie' || type === 'book' ? [resultat(type, `Titre ${type}`)] : [],
        next_cursor: null,
        total: 1,
      }),
    )

    render('/recherche?q=stalker')

    expect(await screen.findByText('Titre movie')).toBeInTheDocument()
    expect(screen.getByText('Titre book')).toBeInTheDocument()
    // Un rayon sans résultat ne laisse pas d'en-tête vide derrière lui.
    expect(screen.queryByText('Séries')).not.toBeInTheDocument()
  })

  /**
   * La confusion la plus coûteuse de cet écran, et celle que la maquette ne
   * traite pas : une source muette ressemble à une absence d'œuvre. On
   * verserait alors une fiche en double faute de l'avoir vue.
   */
  it('annonce un rayon dont la source ne répond pas, sans masquer les autres', async () => {
    searchExternal.mockImplementation(({ type }: { type: string }) => {
      if (type === 'game') {
        return Promise.reject(
          new ApiError(
            {
              code: 'UPSTREAM_UNAVAILABLE',
              message: 'IGDB ne répond pas.',
              retryable: true,
            },
            503,
          ),
        )
      }
      return Promise.resolve({
        items: type === 'movie' ? [resultat('movie', 'Stalker')] : [],
        next_cursor: null,
        total: 1,
      })
    })

    render('/recherche?q=stalker')

    // Le message du serveur, affiché tel quel — on n'en réécrit pas un.
    expect(await screen.findByText('IGDB ne répond pas.')).toBeInTheDocument()
    expect(screen.getByText('source injoignable')).toBeInTheDocument()
    // Et le rayon qui a répondu montre toujours ce qu'il a trouvé.
    expect(screen.getByText('Stalker')).toBeInTheDocument()
  })

  /**
   * L'état vide n'apparaît qu'une fois **tous** les rayons revenus : affiché
   * dès le premier vide, il clignoterait entre deux réponses.
   */
  it('n’invite à verser l’œuvre que si aucun rayon n’a rien trouvé', async () => {
    searchExternal.mockResolvedValue({ items: [], next_cursor: null, total: 0 })

    render('/recherche?q=inconnu')

    await waitFor(() =>
      expect(screen.getByText(/Personne du cercle n’a encore versé/)).toBeInTheDocument(),
    )
  })

  it('ne cherche rien tant que l’adresse ne porte pas de requête', () => {
    render('/recherche')

    expect(searchExternal).not.toHaveBeenCalled()
    expect(screen.getByText(/une par rayon/)).toBeInTheDocument()
  })
})

/**
 * Le mode ISBN était un `useState`, donc absent de l'adresse. Une recherche
 * partagée rouvrait donc toujours en éventail — et un ISBN envoyé aux six
 * rayons fait répondre 400 aux cinq qui n'en ont pas.
 */
describe('Recherche — l’adresse dit dans quel mode on cherche', () => {
  beforeEach(() => {
    searchExternal.mockReset()
    searchExternal.mockResolvedValue({ items: [], next_cursor: null, total: 0 })
    window.localStorage.clear()
  })

  it('n’interroge que les livres sur un lien ?isbn= partagé', async () => {
    render('/recherche?isbn=9782070360024')

    await waitFor(() => expect(searchExternal).toHaveBeenCalled())

    const types = searchExternal.mock.calls.map((appel) => (appel[0] as { type: string }).type)
    expect(types).toEqual(['book'])
    expect(searchExternal.mock.calls[0][0]).toMatchObject({ isbn: '9782070360024' })
  })

  it('interroge bien les six rayons sur un ?q= ordinaire', async () => {
    render('/recherche?q=stalker')

    await waitFor(() => expect(searchExternal).toHaveBeenCalledTimes(6))
    expect(searchExternal.mock.calls[0][0]).toMatchObject({ q: 'stalker' })
  })

  /** Une recherche exacte faite une fois sur un code qu'on a sous les yeux ne
      se range pas parmi les termes qu'on relance. */
  it('ne retient pas un ISBN dans les dernières recherches', async () => {
    render('/recherche?isbn=9782070360024')

    await waitFor(() => expect(searchExternal).toHaveBeenCalled())
    expect(screen.queryByText('Dernières recherches')).not.toBeInTheDocument()
  })
})

describe("Ce qui distingue deux résultats", () => {
  beforeEach(() => {
    searchExternal.mockReset()
    window.localStorage.clear()
  })

  it("nomme l'auteur d'un livre, et ne montre plus la source", async () => {
    const resultat = {
      type: 'book' as const,
      source: 'openlibrary' as const,
      external_id: 'OL893414W',
      title: 'Dune',
      original_title: null,
      year: 1965,
      cover_url: null,
      summary: null,
      detail_level: 'search' as const,
      in_library: false,
      media_id: null,
      metadata: {
        authors: ['Frank Herbert'],
        publisher: null,
        page_count: null,
        language: null,
        genres: [],
        series: null,
        external_ids: { openlibrary: 'OL893414W', googlebooks: null },
      },
    }
    searchExternal.mockImplementation(({ type }: { type: string }) =>
      Promise.resolve({
        items: type === 'book' ? [resultat] : [],
        next_cursor: null,
        total: type === 'book' ? 1 : 0,
      }),
    )

    render('/recherche?q=dune')

    expect(await screen.findByText(/Frank Herbert/)).toBeInTheDocument()
    expect(screen.queryByText(/openlibrary/)).not.toBeInTheDocument()
  })
})
