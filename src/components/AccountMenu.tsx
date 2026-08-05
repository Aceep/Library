import { useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSession } from '../session/SessionContext'
import IdentityDot from './IdentityDot'
import styles from './AccountMenu.module.css'

/**
 * Ce qui m'appartient et ne se consulte pas tous les jours.
 *
 * La ligne de partage est la fréquence, pas la nature : les nouveautés et la
 * veille se regardent chaque jour et restent donc dans le bandeau, les badges
 * et les statistiques une fois par mois et se replient ici. Le compte et la
 * déconnexion les rejoignent — ils étaient déjà les deux dernières entrées de
 * la barre, et personne ne s'y rend par curiosité.
 */
const ENTRIES: { to: string; label: string }[] = [
  { to: '/badges', label: 'Mes badges' },
  { to: '/statistiques', label: 'Mes statistiques' },
  { to: '/mon-compte', label: 'Mon compte' },
]

/**
 * Le menu de compte : le premier repli de l'application.
 *
 * **Pourquoi une divulgation et non un `role="menu"`.** Le rôle `menu` de l'ARIA
 * décrit les menus d'application — ceux d'un traitement de texte —, où les
 * flèches remplacent la tabulation et où le contenu n'est pas fait de liens.
 * Ici ce sont des liens de navigation : leur donner `menuitem` les priverait de
 * ce qu'un lecteur d'écran en dit (« lien ») et de la tabulation. On garde donc
 * la divulgation — `aria-expanded` sur le déclencheur, `aria-controls` vers le
 * panneau — et on **ajoute** les flèches, qui ne coûtent rien à personne.
 *
 * Le panneau reste dans le DOM et se cache par `hidden` : les entrées sortent
 * ainsi de l'arbre d'accessibilité et de l'ordre de tabulation sans qu'on ait à
 * les démonter, ce qui rend le repli vérifiable — une entrée cachée est
 * introuvable par son rôle, pas seulement invisible.
 */
export default function AccountMenu() {
  const { user, logout } = useSession()
  const [open, setOpen] = useState(false)
  // Où poser le focus à l'ouverture. `null` au clic : la souris a déjà désigné,
  // déplacer le focus ferait sauter la page sous le curseur.
  const [focusOnOpen, setFocusOnOpen] = useState<'first' | 'last' | null>(null)
  const panelId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()

  const items = () =>
    Array.from(wrapper.current?.querySelectorAll<HTMLElement>('[data-menuitem]') ?? [])

  useEffect(() => {
    if (!open || focusOnOpen === null) return
    const list = items()
    const cible = focusOnOpen === 'first' ? list[0] : list[list.length - 1]
    cible?.focus()
    setFocusOnOpen(null)
  }, [open, focusOnOpen])

  // Changer de page referme : sinon le menu reste ouvert par-dessus l'écran
  // qu'on vient de demander.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Un clic ailleurs referme. `mousedown` plutôt que `click` : on ferme au
  // moment où l'utilisateur désigne autre chose, pas après que le clic a été
  // relâché sur un élément qui a peut-être déjà bougé.
  useEffect(() => {
    if (!open) return
    const dehors = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', dehors)
    return () => document.removeEventListener('mousedown', dehors)
  }, [open])

  /** Fermer en rendant le focus au déclencheur — sans quoi il retombe au corps. */
  const fermerEtRevenir = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      if (!open) return
      event.preventDefault()
      fermerEtRevenir()
      return
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()

    if (!open) {
      setOpen(true)
      setFocusOnOpen(event.key === 'ArrowUp' || event.key === 'End' ? 'last' : 'first')
      return
    }

    const list = items()
    if (list.length === 0) return
    const index = list.indexOf(document.activeElement as HTMLElement)
    const cible =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? list.length - 1
          : index < 0
            ? 0
            : event.key === 'ArrowDown'
              ? (index + 1) % list.length
              : (index - 1 + list.length) % list.length
    list[cible]?.focus()
  }

  // La tabulation sort du menu : on referme derrière elle, dans les deux sens.
  // `relatedTarget` nul veut dire que le focus a quitté la page ou est retombé
  // au corps — on ferme aussi.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!open) return
    if (event.relatedTarget && wrapper.current?.contains(event.relatedTarget)) return
    setOpen(false)
  }

  return (
    <div className={styles.wrapper} ref={wrapper} onKeyDown={onKeyDown} onBlur={onBlur}>
      <button
        type="button"
        ref={trigger}
        className={styles.trigger}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((value) => !value)
          setFocusOnOpen(null)
        }}
      >
        <IdentityDot account={user} withName />
        {/* Le nom seul ne dit pas ce qu'on ouvre ; l'ajout reste dans le nom
            accessible, dont le libellé visible demeure le début. */}
        <span className="sr-only"> — mon compte</span>
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>

      <div id={panelId} className={styles.panel} hidden={!open}>
        <ul className={styles.list}>
          {ENTRIES.map((entry) => (
            <li key={entry.to}>
              <NavLink
                to={entry.to}
                data-menuitem
                className={({ isActive }) =>
                  isActive ? `${styles.item} ${styles.itemActive}` : styles.item
                }
              >
                {entry.label}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              data-menuitem
              className={`${styles.item} ${styles.logout}`}
              onClick={() => void logout()}
            >
              Déconnexion
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}
