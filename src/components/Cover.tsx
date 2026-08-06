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
/**
 * `2/3` n'a pas de classe : c'est le ratio écrit sur `.cover`, et lui ajouter
 * une classe qui le redit ne ferait qu'une seconde source pour la même valeur.
 */
const RATIO_CLASSES: Record<'2/3' | '3/4' | '16/9' | '1/1', string | undefined> = {
  '2/3': undefined,
  '3/4': styles.ratio34,
  '16/9': styles.ratio169,
  '1/1': styles.ratio11,
}

export default function Cover({
  url,
  title,
  type,
  size = 'base',
  ratio = '2/3',
}: {
  url: string | null
  title: string
  type: MediaType
  /**
   * `tile` est le format de la mosaïque d'un rayon : la tuile impose sa
   * **hauteur** (la rangée de la grille), la jaquette en déduit sa largeur. Les
   * autres formats font l'inverse — largeur imposée, hauteur déduite.
   *
   * C'est ce qui permet à une tuile de trois colonnes et à une tuile d'une
   * colonne de faire la même hauteur sans jamais recadrer une jaquette : elle
   * est posée au centre, et ce qui reste autour est la surface creuse.
   */
  size?: 'sm' | 'base' | 'lg' | 'full' | 'tile'
  /**
   * Le ratio est une propriété du composant : une page qui le veut différent le
   * demande, elle ne va pas réécrire l'intérieur de la couverture depuis sa
   * propre feuille.
   *
   * Les quatre valeurs sont celles des rayons — 2:3 pour les livres, les films
   * et les mangas, 16:9 pour les séries et les jeux, 1:1 pour les disques —
   * plus le 3:4 du grand format d'une fiche. Une jaquette **n'est jamais
   * recadrée** : c'est le ratio du médium qui commande, pas la place
   * disponible.
   */
  ratio?: '2/3' | '3/4' | '16/9' | '1/1'
}) {
  // On mémorise l'URL en échec, pas un booléen : quand le back renvoie une
  // nouvelle jaquette, l'image est retentée d'elle-même.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const ratioClass = RATIO_CLASSES[ratio]
  const className = `${styles.cover} ${styles[size]}${ratioClass ? ` ${ratioClass}` : ''}`

  // Les jaquettes recopiées par l'API arrivent en URL absolue, composée depuis
  // une base qui n'est pas forcément joignable d'ici. On la ramène à un chemin
  // relatif pour passer par le proxy.
  const src = coverSrc(url)

  if (src && src !== brokenUrl) {
    return (
      // `data-media-type` porte la teinte du rayon : `global.css` la lie à
      // `--type-hue`, et la feuille du composant n'a qu'à s'en servir.
      <div className={className} data-media-type={type}>
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
    <div className={`${className} ${styles.fallback}`} data-media-type={type}>
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
