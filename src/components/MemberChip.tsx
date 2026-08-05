import type { CSSProperties } from 'react'
import type { Account } from '../api/schema'
import styles from './MemberChip.module.css'

/**
 * Un membre, en pastille bordée.
 *
 * **La forme est ce qui distingue les deux systèmes de couleur.** Un rayon est
 * un *aplat* à texte quasi noir ; un membre est une *pastille bordée* portant
 * sa propre encre en texte et en filet, sur fond transparent. Les deux se
 * croisent sur la même ligne — dans une tuile « en cours », dans un murmure —
 * et c'est cette différence de forme, pas de teinte, qui les garde lisibles
 * ensemble. Ne jamais l'inverser : une pastille remplie devient un rayon.
 *
 * Ce n'est ni un avatar ni un rond : la spécification les exclut tous les deux.
 *
 * L'encre descend par `--identity`, posée en style inline — c'est le seul usage
 * normal du style inline dans un composant, avec les dimensions calculées.
 */
export default function MemberChip({
  account,
  size = 'base',
}: {
  account: Account
  size?: 'sm' | 'base'
}) {
  return (
    <span
      className={`${styles.chip} ${size === 'sm' ? styles.sm : ''}`}
      style={{ '--identity': account.identity_color } as CSSProperties}
      // Les initiales seules ne nomment personne pour qui n'a pas la page sous
      // les yeux : le pseudo entier reste le nom accessible.
      aria-label={account.pseudo}
      title={account.pseudo}
    >
      {initials(account.pseudo)}
    </span>
  )
}

/**
 * « alice » → `A.` · « marie-claire » → `M.C.`
 *
 * La maquette montre des initiales à deux lettres parce qu'elle suppose des
 * prénoms-noms ; ici un pseudo est libre et souvent d'un seul tenant. On prend
 * donc la première lettre de chaque mot, deux au plus, plutôt que d'inventer
 * une seconde lettre qui ne veut rien dire.
 */
export const initials = (pseudo: string): string => {
  const parts = pseudo
    .split(/[\s._-]+/u)
    .map((part) => part.match(/\p{L}|\p{N}/u)?.[0])
    .filter((letter): letter is string => Boolean(letter))
    .slice(0, 2)

  if (parts.length === 0) return '?'
  return parts.map((letter) => `${letter.toLocaleUpperCase('fr')}.`).join('')
}
