import { EmptyState } from 'mediatheque-front'

const frame: React.CSSProperties = { padding: 'var(--space-4)', maxWidth: '34rem' }

/**
 * Le lien d'action reprend l'idiome des boutons discrets de l'application :
 * filet fin, encre douce, pas d'aplat de couleur — le chromatique est réservé
 * à l'identité et aux statuts.
 */
const actionStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: 'var(--space-2) var(--space-4)',
  border: '1px solid var(--rule-strong)',
  borderRadius: 'var(--radius)',
  background: 'var(--paper-raised)',
  color: 'var(--ink)',
  fontSize: 'var(--text-sm)',
}

/** Le cas courant : un rayon encore vide, avec de quoi le remplir. */
export const AvecAction = () => (
  <div style={frame}>
    <EmptyState
      title="Aucune œuvre ici"
      note="Ce rayon est encore vide. Ajoute une œuvre depuis la recherche pour le remplir."
      action={<span style={actionStyle}>Ajouter une œuvre</span>}
    />
  </div>
)

/** Sans action : il n'y a rien à faire, seulement à comprendre. */
export const AvecNote = () => (
  <div style={frame}>
    <EmptyState
      title="Personne avec qui comparer"
      note="Cette page prendra son sens dès que tu suivras un autre membre de la médiathèque."
    />
  </div>
)

/** Réduit à son titre, quand la phrase suffit. */
export const TitreSeul = () => (
  <div style={frame}>
    <EmptyState title="Aucune invitation" />
  </div>
)

/**
 * Le vide n'est pas une erreur : l'API répond `200` avec des listes vides sur
 * un compte neuf. Les deux formulations coexistent dans l'application selon
 * qu'un filtre est actif ou non.
 */
export const FiltreSansResultat = () => (
  <div style={frame}>
    <EmptyState
      title="Aucune œuvre ici"
      note="Aucune œuvre de ce rayon ne correspond au filtre actif."
    />
  </div>
)
