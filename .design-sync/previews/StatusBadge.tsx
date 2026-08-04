import { StatusBadge } from 'mediatheque-front'

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
      <div key={entry.pseudo} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: entry.color,
            flex: 'none',
          }}
        />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-soft)', minWidth: '5rem' }}>
          {entry.pseudo}
        </span>
        <StatusBadge status={entry.status} />
        {entry.rating !== null ? (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)' }}>
            {entry.rating}/10
          </span>
        ) : null}
      </div>
    ))}
  </div>
)
