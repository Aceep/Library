import { useEffect, useRef, useState } from 'react'
import type { ElementType, ReactNode } from 'react'
import styles from './Reveal.module.css'

/** Les réglages de la spécification, à la virgule près. */
const OPTIONS: IntersectionObserverInit = {
  threshold: 0.06,
  rootMargin: '0px 0px -12% 0px',
}

/**
 * Le filet de sécurité. Si l'observateur ne se déclenche jamais — onglet ouvert
 * en arrière-plan, mise en page inattendue, panne partielle de JS — la page ne
 * peut pas rester blanche. C'est la garantie que la spécification exige.
 */
const SAFETY_MS = 2600

/**
 * Un seul observateur pour toute la page, et non un par section : la
 * spécification le demande, et trois abonnements pour trois sections coûtent
 * trois fois le même travail au défilement.
 */
let observer: IntersectionObserver | null = null
const pending = new Map<Element, () => void>()

const observe = (el: Element, show: () => void) => {
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        // On se désabonne **avant** de révéler : `show` déclenche un rendu, et
        // dans l'autre ordre l'entrée peut se re-signaler pendant qu'on la
        // traite.
        observer?.unobserve(entry.target)
        const reveal = pending.get(entry.target)
        pending.delete(entry.target)
        reveal?.()
      }
    }, OPTIONS)
  }
  pending.set(el, show)
  observer.observe(el)
}

const unobserve = (el: Element) => {
  pending.delete(el)
  observer?.unobserve(el)
}

/**
 * Vrai quand il ne faut pas révéler du tout, et rendre visible d'emblée.
 *
 * La double garde est obligatoire : jsdom ne fournit **ni** `IntersectionObserver`
 * **ni** `matchMedia`, et `src/test/setup.ts` ne les simule pas. Sans elle, un
 * test montant l'accueil verrait une page dont rien ne s'affiche jamais.
 */
const skipReveal = () =>
  typeof IntersectionObserver === 'undefined' ||
  (typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches)

/**
 * Une section qui monte en entrant dans le cadre.
 *
 * Ses enfants directs s'échelonnent, et **l'échelonnement se fait en CSS**
 * (`Reveal.module.css`, une règle `:nth-child()` par rang) plutôt qu'en
 * écrivant `style.transitionDelay` sur chaque nœud dans une boucle. Ce n'est pas
 * un raffinement : React réécrit `style` au rendu suivant, et des délais posés
 * à la main disparaîtraient au premier changement d'état de la page.
 *
 * Ne jamais envelopper ce qui est au-dessus de la ligne de flottaison — le
 * bandeau, la bannière de quête, le ticker. Une révélation y serait un
 * clignotement, puisque c'est déjà peint quand l'observateur se met en route.
 */
export default function Reveal({
  children,
  as: Tag = 'section',
  className,
}: {
  children: ReactNode
  as?: ElementType
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(skipReveal)

  useEffect(() => {
    if (revealed) return
    const el = ref.current
    if (!el) return

    const show = () => setRevealed(true)
    observe(el, show)
    const timer = window.setTimeout(show, SAFETY_MS)

    return () => {
      window.clearTimeout(timer)
      unobserve(el)
    }
  }, [revealed])

  return (
    <Tag
      ref={ref}
      className={className ? `${styles.reveal} ${className}` : styles.reveal}
      data-revealed={revealed ? '' : undefined}
    >
      {children}
    </Tag>
  )
}
