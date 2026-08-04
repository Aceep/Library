import { IdentityDot } from 'mediatheque-front'

const account = (
  pseudo: string,
  identity_color: string,
  avatar_url: string | null = null,
  role: 'user' | 'admin' = 'user',
) => ({
  id: `00000000-0000-4000-8000-${pseudo.padEnd(12, '0')}`,
  pseudo,
  avatar_url,
  identity_color,
  role,
  deactivated: false,
})

/** Un avatar dessiné localement : les aperçus n'ont pas de réseau. */
const localAvatar =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
       <rect width="64" height="64" fill="#3a7ca5"/>
       <circle cx="32" cy="25" r="12" fill="#faf8f3"/>
       <path d="M8 64c0-14 11-22 24-22s24 8 24 22z" fill="#faf8f3"/>
     </svg>`,
  )

const column: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  padding: 'var(--space-4)',
}

/**
 * Sans avatar, c'est la couleur qui identifie — et c'est le cas courant.
 * Les teintes ne sont pas uniques : deux comptes peuvent partager la même,
 * ce que l'application signale sans jamais l'interdire.
 */
export const ParCouleur = () => (
  <div style={column}>
    <IdentityDot account={account('Alice', '#e4572e')} withName />
    <IdentityDot account={account('Bob', '#3a7ca5')} withName />
    <IdentityDot account={account('Camille', '#4f7a52')} withName />
    <IdentityDot account={account('Dan', '#b07d2b')} withName />
  </div>
)

/** Avec un avatar, la couleur passe en liseré — elle continue de distinguer. */
export const AvecAvatar = () => (
  <div style={column}>
    <IdentityDot account={account('Elior', '#c2410c', localAvatar)} withName />
    <IdentityDot account={account('Elior', '#c2410c', localAvatar)} />
  </div>
)

/** Deux tailles : `sm` pour les listes denses, `base` partout ailleurs. */
export const Tailles = () => (
  <div style={{ ...column, gap: 'var(--space-4)' }}>
    <IdentityDot account={account('Alice', '#e4572e')} withName />
    <IdentityDot account={account('Alice', '#e4572e')} withName size="sm" />
  </div>
)

/**
 * Une adresse d'avatar qui ne répond pas retombe sur la pastille plutôt que
 * d'afficher une image cassée.
 */
export const AvatarInjoignable = () => (
  <div style={column}>
    <IdentityDot
      account={account('Alice', '#e4572e', 'https://example.invalid/avatar.png')}
      withName
    />
  </div>
)
