import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useReference } from '../reference/ReferenceContext'
import type { Account, LibraryItem, MediaType, OthersSummary, UserTracking } from '../api/schema'
import Cover from './Cover'
import ProgressBar from './ProgressBar'
import StatusBadge, { NewContentBadge } from './StatusBadge'
import styles from './MediaCard.module.css'

/**
 * Combien d'abonnements la pile nomme avant de basculer dans le compte.
 *
 * Deux, plus moi, plus la ligne de reste : quatre lignes, la hauteur que
 * `.trackings` réserve. Changer ce nombre sans changer `--pile-rows` dans la
 * feuille rend les vignettes de nouveau inégales.
 */
const MAX_FOLLOWED_LINES = 2

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
 *
 * **Toutes les vignettes ont la même hauteur**, quelle que soit la charge
 * utile — jaquette absente, année absente, type sans progression, un suiveur
 * ou douze. C'est un gabarit, pas une conséquence du contenu : chaque zone
 * garde sa place dans `MediaCard.module.css` même vide, et le nombre de
 * lignes de suivi est plafonné ici. Une grille dont les cases changent de
 * taille selon ce que le serveur a renvoyé ne se parcourt pas du regard.
 */
export default function MediaCard({ item, me }: { item: LibraryItem; me: Account }) {
  // Le plafond fait partie du gabarit : au-delà, la pile déborderait la
  // hauteur réservée et la vignette recommencerait à suivre son contenu.
  const named = item.tracking.following.slice(0, MAX_FOLLOWED_LINES)
  const unnamed = item.tracking.following.length - named.length

  return (
    // La teinte du rayon arrive par l'attribut, comme dans `Cover` : elle ne
    // teinte ici qu'un filet déjà présent — celui qui sépare la notice de la
    // pile de suivi.
    <li className={styles.card} data-media-type={item.type}>
      <Link to={`/media/${item.id}`} className={styles.cardLink}>
        <Cover url={item.cover_url} title={item.title} type={item.type} size="lg" />

        <div className={styles.cardBody}>
          <p className={styles.cardTitle}>{item.title}</p>

          {/* Fente à hauteur réservée : l'année manque souvent et `ProgressBar`
              s'efface sur les types sans éléments à cocher. Les deux gardent
              leur place plutôt que de faire remonter la pile de suivi. */}
          <div className={styles.cardMeta}>
            {item.year ? <p className={styles.cardYear}>{item.year}</p> : null}
            <ProgressBar
              progress={item.progress}
              color={me.identity_color}
              label={`Progression sur ${item.title}`}
            />
          </div>

          <div className={styles.trackings}>
            <TrackingLine
              tracking={item.tracking.me}
              color={me.identity_color}
              pseudo={me.pseudo}
              type={item.type}
            />
            {/* Un rayon reste lisible : on nomme les abonnements, on compte le
                reste. La vignette n'est pas l'endroit où tout déballer. */}
            {named.map((entry) => (
              <TrackingLine
                key={entry.user.id}
                tracking={entry.tracking}
                color={entry.user.identity_color}
                pseudo={entry.user.pseudo}
                type={item.type}
              />
            ))}
            {/* Dernière ligne du gabarit. Vide, elle ne rend rien : c'est la
                feuille qui lui garde sa place, pas un texte de repli. */}
            {unnamed > 0 || item.tracking.others.count > 0 ? (
              <p className={styles.othersLine}>{restLabel(unnamed, item.tracking.others)}</p>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  )
}

/**
 * Ce que la pile ne nomme pas : les abonnements au-delà du plafond, puis les
 * membres que je ne suis pas.
 *
 * Les deux comptes restent **distincts**. `others` est un agrégat du serveur —
 * `average_rating` ne porte que sur lui — et additionner nos lignes masquées
 * dedans fabriquerait une moyenne que personne n'a calculée.
 */
const restLabel = (unnamed: number, others: OthersSummary): string => {
  const parts = []
  if (unnamed > 0) parts.push(`+${unnamed} abonnement${unnamed > 1 ? 's' : ''}`)
  if (others.count > 0) {
    parts.push(
      `+${others.count} autre${others.count > 1 ? 's' : ''}` +
        (others.average_rating !== null ? ` · ${others.average_rating}/10 en moyenne` : ''),
    )
  }
  return parts.join(' · ')
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
  const { isDerivedStatusType } = useReference()

  return (
    // La couleur du membre descend par `--identity` : elle teinte le point et
    // la note d'un seul geste, et n'est jamais écrite en CSS.
    <div className={styles.trackingLine} style={{ '--identity': color } as CSSProperties}>
      <span className={styles.trackingDot} style={{ background: color }} aria-hidden="true" />
      <span className={styles.trackingName}>{pseudo}</span>
      {tracking ? (
        <span className={styles.trackingTags}>
          <StatusBadge status={tracking.status} type={type} />
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
