import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import Pagination, { pagesAAfficher } from './Pagination'

/**
 * Le premier composant de pagination du dépôt.
 *
 * Ce qui est vérifié ici n'est pas « les boutons s'affichent » mais les trois
 * choses qui, mal faites, rendent une pagination pénible sans qu'on sache
 * dire pourquoi : ce qu'un lecteur d'écran en comprend, ce que le clavier
 * permet, et ce que l'adresse contient.
 */

const info = (page: number, pages: number, total = pages * 40) => ({
  page,
  size: 40,
  total,
  pages,
})

const monter = (page: number, pages: number, onNavigate = vi.fn()) => {
  render(
    <Pagination
      info={info(page, pages)}
      hrefOf={(numero) => (numero > 1 ? `?page=${numero}` : '/bibliotheque/movie')}
      onNavigate={onNavigate}
    />,
  )
  return onNavigate
}

const numeros = () =>
  within(screen.getByRole('navigation'))
    .getAllByRole('link')
    .map((lien) => lien.textContent)

describe('les numéros affichés', () => {
  it('garde une largeur bornée sur beaucoup de pages', () => {
    // Trois cents pages ne doivent pas produire trois cents liens : la barre
    // déborderait, et personne ne cherche la page 147 à l'œil.
    expect(pagesAAfficher(150, 300)).toEqual([1, 'trou', 149, 150, 151, 'trou', 300])
  })

  it('n’élide pas un trou d’une seule page', () => {
    // « 1 … 3 » est plus long à lire que « 1 2 3 » et cache un numéro
    // cliquable pour rien.
    expect(pagesAAfficher(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('ne s’élide pas près des bords', () => {
    expect(pagesAAfficher(1, 4)).toEqual([1, 2, 3, 4])
    expect(pagesAAfficher(4, 4)).toEqual([1, 2, 3, 4])
  })

  it('ne dessine rien en dessous de deux pages', () => {
    monter(1, 1)
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})

describe('ce qu’un lecteur d’écran en comprend', () => {
  it('est une navigation nommée, pas un tas de boutons', () => {
    monter(2, 5)
    // Sans nom, on entend « navigation » deux fois sur un écran qui a déjà sa
    // barre principale, sans savoir laquelle mène où.
    expect(screen.getByRole('navigation', { name: /pages/i })).toBeTruthy()
  })

  it('marque la page courante avec la valeur exacte', () => {
    monter(3, 5)
    const courante = screen.getByRole('link', { current: 'page' })
    // `aria-current="page"` fait annoncer « page courante » ; `true` aurait
    // fait annoncer « sélectionné », qui ne dit pas la même chose.
    expect(courante.getAttribute('aria-current')).toBe('page')
    expect(courante.textContent).toContain('3')
  })

  it('annonce le changement de page sans couper la lecture', () => {
    monter(3, 5)
    const compte = screen.getByText(/Page 3 sur 5/)
    expect(compte.getAttribute('aria-live')).toBe('polite')
  })

  it('ne propose pas les ellipses', () => {
    monter(150, 300)
    // Annoncées, elles feraient entendre « points de suspension » entre deux
    // numéros.
    for (const trou of Array.from(document.querySelectorAll('li[aria-hidden="true"]'))) {
      expect(trou.textContent).toBe('…')
    }
    expect(numeros().some((texte) => texte?.includes('…'))).toBe(false)
  })

  it('sort les bords inactifs de l’ordre de tabulation plutôt que de les inerter', () => {
    monter(1, 5)
    // Un lien qu'on atteint au clavier et qui ne fait rien est une impasse.
    // Sur la première page, « Précédente » ne doit pas être un lien du tout.
    expect(numeros().some((texte) => texte?.includes('Précédente'))).toBe(false)
    expect(numeros().some((texte) => texte?.includes('Suivante'))).toBe(true)
  })
})

describe('le clavier', () => {
  it('avance et recule aux flèches', () => {
    const onNavigate = monter(3, 5)
    const nav = screen.getByRole('navigation')

    fireEvent.keyDown(nav, { key: 'ArrowRight' })
    expect(onNavigate).toHaveBeenLastCalledWith(4)

    fireEvent.keyDown(nav, { key: 'ArrowLeft' })
    expect(onNavigate).toHaveBeenLastCalledWith(2)
  })

  it('va aux extrémités par Origine et Fin', () => {
    const onNavigate = monter(7, 12)
    const nav = screen.getByRole('navigation')

    fireEvent.keyDown(nav, { key: 'Home' })
    expect(onNavigate).toHaveBeenLastCalledWith(1)

    fireEvent.keyDown(nav, { key: 'End' })
    expect(onNavigate).toHaveBeenLastCalledWith(12)
  })

  it('ne sort jamais des bornes', () => {
    const surLaPremiere = monter(1, 5)
    fireEvent.keyDown(screen.getByRole('navigation'), { key: 'ArrowLeft' })
    // Rien, plutôt qu'un appel à la page 0 que le back refuserait en 400.
    expect(surLaPremiere).not.toHaveBeenCalled()
  })

  it('laisse les autres touches tranquilles', () => {
    const onNavigate = monter(3, 5)
    for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'a', 'Escape']) {
      fireEvent.keyDown(screen.getByRole('navigation'), { key })
    }
    expect(onNavigate).not.toHaveBeenCalled()
  })
})

describe('l’adresse', () => {
  it('donne une vraie adresse à chaque page', () => {
    monter(2, 5)
    const lien = screen.getByRole('link', { name: /page 4/i })
    // Un `<a href>` plutôt qu'un `<button>` : ouvrir dans un onglet, mettre en
    // favori et partager viennent gratuitement, et se réimplémenteraient mal.
    expect(lien.getAttribute('href')).toBe('?page=4')
  })

  it('la première page est l’adresse nue', () => {
    monter(3, 5)
    expect(screen.getByRole('link', { name: /page 1/i }).getAttribute('href')).toBe(
      '/bibliotheque/movie',
    )
  })

  it('laisse le navigateur faire son travail sur un clic modifié', () => {
    const onNavigate = monter(2, 5)
    fireEvent.click(screen.getByRole('link', { name: /page 4/i }), { metaKey: true })
    // Sinon « ouvrir dans un nouvel onglet » ouvrirait la page courante.
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('intercepte le clic nu', () => {
    const onNavigate = monter(2, 5)
    fireEvent.click(screen.getByRole('link', { name: /page 4/i }))
    expect(onNavigate).toHaveBeenCalledWith(4)
  })
})
