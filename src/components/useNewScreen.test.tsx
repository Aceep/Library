import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRef } from 'react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useNewScreen } from './useNewScreen'

/**
 * Ce hook ne se voit que quand il se trompe : remonter en haut au mauvais
 * moment est plus agaçant que ne pas remonter du tout. Ce qui s'éprouve ici est
 * donc surtout ce qu'il **ne fait pas**.
 */
function Ecran() {
  const contenu = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  useNewScreen(contenu)

  return (
    <>
      <main ref={contenu} tabIndex={-1} data-testid="contenu">
        contenu
      </main>
      <button type="button" onClick={() => navigate('/ailleurs')}>
        Aller ailleurs
      </button>
      <button type="button" onClick={() => navigate('?page=2')}>
        Page 2
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        Retour
      </button>
    </>
  )
}

/** `act` : la navigation change l'état du routeur, et l'effet doit être vidé. */
const cliquer = (nom: string) =>
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: nom }))
  })

const monter = (route = '/depart') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="*" element={<Ecran />} />
      </Routes>
    </MemoryRouter>,
  )

describe('useNewScreen — remonter, mais seulement quand l’écran change', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Au chargement, le focus appartient à la barre d'adresse et le navigateur a
   * peut-être déjà rétabli une position. Les lui prendre casserait la première
   * tabulation et écraserait le rétablissement.
   */
  it('ne touche à rien au premier montage', () => {
    monter()

    expect(window.scrollTo).not.toHaveBeenCalled()
    expect(screen.getByTestId('contenu')).not.toHaveFocus()
  })

  it('remonte en haut et pose le focus quand on change d’écran', () => {
    monter()

    cliquer('Aller ailleurs')

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    expect(screen.getByTestId('contenu')).toHaveFocus()
  })

  /**
   * `?page=` est un geste **dans** un écran. Remonter en haut du document y
   * ferait retraverser l'en-tête du rayon à chaque page ; c'est `Pagination`
   * qui ramène la liste, pas ce hook.
   */
  it('ne remonte pas quand seule la requête change', () => {
    monter()

    cliquer('Page 2')

    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  /**
   * La seule chose qu'on attend vraiment d'un retour arrière est de retrouver
   * sa place. Le navigateur la rétablit ; la doubler d'un `scrollTo(0, 0)` la
   * détruirait.
   */
  it('ne remonte pas sur un retour arrière, mais déplace quand même le focus', () => {
    monter()

    cliquer('Aller ailleurs')
    vi.mocked(window.scrollTo).mockClear()

    cliquer('Retour')

    expect(window.scrollTo).not.toHaveBeenCalled()
    // Le contenu a changé : il faut le dire, même si la position ne nous
    // appartient pas.
    expect(screen.getByTestId('contenu')).toHaveFocus()
  })
})
