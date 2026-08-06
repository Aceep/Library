import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { champ, useFiltersInUrl } from './useFiltersInUrl'
import { usePageInUrl } from './usePageInUrl'

function Ecran() {
  const [filtres, poser] = useFiltersInUrl({
    status: champ('', ['', 'todo', 'doing', 'done']),
    sort: champ('added', ['added', 'title']),
  })
  const { page, allerA } = usePageInUrl()
  const { search } = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <p data-testid="adresse">{search}</p>
      <p data-testid="lu">
        {filtres.status}|{filtres.sort}|{page}
      </p>
      <button type="button" onClick={() => poser({ status: 'doing' })}>
        en cours
      </button>
      <button type="button" onClick={() => poser({ sort: 'title' })}>
        par titre
      </button>
      <button type="button" onClick={() => poser({ status: '' })}>
        tout
      </button>
      <button type="button" onClick={() => allerA(3)}>
        page 3
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        retour
      </button>
    </>
  )
}

const monter = (route = '/rayon') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="*" element={<Ecran />} />
      </Routes>
    </MemoryRouter>,
  )

const cliquer = (nom: string) =>
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: nom }))
  })

const adresse = () => screen.getByTestId('adresse').textContent
const lu = () => screen.getByTestId('lu').textContent

describe('useFiltersInUrl — l’état d’écran se partage', () => {
  it('lit les filtres depuis l’adresse', () => {
    monter('/rayon?status=doing&sort=title')

    expect(lu()).toBe('doing|title|1')
  })

  /** La même doctrine que `?page=1` : une adresse partagée est la plus courte
      qui dise la chose. */
  it('n’écrit jamais la valeur par défaut', () => {
    monter('/rayon?sort=title')

    cliquer('par titre')
    expect(adresse()).toBe('?sort=title')

    cliquer('en cours')
    expect(adresse()).toBe('?sort=title&status=doing')

    cliquer('tout')
    expect(adresse()).toBe('?sort=title')
  })

  /**
   * Le domaine applique dans la barre d'adresse la règle « ce que le back
   * refuse ne se propose pas » : une valeur recopiée qui n'existe pas retombe
   * sur le défaut au lieu d'aller interroger l'API avec.
   */
  it('ignore une valeur hors domaine au lieu de la transmettre', () => {
    monter('/rayon?status=abandonne&sort=n-importe-quoi')

    expect(lu()).toBe('|added|1')
  })

  /**
   * La raison d'être de l'écriture fonctionnelle. Deux `setSearchParams` dans
   * un même geste, chacun fermé sur les paramètres de *son* rendu, et le second
   * écrase le premier : `page` survivrait au changement de filtre, ou le filtre
   * ne s'écrirait pas.
   */
  it('pose le filtre et retire la page en une seule écriture', () => {
    monter('/rayon')

    cliquer('page 3')
    expect(adresse()).toBe('?page=3')

    cliquer('en cours')
    expect(adresse()).toBe('?status=doing')
    expect(lu()).toBe('doing|added|1')
  })

  /**
   * Un filtre n'est pas un lieu où l'on revient : le retour arrière doit
   * sauter par-dessus, donc on remplace au lieu d'empiler.
   *
   * Ce qui l'éprouve : après un changement de filtre, la pile n'a toujours
   * qu'une entrée — un retour arrière n'a donc rien à défaire et l'adresse ne
   * bouge pas. Avec une écriture qui empile, on retomberait sur `/rayon` nu.
   */
  it('remplace l’entrée d’historique au lieu d’en empiler une', () => {
    monter('/rayon')

    cliquer('en cours')
    expect(adresse()).toBe('?status=doing')

    cliquer('retour')

    expect(adresse()).toBe('?status=doing')
  })
})
