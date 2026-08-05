import type { ReactNode } from 'react'
import type { Badge } from '../api/schema'
import styles from './BadgeMedal.module.css'

/**
 * Un badge, partout où il se montre : sur la quête qui le décerne, sur le
 * profil de qui l'a obtenu, et sur l'écran des badges.
 *
 * **Il ne se retire jamais** — c'est un fait daté, pas un état courant. D'où
 * l'obtention marquée par une date et non par une case, et un badge encore à
 * obtenir montré quand même : savoir ce qu'on gagne fait partie de la
 * proposition.
 *
 * L'état se joue en **valeur** et non en teinte : la couleur d'un badge lui
 * appartient, comme celle d'un membre, et ne peut donc pas dire s'il est acquis.
 * Un badge à obtenir est rendu en gris et à demi-ton ; obtenu, il retrouve sa
 * couleur. C'est la seule différence, et elle survit au daltonisme comme au
 * noir et blanc.
 */
export default function BadgeMedal({
  badge,
  obtenu,
  note,
  size = 'base',
  className,
}: {
  badge: Badge
  obtenu: boolean
  /** Ce qui se dit sous le nom : la date d'obtention, ou la progression. */
  note?: ReactNode
  size?: 'sm' | 'base'
  /** L'espacement appartient à l'endroit où le badge est posé, pas au badge. */
  className?: string
}) {
  if (!badge) return null

  const classes = [
    styles.medal,
    size === 'sm' ? styles.medalSm : '',
    obtenu ? styles.won : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes}>
      <span className={styles.icon} style={{ background: badge.color }} aria-hidden="true">
        {badge.icon}
      </span>
      <span className={styles.body}>
        <strong className={styles.name}>{badge.name}</strong>
        <span className={styles.state}>{obtenu ? 'obtenu' : 'à obtenir'}</span>
        {note ? <span className={styles.note}>{note}</span> : null}
        {badge.description ? <span className={styles.description}>{badge.description}</span> : null}
      </span>
    </span>
  )
}
