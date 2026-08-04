import { useState } from 'react'
import styles from './Screenshots.module.css'

/**
 * Captures d'un jeu — les seules images d'une fiche, en dehors de la jaquette.
 *
 * Les adresses viennent d'IGDB et peuvent ne plus répondre : une vignette
 * cassée s'efface au lieu de laisser un cadre vide. Si toutes tombent, la
 * bande disparaît d'elle-même.
 */
export default function Screenshots({ urls, title }: { urls: string[]; title: string }) {
  const [broken, setBroken] = useState<string[]>([])
  const visible = urls.filter((url) => !broken.includes(url))

  if (visible.length === 0) return null

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Images</h2>
      <ul className={styles.strip}>
        {visible.map((url) => (
          <li key={url} className={styles.item}>
            <a href={url} target="_blank" rel="noreferrer" title="Ouvrir en grand">
              <img
                src={url}
                alt={`Capture de ${title}`}
                className={styles.image}
                loading="lazy"
                onError={() => setBroken((previous) => [...previous, url])}
              />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
