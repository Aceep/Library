import { externalLinks } from '../api/externalLinks'
import type { MediaDetail } from '../api/schema'
import styles from './MediaMetadata.module.css'

/**
 * Métadonnées propres à chaque type. `MediaDetail` est une union discriminée
 * sur `type` : on ne teste jamais la présence d'un champ pour deviner la forme,
 * on lit le discriminant — c'est lui qui fait foi.
 *
 * Tous les scalaires sont nullables, les listes toujours présentes mais parfois
 * vides : chaque entrée qui n'a rien à dire disparaît au lieu d'afficher un
 * intitulé vide.
 */
export default function MediaMetadata({ detail }: { detail: MediaDetail }) {
  const rows = buildRows(detail)
  const links = externalLinks(detail)
  const trailer = detail.type === 'movie' ? detail.metadata.trailer_url : null

  if (rows.length === 0 && links.length === 0 && !trailer) return null

  return (
    <div className={styles.block}>
      {rows.length > 0 ? (
        <dl className={styles.list}>
          {rows.map((row) => (
            <div key={row.label} className={styles.row}>
              <dt className={styles.label}>{row.label}</dt>
              <dd className={styles.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {/* Sortir de l'application est parfois ce qu'on veut : revoir la
          bande-annonce, lire la fiche d'origine. Ces liens ouvrent ailleurs. */}
      {trailer || links.length > 0 ? (
        <p className={styles.links}>
          {trailer ? (
            <a href={trailer} target="_blank" rel="noreferrer" className={styles.link}>
              Bande-annonce
            </a>
          ) : null}
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className={styles.link}
            >
              {link.label}
            </a>
          ))}
        </p>
      ) : null}
    </div>
  )
}

interface Row {
  label: string
  value: string
}

const list = (values: string[] | null | undefined) =>
  values && values.length > 0 ? values.join(', ') : null

/** La distribution porte le rôle tenu quand la source le connaît. */
const castList = (
  values: Array<{ name: string; character: string | null }> | null | undefined,
) =>
  list(
    values?.map((entry) => (entry.character ? `${entry.name} (${entry.character})` : entry.name)),
  )

const buildRows = (detail: MediaDetail): Row[] => {
  const rows: Array<[string, string | null]> = []

  switch (detail.type) {
    case 'movie': {
      const meta = detail.metadata
      rows.push(
        ['Réalisation', meta.director],
        ['Distribution', castList(meta.cast)],
        ['Durée', meta.runtime_min === null ? null : `${meta.runtime_min} min`],
        ['Genres', list(meta.genres)],
        ['Pays', list(meta.countries)],
        ['Note de la source', meta.vote_average === null ? null : `${meta.vote_average}/10`],
      )
      break
    }
    case 'tv': {
      const meta = detail.metadata
      rows.push(
        ['Création', list(meta.creators)],
        ['Distribution', castList(meta.cast)],
        ['Diffuseur', meta.network],
        ['Statut de la série', meta.status],
        ['Genres', list(meta.genres)],
        [
          'Volume',
          meta.season_count === null && meta.episode_count === null
            ? null
            : [
                meta.season_count === null ? null : `${meta.season_count} saisons`,
                meta.episode_count === null ? null : `${meta.episode_count} épisodes`,
              ]
                .filter(Boolean)
                .join(' · '),
        ],
        ['Note de la source', meta.vote_average === null ? null : `${meta.vote_average}/10`],
      )
      break
    }
    case 'book': {
      const meta = detail.metadata
      rows.push(
        ['Auteur', list(meta.authors)],
        ['Éditeur', meta.publisher],
        ['Pages', meta.page_count === null ? null : String(meta.page_count)],
        ['Langue', meta.language],
        ['Série', meta.series],
        ['Genres', list(meta.genres)],
        ['ISBN', meta.isbn13 ?? meta.isbn10],
      )
      break
    }
    case 'comic_series': {
      const meta = detail.metadata
      rows.push(
        ['Auteur', list(meta.authors)],
        ['Éditeur français', meta.publisher_fr],
        ['Statut de parution', meta.status],
        ['Prépublication', meta.serialization],
        [
          'Volume',
          meta.volume_count === null && meta.chapter_count === null
            ? null
            : [
                meta.volume_count === null ? null : `${meta.volume_count} tomes`,
                meta.chapter_count === null ? null : `${meta.chapter_count} chapitres`,
              ]
                .filter(Boolean)
                .join(' · '),
        ],
        ['Genres', list(meta.genres)],
        ['Note de la source', meta.vote_average === null ? null : `${meta.vote_average}/10`],
      )
      break
    }
    case 'game': {
      const meta = detail.metadata
      rows.push(
        ['Développeur', meta.developer],
        ['Éditeur', meta.publisher],
        ['Plateformes', list(meta.platforms)],
        ['Genres', list(meta.genres)],
        [
          'Pour en voir le bout',
          meta.completion_hours === null ? null : `environ ${meta.completion_hours} h`,
        ],
        ['Note de la source', meta.vote_average === null ? null : `${meta.vote_average}/10`],
      )
      break
    }
  }

  return rows
    .filter((row): row is [string, string] => row[1] !== null && row[1] !== '')
    .map(([label, value]) => ({ label, value }))
}
