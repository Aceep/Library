import { IdentityDot, StatusBadge } from 'mediatheque-front'

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: 'var(--space-4)',
}

/** Les trois statuts de suivi, dans l'ordre où une œuvre les traverse. */
export const Statuts = () => (
  <div style={row}>
    <StatusBadge status="todo" />
    <StatusBadge status="doing" />
    <StatusBadge status="done" />
  </div>
)

/**
 * En situation : le statut accompagne toujours un nom de compte et sa couleur
 * d'identité — seul, il ne dit pas de qui il parle.
 */
export const DansUneLigneDeSuivi = () => (
  <div style={{ ...row, flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-2)' }}>
    {[
      { pseudo: 'Alice', color: '#e4572e', status: 'doing' as const, rating: 8 },
      { pseudo: 'Bob', color: '#3a7ca5', status: 'done' as const, rating: 6 },
      { pseudo: 'Camille', color: '#4f7a52', status: 'todo' as const, rating: null },
    ].map((entry) => (
      <div
        key={entry.pseudo}
        style={
          {
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            '--identity': entry.color,
          } as React.CSSProperties
        }
      >
        {/* Le vrai composant d'identité, pas une pastille refaite à la main :
            l'aperçu suit `IdentityDot` quand il change. */}
        <span style={{ minWidth: '6rem' }}>
          <IdentityDot
            account={{
              id: `00000000-0000-4000-8000-${entry.pseudo}`,
              pseudo: entry.pseudo,
              avatar_url: null,
              identity_color: entry.color,
              role: 'user',
              deactivated: false,
            }}
            withName
          />
        </span>
        <StatusBadge status={entry.status} />
        {/* « Un chiffre, pas une pastille » : l'idiome de note de l'application. */}
        {entry.rating !== null ? (
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 17,
              color: 'var(--identity)',
            }}
          >
            {entry.rating}
          </span>
        ) : null}
      </div>
    ))}
  </div>
)
