import { ProgressBar } from 'mediatheque-front'

const frame: React.CSSProperties = {
  padding: 'var(--space-4)',
  maxWidth: '22rem',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
}

const caption: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--ink-soft)',
  marginBottom: 'var(--space-1)',
}

/**
 * La barre est teintée par la couleur d'identité du compte : sur une fiche,
 * plusieurs progressions se lisent côte à côte et seule la teinte les
 * distingue.
 */
export const ParCompte = () => (
  <div style={frame}>
    {[
      { pseudo: 'Alice', color: '#e4572e', progress: { checked: 7, total: 24 } },
      { pseudo: 'Bob', color: '#3a7ca5', progress: { checked: 19, total: 24 } },
      { pseudo: 'Camille', color: '#4f7a52', progress: { checked: 24, total: 24 } },
    ].map((entry) => (
      <div key={entry.pseudo}>
        <p style={caption}>{entry.pseudo}</p>
        <ProgressBar
          progress={entry.progress}
          color={entry.color}
          label={`Progression de ${entry.pseudo}`}
        />
      </div>
    ))}
  </div>
)

/** Sans couleur, la barre retombe sur l'encre douce du thème. */
export const SansCouleur = () => (
  <div style={frame}>
    <ProgressBar progress={{ checked: 3, total: 8 }} label="Progression" />
  </div>
)

/**
 * `total` peut valoir 0 — une série dont la source n'a jamais publié la liste
 * des épisodes. La barre ne s'affiche pas plutôt que de montrer un `NaN%` :
 * c'est l'absence qui est le comportement juste.
 */
export const TotalInconnu = () => (
  <div style={frame}>
    <div>
      <p style={caption}>24 épisodes connus</p>
      <ProgressBar progress={{ checked: 5, total: 24 }} color="#e4572e" label="Progression" />
    </div>
    <div>
      <p style={caption}>Aucun épisode connu — la barre s'efface</p>
      <ProgressBar progress={{ checked: 0, total: 0 }} color="#e4572e" label="Progression" />
      <p style={{ ...caption, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
        (rien ne s'affiche ici, volontairement)
      </p>
    </div>
  </div>
)
