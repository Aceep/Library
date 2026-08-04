import { Cover } from 'mediatheque-front'

/**
 * `size="base"` vaut `width: 100%` : la jaquette épouse la cellule qui la
 * porte. Les aperçus doivent donc fournir cette cellule — dans l'application
 * c'est toujours une carte de rayon ou une vignette de fil.
 */
const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, 132px)',
  gap: 'var(--space-4)',
  padding: 'var(--space-4)',
}

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 'var(--space-4)',
  padding: 'var(--space-4)',
}

/**
 * Une jaquette dessinée localement — les aperçus n'ont pas de réseau, et une
 * adresse distante retomberait sur le repli sans qu'on voie jamais le cas
 * « image présente ».
 */
const localCover =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300">
       <rect width="200" height="300" fill="#2f3d52"/>
       <circle cx="100" cy="112" r="52" fill="#e4572e"/>
       <rect x="28" y="196" width="144" height="9" rx="4" fill="#faf8f3"/>
       <rect x="28" y="217" width="104" height="9" rx="4" fill="#8d97a6"/>
     </svg>`,
  )

/**
 * Le repli est le cas nominal : `cover_url` est nul sur la grande majorité des
 * œuvres. Une lettre, le type en toutes lettres, et une teinte par type.
 */
export const ReplisParType = () => (
  <div style={grid}>
    <Cover url={null} title="Les Sept Samouraïs" type="movie" />
    <Cover url={null} title="Kaamelott" type="tv" />
    <Cover url={null} title="L'Anomalie" type="book" />
    <Cover url={null} title="Vinland Saga" type="comic_series" />
    <Cover url={null} title="Outer Wilds" type="game" />
  </div>
)

/** Avec une image, la jaquette occupe tout le cadre. */
export const AvecImage = () => (
  <div style={grid}>
    <Cover url={localCover} title="Outer Wilds" type="game" />
    <Cover url={localCover} title="Hyper Light Drifter" type="game" />
    <Cover url={localCover} title="Celeste" type="game" />
  </div>
)

/**
 * Les trois tailles : `sm` pour le fil d'activité, `base` pour les rayons (elle
 * suit sa cellule — ici 132 px), `lg` pour l'en-tête d'une fiche.
 */
export const Tailles = () => (
  <div style={row}>
    <Cover url={null} title="Dune" type="book" size="sm" />
    <div style={{ width: 132 }}>
      <Cover url={null} title="Dune" type="book" />
    </div>
    <Cover url={null} title="Dune" type="book" size="lg" />
  </div>
)

/**
 * Une adresse qui ne répond pas retombe sur le repli plutôt que de laisser un
 * cadre cassé — c'est le comportement du composant, pas un accident d'aperçu.
 */
export const AdresseCassee = () => (
  <div style={grid}>
    <Cover url="https://example.invalid/absente.jpg" title="Jaquette absente" type="movie" />
  </div>
)
