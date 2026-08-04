import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TrackingPatch } from '../api/endpoints'
import { isDerivedStatusType, statusLabel } from '../api/schema'
import type {
  Account,
  FollowedTracking,
  MediaType,
  OthersSummary,
  TrackingStatus,
  UserTracking,
} from '../api/schema'
import ErrorNotice from './ErrorNotice'
import styles from './TrackingPanel.module.css'

const STATUSES: TrackingStatus[] = ['todo', 'doing', 'done']
const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * Mon suivi, seul panneau éditable de la fiche.
 *
 * Le sélecteur de statut n'apparaît pas sur `tv` ni `comic_series` : leur
 * statut est dérivé des épisodes ou des tomes cochés, et le back refuse de
 * l'écrire. On ne propose donc pas un geste qui serait rejeté.
 */
export default function TrackingPanel({
  tracking,
  type,
  account,
  onPatch,
  onRemove,
  isSaving,
  error,
}: {
  tracking: UserTracking | null
  type: MediaType
  account: Account
  onPatch: (patch: TrackingPatch) => void
  onRemove: () => void
  isSaving: boolean
  error: unknown
}) {
  if (!tracking) {
    return (
      <section className={styles.panel}>
        <h2 className={styles.heading}>
          <span
            className={styles.dot}
            style={{ background: account.identity_color }}
            aria-hidden="true"
          />
          Mon suivi
        </h2>
        <p className={styles.absent}>Cette œuvre n'est pas dans ta bibliothèque.</p>
        {/* Un patch vide suffit à créer le suivi, avec les valeurs par défaut
            du back (« à voir », non possédé). Même geste pour les cinq types,
            y compris ceux dont le statut est dérivé et ne s'écrit pas. */}
        <button
          type="button"
          className={styles.primary}
          onClick={() => onPatch({})}
          disabled={isSaving}
        >
          {isSaving ? 'Ajout…' : 'Ajouter à ma bibliothèque'}
        </button>
        {error ? <ErrorNotice error={error} /> : null}
      </section>
    )
  }

  return (
    <section className={styles.panel}>
      <h2 className={styles.heading}>
        <span
          className={styles.dot}
          style={{ background: account.identity_color }}
          aria-hidden="true"
        />
        Mon suivi
        {isSaving ? <span className={styles.saving}>enregistrement…</span> : null}
      </h2>

      {!isDerivedStatusType(type) ? (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Statut</span>
          <div className={styles.segmented} role="group" aria-label="Statut">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={styles.segment}
                aria-pressed={tracking.status === status}
                onClick={() => onPatch({ status })}
                disabled={isSaving}
              >
                {statusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.derived}>
          Statut&nbsp;: <strong>{statusLabel(tracking.status)}</strong>
          <span className={styles.derivedNote}>
            déduit de ce que tu as coché — il suit tout seul
          </span>
        </p>
      )}

      {/* `completed_at` ne s'efface jamais : c'est une trace, pas un statut.
          Le dire explicitement évite de lire « en cours » comme « jamais fini ». */}
      {tracking.completed_at && tracking.status !== 'done' ? (
        <p className={styles.trace}>Déjà terminé une fois, le {formatDate(tracking.completed_at)}.</p>
      ) : null}

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={tracking.owned}
          onChange={(event) => onPatch({ owned: event.target.checked })}
          disabled={isSaving}
        />
        Je le possède
      </label>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Ma note</span>
        <div className={styles.ratings}>
          {RATINGS.map((value) => (
            <button
              key={value}
              type="button"
              className={styles.rating}
              aria-pressed={tracking.rating === value}
              // Recliquer sa propre note l'enlève : c'est le seul moyen de
              // revenir à « pas encore noté ».
              onClick={() => onPatch({ rating: tracking.rating === value ? null : value })}
              disabled={isSaving}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <ReviewField review={tracking.review} onSave={(review) => onPatch({ review })} disabled={isSaving} />

      <div className={styles.dates}>
        <label className={styles.dateField}>
          <span className={styles.fieldLabel}>Commencé le</span>
          <input
            type="date"
            value={toDateInput(tracking.started_at)}
            onChange={(event) => onPatch({ started_at: event.target.value || null })}
            disabled={isSaving}
          />
        </label>
        <label className={styles.dateField}>
          <span className={styles.fieldLabel}>Terminé le</span>
          <input
            type="date"
            value={toDateInput(tracking.finished_at)}
            onChange={(event) => onPatch({ finished_at: event.target.value || null })}
            disabled={isSaving}
          />
        </label>
      </div>

      {error ? <ErrorNotice error={error} /> : null}

      <button type="button" className={styles.remove} onClick={onRemove} disabled={isSaving}>
        Retirer de ma bibliothèque
      </button>
    </section>
  )
}

/**
 * La critique s'enregistre sur demande, pas à chaque frappe : une requête par
 * caractère saturerait le back et ferait clignoter le panneau.
 */
function ReviewField({
  review,
  onSave,
  disabled,
}: {
  review: string | null
  onSave: (review: string | null) => void
  disabled: boolean
}) {
  const [draft, setDraft] = useState(review ?? '')

  // Le suivi peut changer sous nos pieds (autre onglet, rafraîchissement) :
  // on resynchronise tant que rien n'est en cours de rédaction.
  useEffect(() => {
    setDraft(review ?? '')
  }, [review])

  const dirty = draft !== (review ?? '')

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor="review">
        Ce que j'en ai pensé
      </label>
      <textarea
        id="review"
        className={styles.textarea}
        value={draft}
        rows={3}
        onChange={(event) => setDraft(event.target.value)}
        disabled={disabled}
        placeholder="Quelques mots, pour plus tard…"
      />
      {dirty ? (
        <div className={styles.reviewActions}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => onSave(draft.trim() === '' ? null : draft)}
            disabled={disabled}
          >
            Enregistrer
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => setDraft(review ?? '')}
            disabled={disabled}
          >
            Annuler
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Ce que les comptes suivis font de cette œuvre : lisible, jamais modifiable.
 * Aucun champ de saisie ici — ce n'est pas une désactivation, c'est une absence.
 *
 * Seuls les abonnements sont nommés. Les autres suiveurs se résument à un
 * compte et une moyenne : l'abonnement trie ce qu'on voit, il ne cache rien,
 * mais l'API ne déballe pas la liste entière pour autant.
 */
export function FollowedTrackings({
  following,
  others,
  type,
}: {
  following: FollowedTracking[]
  others: OthersSummary
  type: MediaType
}) {
  if (following.length === 0 && others.count === 0) {
    return (
      <section className={styles.panel}>
        <h2 className={styles.heading}>Ailleurs dans la médiathèque</h2>
        <p className={styles.absent}>Personne d'autre ne suit cette œuvre pour l'instant.</p>
      </section>
    )
  }

  return (
    <section className={styles.panel}>
      <h2 className={styles.heading}>Ailleurs dans la médiathèque</h2>

      {following.map((entry) => (
        <ReadOnlyTracking
          key={entry.user.id}
          tracking={entry.tracking}
          account={entry.user}
          type={type}
        />
      ))}

      {others.count > 0 ? (
        <p className={styles.others}>
          {others.count} autre{others.count > 1 ? 's' : ''} membre
          {others.count > 1 ? 's' : ''} suit{others.count > 1 ? 'vent' : ''} cette œuvre
          {others.average_rating !== null ? (
            <>
              , note moyenne <strong>{others.average_rating}/10</strong>
            </>
          ) : null}
          .
        </p>
      ) : null}
    </section>
  )
}

function ReadOnlyTracking({
  tracking,
  account,
  type,
}: {
  tracking: UserTracking | null
  account: Account
  type: MediaType
}) {
  return (
    <div className={styles.followedBlock}>
      <h3 className={styles.followedName}>
        <span
          className={styles.dot}
          style={{ background: account.identity_color }}
          aria-hidden="true"
        />
        <Link to={`/membres/${account.id}`} className={styles.followedLink}>
          {account.pseudo}
        </Link>
        {account.deactivated ? <span className={styles.deactivatedTag}>compte désactivé</span> : null}
      </h3>

      {/* Un suivi nul, ce n'est pas « à voir » : c'est ne pas suivre l'œuvre. */}
      {!tracking ? (
        <p className={styles.absent}>{account.pseudo} ne suit pas cette œuvre.</p>
      ) : (
        <dl className={styles.readonly}>
          <div className={styles.readonlyRow}>
            <dt>Statut</dt>
            <dd>
              {statusLabel(tracking.status)}
              {isDerivedStatusType(type) ? <span className={styles.derivedNote}>déduit</span> : null}
            </dd>
          </div>
          {tracking.rating !== null ? (
            <div className={styles.readonlyRow}>
              <dt>Note</dt>
              <dd>{tracking.rating}/10</dd>
            </div>
          ) : null}
          {tracking.owned ? (
            <div className={styles.readonlyRow}>
              <dt>Possession</dt>
              <dd>{account.pseudo} le possède</dd>
            </div>
          ) : null}
          {tracking.started_at ? (
            <div className={styles.readonlyRow}>
              <dt>Commencé le</dt>
              <dd>{formatDate(tracking.started_at)}</dd>
            </div>
          ) : null}
          {tracking.finished_at ? (
            <div className={styles.readonlyRow}>
              <dt>Terminé le</dt>
              <dd>{formatDate(tracking.finished_at)}</dd>
            </div>
          ) : null}
          {tracking.review ? (
            <div className={styles.readonlyRow}>
              <dt>Avis</dt>
              <dd className={styles.review}>« {tracking.review} »</dd>
            </div>
          ) : null}
        </dl>
      )}
    </div>
  )
}

/** `date` HTML veut `AAAA-MM-JJ` ; l'API peut renvoyer un instant complet. */
const toDateInput = (value: string | null) => (value ? value.slice(0, 10) : '')

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
