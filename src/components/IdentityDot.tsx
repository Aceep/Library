import type { Account } from '../api/schema'
import styles from './IdentityDot.module.css'

/**
 * Pastille à la couleur d'identité d'un compte.
 * `identity_color` est fourni par l'API pour ça exactement : distinguer les
 * suivis d'un coup d'œil partout où ils sont affichés côte à côte.
 */
export default function IdentityDot({
  account,
  withName = false,
  size = 'base',
}: {
  account: Account
  withName?: boolean
  size?: 'sm' | 'base'
}) {
  return (
    <span className={styles.wrapper}>
      <span
        className={size === 'sm' ? styles.dotSm : styles.dot}
        style={{ background: account.identity_color }}
        aria-hidden="true"
      />
      {withName ? <span className={styles.name}>{account.pseudo}</span> : null}
    </span>
  )
}
