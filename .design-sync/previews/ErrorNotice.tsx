import { ErrorNotice } from 'mediatheque-front'

const frame: React.CSSProperties = {
  padding: 'var(--space-4)',
  maxWidth: '38rem',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
}

/**
 * Le message du serveur est affiché **tel quel** : le back rédige en français,
 * avec un contexte que le front n'a pas (le titre de l'œuvre, la durée
 * d'attente). Écrire notre propre catalogue reviendrait à le perdre.
 */
export const MessageDuServeur = () => (
  <div style={frame}>
    <ErrorNotice
      error={new Error("La source ne répond pas pour l'instant. Réessaie dans quelques minutes.")}
      onRetry={() => {}}
    />
  </div>
)

/** Sans `onRetry`, pas de bouton : on ne propose pas un geste qui ne sert à rien. */
export const SansReprise = () => (
  <div style={frame}>
    <ErrorNotice
      error={new Error("Ce tome a déjà été ajouté sous le numéro 12 — les numéros sont uniques.")}
    />
  </div>
)

/** Le ton `notice` pour ce qui informe sans être une panne. */
export const TonNotice = () => (
  <div style={frame}>
    <ErrorNotice
      error={new Error(
        "La recherche externe est momentanément indisponible. Les autres rayons fonctionnent normalement.",
      )}
      tone="notice"
    />
  </div>
)

/** Une erreur qui n'est pas de l'API tombe sur le message générique. */
export const ErreurInattendue = () => (
  <div style={frame}>
    <ErrorNotice error={{ pas: 'une erreur' }} onRetry={() => {}} />
  </div>
)
