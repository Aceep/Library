import { useCallback, useEffect, useState } from 'react'

/** Les deux mondes. Il n'y a pas de troisième valeur, et pas d'absence de valeur. */
export type ThemeMode = 'dark' | 'light'

/**
 * Où le choix explicite se range. Le script de pré-peinture d'`index.html` lit
 * la **même** clé — la changer ici sans la changer là-bas rendrait le choix
 * muet au rechargement.
 */
export const THEME_STORAGE_KEY = 'mediatheque:mode'

/** Le système, quand personne n'a rien choisi. Nuit par défaut, comme la CSS. */
const systemMode = (): ThemeMode =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'

const storedMode = (): ThemeMode | null => {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return raw === 'dark' || raw === 'light' ? raw : null
  } catch {
    // Stockage refusé (navigation privée Safari, blocage tiers) : on ne
    // persiste rien, mais l'interrupteur continue de fonctionner pour la
    // session en cours.
    return null
  }
}

/**
 * Jour / Nuit.
 *
 * **L'attribut fait foi.** Le mode vit sur `<html data-mode>`, posé avant la
 * première peinture par le script d'`index.html` ; ce hook ne fait que le lire
 * puis l'écrire. Une source unique, donc aucune dérive possible entre ce que la
 * CSS applique et ce que React croit — un `useState` initialisé de son côté
 * aurait divergé au premier rechargement.
 *
 * Tant que rien n'est stocké, on suit l'OS : basculer le thème du système
 * bascule l'interface. Dès qu'on clique, le choix devient explicite et
 * permanent, et l'OS cesse d'avoir son mot à dire — c'est le comportement
 * attendu d'un interrupteur.
 */
export function useThemeMode(): { mode: ThemeMode; toggle: () => void } {
  const [mode, setMode] = useState<ThemeMode>(
    () => (document.documentElement.getAttribute('data-mode') as ThemeMode | null) ?? systemMode(),
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode)
  }, [mode])

  useEffect(() => {
    // `matchMedia` manque sous jsdom, et `src/test/setup.ts` ne le simule pas :
    // sans cette garde, tout test montant la coquille casserait.
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-color-scheme: light)')
    const follow = () => {
      // Un choix explicite l'emporte définitivement sur le système.
      if (storedMode() === null) setMode(query.matches ? 'light' : 'dark')
    }
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [])

  const toggle = useCallback(() => {
    setMode((current) => {
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // Voir `storedMode` : le choix ne survivra pas au rechargement, et
        // c'est tout — il n'y a rien à annoncer à qui que ce soit.
      }
      return next
    })
  }, [])

  return { mode, toggle }
}
