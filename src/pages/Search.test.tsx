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
