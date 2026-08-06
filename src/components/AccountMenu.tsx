import { useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSession } from '../session/SessionContext'
import MemberChip from './MemberChip'
import styles from './AccountMenu.module.css'

/**
 * Tout ce que le bandeau ne montre plus.
 *
 * La ligne de partage **n'est plus la fréquence**. Le bandeau appartient
 * désormais à ses huit destinations — les six rayons, les quêtes, le cercle —
 * et il n'a plus la place d'une seconde rangée de liens : ce qui n'y figure pas
 * descend ici, quelle que soit la fréquence à laquelle on s'y rend.
 *
 * `Les membres` et `Les quêtes` **ne sont plus listés ici** : ils sont montés
 * dans la rangée du bandeau. Les y laisser ferait deux chemins vers le même
 * écran à trente centimètres l'un de l'autre.
 *
 * Les nouveautés restent dehors, et pour une autre raison : leur libellé porte
 * un compteur. Le replier reviendrait à cacher une notification.
 *
 * Deux groupes : ce qui regarde le cercle, puis ce qui m'appartient. Le second
 * finit par la déconnexion, qui n'est l'affaire de personne d'autre.
 */
const GROUPS: { title: string; entries: { to: string; label: string; admin?: true }[] }[] = [
  {
    title: 'Le cercle',
    entries: [
      { to: '/comparer', label: 'Comparer' },
      { to: '/veille', label: 'La veille' },
      { to: '/recherche', label: 'Ajouter une œuvre' },
      { to: '/administration/invitations', label: 'Inviter', admin: true },
      { to: '/administration/membres', label: 'Les comptes', admin: true },
    ],
  },
  {
    title: 'Moi',
    entries: [
      { to: '/badges', label: 'Mes badges' },
      { to: '/statistiques', label: 'Mes statistiques' },
      { to: '/mon-compte', label: 'Mon compte' },
    ],
  },
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
  const { user, logout, isAdmin } = useSession()
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
        <MemberChip account={user} />
        {/* La pastille ne porte que des initiales ; le nom accessible doit
            dire de qui et de quoi il s'agit. */}
        <span className="sr-only">{user.pseudo} — mon compte</span>
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>

      <div id={panelId} className={styles.panel} hidden={!open}>
        {GROUPS.map((group) => {
          const entries = group.entries.filter((entry) => !entry.admin || isAdmin)
          // Un groupe dont l'administration est le seul contenu n'a pas de
          // titre à afficher à qui n'est pas administrateur.
          if (entries.length === 0) return null

          return (
            <div key={group.title} className={styles.group}>
              <p className={styles.groupTitle}>{group.title}</p>
              <ul className={styles.list}>
                {entries.map((entry) => (
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
              </ul>
            </div>
          )
        })}
        <ul className={styles.list}>
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
