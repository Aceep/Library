import { createContext, useCallback, useContext, useRef } from 'react'
import type { ReactNode } from 'react'

/**
 * Le défaut est un silence poli, et il compte : les fichiers de test montent
 * leurs écrans sans cette enveloppe. Un contexte sans défaut les ferait tous
 * tomber pour une raison qui n'a rien à voir avec ce qu'ils éprouvent.
 */
const AnnounceContext = createContext<(message: string) => void>(() => {})

/** Dire une phrase, poliment, sans rien déplacer à l'écran. */
export function useAnnounce() {
  return useContext(AnnounceContext)
}

/**
 * La région polie de l'application — **une seule**, montée avant tout écran.
 *
 * L'argument n'est pas la mutualisation, il est technique : *une région
 * insérée dans le DOM avec son texte déjà dedans n'est pas annoncée.* Toutes
 * les régions par écran de la forme `{enCours ? <p aria-live>…</p> : null}`
 * sont exactement ce cas, et ne diraient rien du tout. La région doit exister,
 * vide, **avant** qu'on ait quelque chose à dire.
 *
 * Le texte s'écrit **en DOM direct** et non en état React, pour deux raisons.
 * D'abord un état ici re-rendrait l'application entière à chaque annonce.
 * Ensuite React ne rend ce nœud qu'une fois, vide, et ne lui donne jamais
 * d'enfant : il n'a donc rien à réconcilier, et l'écriture ne peut pas entrer
 * en conflit avec un rendu.
 *
 * `replaceChildren` plutôt qu'une affectation de `textContent` : deux annonces
 * identiques à la suite n'écriraient rien de nouveau, donc ne muteraient rien,
 * donc ne seraient pas relues. Remplacer le nœud de texte *est* la mutation.
 *
 * `Pagination` garde la sienne : elle est montée en permanence avec sa `<nav>`,
 * donc elle fonctionne, et un test l'épingle. L'y ajouter ferait entendre le
 * changement de page deux fois.
 */
export function Announcer({ children }: { children: ReactNode }) {
  const region = useRef<HTMLParagraphElement>(null)

  // `useCallback` ici et nulle part ailleurs : c'est une valeur de contexte, et
  // c'est le seul cas que les conventions du dépôt autorisent.
  const annoncer = useCallback((message: string) => {
    region.current?.replaceChildren(document.createTextNode(message))
  }, [])

  return (
    <AnnounceContext.Provider value={annoncer}>
      {children}
      <p ref={region} className="sr-only" aria-live="polite" aria-atomic="true" />
    </AnnounceContext.Provider>
  )
}
