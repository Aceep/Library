import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { ApiError } from '../api/client'
import type { SearchResult } from '../api/schema'
import { renderWithProviders } from '../test/render'

const searchExternal = vi.fn()
const fetchEditions = vi.fn()
const addMedia = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  searchExternal: (...args: unknown[]) => searchExternal(...args),
  fetchEditions: (...args: unknown[]) => fetchEditions(...args),
  addMedia: (...args: unknown[]) => addMedia(...args),
}))

const { default: Search } = await import('./Search')

/**
 * Un livre tel que `GET /search` le rend, `group` compris.
 *
 * Typé `SearchResult` et non laissé libre : c'est la seule chose qui fasse
 * casser ce fichier le jour où le contrat bouge. Les fiches non groupées
 * portent `group: null` — les tests du dépliage le remplacent.
 */
const LIVRE: SearchResult = {
  type: 'book',
  source: 'openlibrary',
  external_id: 'OL893414W',
  title: 'Dune',
  original_title: null,
  year: 1965,
  cover_url: null,
  summary: null,
  detail_level: 'search',
  in_library: false,
  media_id: null,
  group: null,
  metadata: {
    authors: ['Frank Herbert'],
    publisher: null,
    page_count: null,
    isbn10: null,
    isbn13: null,
    language: null,
    genres: [],
    series: null,
    external_ids: { openlibrary: 'OL893414W', googlebooks: null },
  },
}

/** Une recherche où seul le rayon des livres répond — les cinq autres sont muets. */
const seulLeLivre = (livre: SearchResult) =>
  searchExternal.mockImplementation(({ type }: { type: string }) =>
    Promise.resolve({
      items: type === 'book' ? [livre] : [],
      next_cursor: null,
      total: type === 'book' ? 1 : 0,
    }),
  )

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
    seulLeLivre(LIVRE)

    render('/recherche?q=dune')

    expect(await screen.findByText(/Frank Herbert/)).toBeInTheDocument()
    expect(screen.queryByText(/openlibrary/)).not.toBeInTheDocument()
  })
})

/**
 * Le geste de Babelio : une ligne par œuvre, et l'édition se choisit ensuite.
 *
 * Ce qui s'éprouve ici tient en deux points que rien d'autre ne garantit : que
 * les éditions ne partent **qu'au dépliage** — quarante lignes montées d'un
 * coup feraient quarante appels sortants pour une liste que personne n'a
 * demandée — et qu'un dépliage en panne laisse tout de même verser l'œuvre.
 */
describe('Recherche — la ligne groupée et son dépliage', () => {
  beforeEach(() => {
    searchExternal.mockReset()
    fetchEditions.mockReset()
    addMedia.mockReset()
    addMedia.mockResolvedValue({ created: true, media: { id: 'media-1' } })
    window.localStorage.clear()
  })

  it('annonce le nombre de fiches réunies', async () => {
    seulLeLivre({ ...LIVRE, group: { size: 9, external_ids: ['OL1W', 'OL2W'] } })

    render('/recherche?q=dune')

    expect(await screen.findByText(/9 fiches/)).toBeInTheDocument()
  })

  it('ne demande les éditions qu’au dépliage', async () => {
    seulLeLivre({ ...LIVRE, group: { size: 9, external_ids: ['OL1W'] } })
    fetchEditions.mockResolvedValue({ items: [], next_cursor: null, total: 0 })

    render('/recherche?q=dune')
    await screen.findByText(/9 fiches/)

    expect(fetchEditions).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /éditions/i }))
    await waitFor(() => expect(fetchEditions).toHaveBeenCalledOnce())
    expect(fetchEditions.mock.calls[0][0]).toEqual(['OL1W'])
  })

  it('laisse la ligne versable quand le dépliage échoue', async () => {
    seulLeLivre({ ...LIVRE, group: { size: 9, external_ids: ['OL1W'] } })
    // Le 503 que la source rend quand elle est en panne : il se dit sur la
    // ligne, il ne la démonte pas.
    fetchEditions.mockRejectedValue(
      new ApiError(
        { code: 'UPSTREAM_UNAVAILABLE', message: 'Open Library est injoignable.', retryable: true },
        503,
      ),
    )

    render('/recherche?q=dune')
    fireEvent.click(await screen.findByRole('button', { name: /éditions/i }))

    expect(await screen.findByText(/injoignable/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Verser au fonds/ })).toBeEnabled()
  })

  it('verse l’édition choisie, et le représentant si l’on n’a rien choisi', async () => {
    seulLeLivre({ ...LIVRE, group: { size: 2, external_ids: ['OL1W', 'OL2W'] } })
    fetchEditions.mockResolvedValue({
      items: [
        {
          edition_id: 'OL7826782M',
          publisher: 'Gallimard',
          year: 1999,
          page_count: 96,
          isbn13: '9782070116270',
          cover_url: null,
          language: 'fre',
          physical_format: 'Poche',
        },
      ],
      next_cursor: null,
      total: 1,
    })

    render('/recherche?q=dune')
    fireEvent.click(await screen.findByRole('button', { name: /éditions/i }))
    fireEvent.click(await screen.findByRole('radio', { name: /Gallimard/ }))
    fireEvent.click(screen.getByRole('button', { name: /Verser au fonds/ }))

    await waitFor(() =>
      expect(addMedia).toHaveBeenCalledWith(
        // `external_id` reste celui du **représentant** : la fiche est celle de
        // l'œuvre, l'édition ne fait que la renseigner.
        expect.objectContaining({ external_id: 'OL893414W', edition_id: 'OL7826782M' }),
      ),
    )
  })

  it('verse le représentant seul quand aucune édition n’a été choisie', async () => {
    seulLeLivre({ ...LIVRE, group: { size: 2, external_ids: ['OL1W', 'OL2W'] } })

    render('/recherche?q=dune')
    fireEvent.click(await screen.findByRole('button', { name: /Verser au fonds/ }))

    await waitFor(() => expect(addMedia).toHaveBeenCalledOnce())
    expect(addMedia.mock.calls[0][0]).not.toHaveProperty('edition_id')
  })

  /**
   * Une édition peut n'avoir ni éditeur, ni année, ni pagination : la source
   * ne garantit aucun de ces champs. Un `null` à l'écran, ou un séparateur qui
   * ne sépare rien, se lit comme un bug de la médiathèque.
   */
  it('n’affiche ni null ni séparateur vide sur une édition dépouillée', async () => {
    seulLeLivre({ ...LIVRE, group: { size: 2, external_ids: ['OL1W'] } })
    fetchEditions.mockResolvedValue({
      items: [
        {
          edition_id: 'OL1M',
          publisher: null,
          year: null,
          page_count: null,
          isbn13: null,
          cover_url: null,
          language: null,
          physical_format: null,
        },
      ],
      next_cursor: null,
      total: 1,
    })

    render('/recherche?q=dune')
    fireEvent.click(await screen.findByRole('button', { name: /éditions/i }))

    const edition = await screen.findByRole('radio', { name: /Édition sans éditeur/ })
    expect(edition).toBeInTheDocument()
    expect(screen.queryByText(/null/)).not.toBeInTheDocument()
    expect(screen.queryByText(/·\s*$/)).not.toBeInTheDocument()
  })
})
