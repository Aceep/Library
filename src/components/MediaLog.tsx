import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  addLogEntry,
  deleteLogEntry,
  fetchLog,
  updateLogEntry,
} from '../api/endpoints'
import type { NewLogEntry } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import { isDerivedStatusType, timesNoun } from '../api/schema'
import type { LogEntry, MediaType, UserTracking } from '../api/schema'
import ErrorNotice from './ErrorNotice'
import styles from './MediaLog.module.css'

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * Mon journal sur une œuvre : une entrée par fois qu'elle a été lue ou vue.
 *
 * Le suivi dit ce que j'en pense **maintenant**, le journal ce que j'en ai
 * pensé **chaque fois**. C'est pour ça que les deux coexistent sur la fiche au
 * lieu de se remplacer.
 *
 * Le panneau ne se remplit pas seul : passer l'œuvre à « terminé » crée
 * l'entrée côté serveur. Le bouton d'ajout sert aux fois d'avant — la relecture
 * d'il y a six ans, que l'application n'a pas vues.
 */
export default function MediaLog({
  mediaId,
  type,
  tracking,
  onTracking,
}: {
  mediaId: string
  type: MediaType
  tracking: UserTracking | null
  onTracking: (tracking: UserTracking) => void
}) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)

  const log = useInfiniteQuery({
    queryKey: queryKeys.log(mediaId, null),
    queryFn: ({ pageParam, signal }) => fetchLog(mediaId, null, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  })

  /**
   * Toute écriture de journal renvoie le suivi recalculé : `times` a bougé, et
   * la note aussi si l'entrée touchée était la plus récente. On le remonte à la
   * fiche plutôt que de le recalculer, et on relit le journal entier — une
   * correction de date peut réordonner la liste.
   */
  const settle = (next: UserTracking) => {
    onTracking(next)
    void queryClient.invalidateQueries({ queryKey: queryKeys.log(mediaId, null) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.home })
    void queryClient.invalidateQueries({ queryKey: queryKeys.library })
    void queryClient.invalidateQueries({ queryKey: queryKeys.compare })
  }

  const create = useMutation({
    mutationFn: (body: NewLogEntry) => addLogEntry(mediaId, body),
    onSuccess: (result) => {
      settle(result.tracking)
      setAdding(false)
    },
  })

  const entries = log.data?.pages.flatMap((page) => page.items) ?? []
  const times = tracking?.times ?? 0

  return (
    <section className={styles.panel}>
      <h2 className={styles.heading}>Mon journal</h2>

      <p className={styles.count}>
        {times > 0 ? `${times} ${timesNoun(type, times)}` : 'Rien d’enregistré pour l’instant.'}
      </p>

      {log.isPending ? (
        <p className={styles.quiet}>Chargement…</p>
      ) : log.error ? (
        <ErrorNotice error={log.error} onRetry={() => void log.refetch()} />
      ) : (
        <>
          {entries.length > 0 ? (
            <ol className={styles.entries}>
              {entries.map((entry) => (
                <Entry key={entry.id} entry={entry} onSettled={settle} />
              ))}
            </ol>
          ) : null}

          {log.hasNextPage ? (
            <button
              type="button"
              className={styles.ghost}
              onClick={() => void log.fetchNextPage()}
              disabled={log.isFetchingNextPage}
            >
              {log.isFetchingNextPage ? 'Chargement…' : 'Voir les fois précédentes'}
            </button>
          ) : null}
        </>
      )}

      {adding ? (
        <EntryForm
          title="Une fois de plus"
          submitLabel="Enregistrer"
          initial={{ finished_at: today() }}
          onSubmit={(body) => create.mutate(body as NewLogEntry)}
          onCancel={() => setAdding(false)}
          isSaving={create.isPending}
          error={create.error}
        />
      ) : (
        <div className={styles.addRow}>
          <button type="button" className={styles.primary} onClick={() => setAdding(true)}>
            {times > 0 ? 'Je viens de recommencer' : 'Enregistrer une fois passée'}
          </button>
          {/* Sans ça, le bouton se lit comme le seul moyen de remplir le
              journal, alors que le geste courant le remplit déjà. Le geste en
              question n'est pas le même selon le type : sur une série ou un
              manga, le statut est dérivé et c'est le dernier cochage qui
              termine l'œuvre — vérifié sur l'instance. */}
          <p className={styles.addNote}>
            {/* `\u00a0` plutôt qu'une espace insécable littérale : la règle
                `no-irregular-whitespace` refuse la seconde, et `&nbsp;` ne
                s'interprète pas dans une chaîne JavaScript. */}
            {isDerivedStatusType(type)
              ? `Cocher ${type === 'tv' ? 'le dernier épisode' : 'le dernier tome'} ajoute l’entrée toute seule\u00a0: ce bouton sert aux fois d’avant.`
              : 'Passer l’œuvre à «\u00a0terminé\u00a0» ajoute l’entrée toute seule\u00a0: ce bouton sert aux fois d’avant.'}
          </p>
        </div>
      )}
    </section>
  )
}

