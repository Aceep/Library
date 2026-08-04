import { Screenshots } from 'mediatheque-front'

/**
 * Captures dessinées localement : les adresses réelles viennent d'IGDB, et les
 * aperçus n'ont pas de réseau. Les teintes rappellent celles d'un jeu, pour
 * que la bande soit lisible comme une bande d'images.
 */
const shot = (from: string, to: string, sun: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
       <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
       </linearGradient></defs>
       <rect width="320" height="180" fill="url(#g)"/>
       <circle cx="252" cy="46" r="22" fill="${sun}"/>
       <path d="M0 148 L74 104 L136 142 L206 96 L320 152 L320 180 L0 180 Z" fill="#1b2430" opacity="0.85"/>
     </svg>`,
  )

const frame: React.CSSProperties = { padding: 'var(--space-4)', maxWidth: '46rem' }

/** La bande d'images d'un jeu — le seul type d'œuvre qui en porte. */
export const Bande = () => (
  <div style={frame}>
    <Screenshots
      urls={[
        shot('#2f3d52', '#7a5a48', '#e4572e'),
        shot('#243b3b', '#6a7a4a', '#e8c46a'),
        shot('#3a2f52', '#8a5a72', '#f0e0d0'),
      ]}
      title="Outer Wilds"
    />
  </div>
)

/**
 * Une vignette qui ne répond plus s'efface au lieu de laisser un cadre vide :
 * ici trois adresses, dont une morte — la bande n'en montre que deux.
 */
export const VignetteCassee = () => (
  <div style={frame}>
    <Screenshots
      urls={[
        shot('#2f3d52', '#7a5a48', '#e4572e'),
        'https://example.invalid/capture.jpg',
        shot('#243b3b', '#6a7a4a', '#e8c46a'),
      ]}
      title="Outer Wilds"
    />
  </div>
)

/** Une seule capture reste une bande — elle ne s'étale pas pour compenser. */
export const UneSeule = () => (
  <div style={frame}>
    <Screenshots urls={[shot('#3a2f52', '#8a5a72', '#f0e0d0')]} title="Celeste" />
  </div>
)
