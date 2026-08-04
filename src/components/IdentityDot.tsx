import { useState } from 'react'
import type { Account } from '../api/schema'
import styles from './IdentityDot.module.css'

/**
 * Marque d'identité d'un compte : son avatar s'il en a un, sa couleur sinon.
 *
 * `identity_color` est fourni par l'API pour ça exactement — distinguer les
 * suivis d'un coup d'œil partout où ils sont affichés côte à côte. L'avatar
 * vient d'une adresse libre : elle peut ne rien servir, auquel cas on retombe
 * sur la pastille plutôt que d'afficher une image cassée.
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
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const markClass = size === 'sm' ? styles.dotSm : styles.dot
  const avatar = account.avatar_url && account.avatar_url !== brokenUrl ? account.avatar_url : null

  return (
    <span className={styles.wrapper}>
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className={`${markClass} ${styles.avatar}`}
          style={{ borderColor: account.identity_color }}
          loading="lazy"
          onError={() => setBrokenUrl(avatar)}
        />
      ) : (
        <span
          className={markClass}
          style={{ background: account.identity_color }}
          aria-hidden="true"
        />
      )}
      {withName ? <span className={styles.name}>{account.pseudo}</span> : null}
    </span>
  )
}
