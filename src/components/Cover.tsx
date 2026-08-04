import { useState } from 'react'
import { coverSrc } from '../api/covers'
import type { MediaType } from '../api/schema'
import { typeLabel } from '../api/schema'
import styles from './Cover.module.css'

/**
 * `cover_url` est nul sur la grande majorité des œuvres — c'est le cas nominal,
 * pas l'exception. Le repli n'est donc pas un pis-aller : c'est ce qu'on voit
 * la plupart du temps, et il doit rester lisible.
 *
 * Une URL présente ne garantit pas une image : les œuvres de démo pointent sur
 * `example.invalid`, et une jaquette fraîchement ajoutée n'est recopiée
 * localement qu'au bout de quelques secondes. On bascule donc aussi sur le
 * repli quand le chargement échoue, sans jamais mettre l'URL en cache sous
 * l'identifiant de l'œuvre.
 */
export default function Cover({
  url,
  title,
  type,
  size = 'base',
}: {
  url: string | null
  title: string
  type: MediaType
  size?: 'sm' | 'base' | 'lg'
}) {
  // On mémorise l'URL en échec, pas un booléen : quand le back renvoie une
  // nouvelle jaquette, l'image est retentée d'elle-même.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const className = `${styles.cover} ${styles[size]}`

  // Les jaquettes recopiées par l'API arrivent en URL absolue, composée depuis
  // une base qui n'est pas forcément joignable d'ici. On la ramène à un chemin
  // relatif pour passer par le proxy.
  const src = coverSrc(url)

  if (src && src !== brokenUrl) {
    return (
      <div className={className}>
        <img
          src={src}
          alt=""
          className={styles.image}
          loading="lazy"
          onError={() => setBrokenUrl(src)}
        />
      </div>
    )
  }

  // Le repli compose le titre, pas une initiale : une notice de catalogue se
  // lit, elle ne s'abrège pas. En vignette (`sm`), la place manque et on
  // retombe sur l'initiale seule.
  return (
    <div className={`${className} ${styles.fallback}`} data-type={type}>
      <span className={styles.typeTag}>{typeLabel(type)}</span>
      <span className={styles.fallbackTitle}>
        {size === 'sm' ? firstLetter(title) : title}
      </span>
    </div>
  )
}

const firstLetter = (title: string) => {
  const match = title.match(/\p{L}|\p{N}/u)
  return (match?.[0] ?? '?').toLocaleUpperCase('fr')
}