function Entry({
  entry,
  onSettled,
}: {
  entry: LogEntry
  onSettled: (tracking: UserTracking) => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const edit = useMutation({
    mutationFn: (patch: Partial<NewLogEntry>) => updateLogEntry(entry.id, patch),
    onSuccess: (result) => {
      onSettled(result.tracking)
      setEditing(false)
    },
  })

  const remove = useMutation({
    mutationFn: () => deleteLogEntry(entry.id),
    onSuccess: (result) => onSettled(result.tracking),
  })

  if (editing) {
    return (
      <li className={styles.entry}>
        <EntryForm
          title="Corriger cette fois-là"
          submitLabel="Corriger"
          initial={{
            finished_at: entry.finished_at,
            started_at: entry.started_at,
            rating: entry.rating,
            comment: entry.comment,
          }}
          onSubmit={(patch) => edit.mutate(patch)}
          onCancel={() => setEditing(false)}
          isSaving={edit.isPending}
          error={edit.error}
        />
      </li>
    )
  }

  return (
    <li className={styles.entry}>
      <div className={styles.entryHead}>
        <span className={styles.entryDate}>{formatDate(entry.finished_at)}</span>
        {entry.started_at ? (
          <span className={styles.entrySpan}>commencé le {formatDate(entry.started_at)}</span>
        ) : null}
        {entry.rating !== null ? <span className={styles.entryRating}>{entry.rating}/10</span> : null}
      </div>

      {entry.comment ? <p className={styles.entryComment}>«&nbsp;{entry.comment}&nbsp;»</p> : null}

      <div className={styles.entryActions}>
        <button type="button" className={styles.link} onClick={() => setEditing(true)}>
          Corriger
        </button>
        {confirming ? (
          <>
            <button
              type="button"
              className={styles.linkDanger}
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              {remove.isPending ? 'Suppression…' : 'Confirmer la suppression'}
            </button>
            <button type="button" className={styles.link} onClick={() => setConfirming(false)}>
              Annuler
            </button>
          </>
        ) : (
          <button type="button" className={styles.link} onClick={() => setConfirming(true)}>
            Supprimer
          </button>
        )}
      </div>

      {remove.error ? <ErrorNotice error={remove.error} /> : null}
    </li>
  )
}

/**
 * Le même formulaire pour ajouter et pour corriger : une entrée est un fait
 * daté, et les deux gestes portent exactement sur les mêmes quatre champs.
 *
 * La note et le commentaire sont ceux de **cette fois-là** — les libellés le
 * disent, sans quoi on les confondrait avec ceux du suivi juste au-dessus.
 */
function EntryForm({
  title,
  submitLabel,
  initial,
  onSubmit,
  onCancel,
  isSaving,
  error,
}: {
  title: string
  submitLabel: string
  initial: Partial<NewLogEntry> & { finished_at: string }
  onSubmit: (body: Partial<NewLogEntry> & { finished_at: string }) => void
  onCancel: () => void
  isSaving: boolean
  error: unknown
}) {
  const [finishedAt, setFinishedAt] = useState(initial.finished_at)
  const [startedAt, setStartedAt] = useState(initial.started_at ?? '')
  const [rating, setRating] = useState<number | null>(initial.rating ?? null)
  const [comment, setComment] = useState(initial.comment ?? '')

  // Le back refuse en 400 une date de début postérieure à la fin ; on le dit
  // avant l'envoi plutôt que de faire dépendre la correction d'un aller-retour.
  const backwards = startedAt !== '' && startedAt > finishedAt

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          finished_at: finishedAt,
          started_at: startedAt === '' ? null : startedAt,
          rating,
          comment: comment.trim() === '' ? null : comment,
        })
      }}
    >
      <p className={styles.formTitle}>{title}</p>

      <div className={styles.dates}>
        <label className={styles.dateField}>
          <span className={styles.fieldLabel}>Terminé le</span>
          <input
            type="date"
            value={finishedAt}
            required
            onChange={(event) => setFinishedAt(event.target.value)}
            disabled={isSaving}
          />
        </label>
        <label className={styles.dateField}>
          <span className={styles.fieldLabel}>Commencé le (facultatif)</span>
          <input
            type="date"
            value={startedAt}
            onChange={(event) => setStartedAt(event.target.value)}
            disabled={isSaving}
          />
        </label>
      </div>

      {backwards ? (
        <p className={styles.formError}>La date de début est postérieure à celle de fin.</p>
      ) : null}

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Ma note, cette fois-là</span>
        <div className={styles.ratings}>
          {RATINGS.map((value) => (
            <button
              key={value}
              type="button"
              className={styles.rating}
              aria-pressed={rating === value}
              onClick={() => setRating(rating === value ? null : value)}
              disabled={isSaving}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Ce que j'en ai pensé cette fois-là</span>
        <textarea
          className={styles.textarea}
          value={comment}
          rows={2}
          onChange={(event) => setComment(event.target.value)}
          disabled={isSaving}
          placeholder="Facultatif."
        />
      </label>

      {error ? <ErrorNotice error={error} /> : null}

      <div className={styles.formActions}>
        <button type="submit" className={styles.primary} disabled={isSaving || backwards}>
          {isSaving ? 'Enregistrement…' : submitLabel}
        </button>
        <button type="button" className={styles.ghost} onClick={onCancel} disabled={isSaving}>
          Annuler
        </button>
      </div>
    </form>
  )
}

/**
 * La date du jour dans le fuseau de la personne, et pas en UTC : à vingt-trois
 * heures un soir d'été, `toISOString()` daterait l'entrée de la veille.
 */
const today = () => {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
