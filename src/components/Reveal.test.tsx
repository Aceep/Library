import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Reveal from './Reveal'

/**
 * Ce qui s'éprouve ici tient en une phrase : **le contenu doit être visible même
 * quand rien ne peut le révéler.**
 *
 * `Reveal` masque ses enfants en CSS (`opacity: 0`) et ne les découvre qu'en
 * posant `data-revealed`. Trois choses peuvent empêcher cette pose — un
 * navigateur sans `IntersectionObserver`, une préférence de mouvement réduit,
 * un observateur qui ne se déclenche jamais — et chacune laisserait une page
 * blanche que rien ne rattrape.
 *
 * jsdom est précisément l'environnement le plus démuni : il ne fournit **ni**
 * `IntersectionObserver` **ni** `matchMedia`, et `src/test/setup.ts` ne les
 * simule pas. Ce fichier vérifie donc la garde dans le seul cas où elle compte
 * vraiment, et il aurait dû exister le jour où le composant a été écrit.
 */
describe('Reveal — rien ne doit rester caché', () => {
  it('découvre son contenu d’emblée quand `IntersectionObserver` manque', () => {
    expect(typeof IntersectionObserver).toBe('undefined')

    render(
      <Reveal>
        <p>Une section qui doit se voir</p>
      </Reveal>,
    )

    expect(screen.getByText('Une section qui doit se voir')).toBeInTheDocument()
    // L'attribut est ce que la feuille attend pour lever `opacity: 0` : le
    // texte présent dans le DOM ne suffirait pas à dire qu'il est visible.
    expect(screen.getByText('Une section qui doit se voir').parentElement).toHaveAttribute(
      'data-revealed',
    )
  })

  it('rend l’élément demandé, et lui passe la classe de la page', () => {
    const { container } = render(
      <Reveal as="div" className="rayon">
        <span>Contenu</span>
      </Reveal>,
    )

    const racine = container.firstElementChild
    expect(racine?.tagName).toBe('DIV')
    // La classe de la page s'ajoute à la sienne, elle ne la remplace pas :
    // sans celle du composant, l'échelonnement des enfants ne s'applique plus.
    expect(racine?.className).toContain('rayon')
    expect(racine?.className.split(' ').length).toBeGreaterThan(1)
  })
})
