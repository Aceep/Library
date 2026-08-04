import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { isDerivedStatusType } from '../api/schema'
import type { Account, LibraryItem, MediaType, UserTracking } from '../api/schema'
import Cover from './Cover'
import ProgressBar from './ProgressBar'
import StatusBadge, { NewContentBadge } from './StatusBadge'
import styles from './MediaCard.module.css'

/**
 * Une œuvre en vignette, avec les suivis de chacun.
 *
 * Le même composant sert au rayon et à la bibliothèque d'un membre :
 * `GET /users/:id/media` rend **exactement** la forme de `GET /media`, et c'est
 * délibéré côté API — deux composants pour deux fois la même charge utile
 * finiraient par diverger.
 *
 * `progress` et `tracking.me` restent **mon** point de vue dans les deux cas,
 * même sur le profil de quelqu'un d'autre : c'est ce que dit le contrat, et
 * c'est pourquoi rien ici ne dépend de la page qui l'affiche.
 */
export default function MediaCard({ item, me }: { item: LibraryItem; me: Account }) {
  return (
    // La teinte du rayon arrive par l'attribut, comme dans `Cover` : elle ne
    // teinte ici qu'un filet déjà présent — celui qui sépare la notice de la
    // pile de suivi.
    <li className={styles.card} data-media-type={item.type}>
      <Link to={`/media/${item.id}`} className={styles.cardLink}>
        <Cover url={item.cover_url} title={item.title} type={item.type} size="lg" />

        <div className={styles.cardBody}>
          <p className={styles.cardTitle}>{item.title}</p>
          {item.year ? <p className={styles.cardYear}>{item.year}</p> : null}

          {/* Nul sur les types sans éléments à cocher : le composant s'efface. */}
          <ProgressBar
            progress={item.progress}
            color={me.identity_color}
            label={`Progression sur ${item.title}`}
          />

          <div className={styles.trackings}>
            <TrackingLine
              tracking={item.tracking.me}
              color={me.identity_color}
              pseudo={me.pseudo}
              type={item.type}
            />
            {/* Un rayon reste lisible : on nomme les abonnements, on compte le
                reste. La vignette n'est pas l'endroit où tout déballer. */}
            {item.tracking.following.map((entry) => (
              <TrackingLine
                key={entry.user.id}
                tracking={entry.tracking}
                color={entry.user.identity_color}
                pseudo={entry.user.pseudo}
                type={item.type}
              />
            ))}
            {item.tracking.others.count > 0 ? (
              <p className={styles.othersLine}>
                +{item.tracking.others.count} autre
                {item.tracking.others.count > 1 ? 's' : ''}
                {item.tracking.others.average_rating !== null
                  ? ` · ${item.tracking.others.average_rating}/10 en moyenne`
                  : ''}
              </p>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  )
}

/**
 * Une ligne par compte. Un suivi `null` n'est pas un `todo` : c'est « ne suit
 * pas du tout cette œuvre », et les deux ne se disent pas de la même façon.
 */
function TrackingLine({
  tracking,
  color,
  pseudo,
  type,
}: {
  tracking: UserTracking | null
  color: string
  pseudo: string
  type: MediaType
}) {
  return (
    // La couleur du membre descend par `--identity` : elle teinte le point et
    // la note d'un seul geste, et n'est jamais écrite en CSS.
    <div className={styles.trackingLine} style={{ '--identity': color } as CSSProperties}>
      <span className={styles.trackingDot} style={{ background: color }} aria-hidden="true" />
      <span className={styles.trackingName}>{pseudo}</span>
      {tracking ? (
        <span className={styles.trackingTags}>
          <StatusBadge status={tracking.status} />
          {/* « Un chiffre, pas une pastille » : la note se lit sur 10 sans le
              répéter, comme dans une notice de catalogue. */}
          {tracking.rating !== null ? (
            <span className={styles.rating}>{tracking.rating}</span>
          ) : null}
          {/* Signe distinct de la note, pas un seuil de note. */}
          {tracking.favorite ? <span className={styles.favorite}>Coup de cœur</span> : null}
          {tracking.owned ? <span className={styles.owned}>Possédé</span> : null}
          {/* « Du neuf » n'a de sens que là où du contenu peut s'ajouter. */}
          {tracking.has_new_content && isDerivedStatusType(type) ? <NewContentBadge /> : null}
        </span>
      ) : (
        <span className={styles.notTracked}>ne suit pas</span>
      )}
    </div>
  )
}
