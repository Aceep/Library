import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createInvitation, fetchInvitations, revokeInvitation } from '../api/endpoints'
import type { Invitation, InvitationStatus } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import AccessDenied from '../components/AccessDenied'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import { useSession } from '../session/SessionContext'
import styles from './AdminInvitations.module.css'

const FILTERS: Array<{ value: InvitationStatus | null; label: string }> = [
  { value: null, label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'used', label: 'Utilisées' },
  { value: 'revoked', label: 'Annulées' },
  { value: 'expired', label: 'Expirées' },
]

const DURATIONS = [
  { hours: 24, label: '24 heures' },
  { hours: 168, label: 'Une semaine' },
  { hours: 720, label: 'Trente jours' },
]

const STATUS_LABEL: Record<InvitationStatus, string> = {
  pending: 'En attente',
  used: 'Utilisée',
  revoked: 'Annulée',
  expired: 'Expirée',
}

export default function AdminInvitations() {
  const { isAdmin } = useSession()
  // Le back revérifie de son côté (403) : cette garde évite d'afficher un
  // écran qui ne répondrait rien, elle ne tient pas lieu de sécurité.
  //
  // Elle redirigeait vers l'accueil sans un mot — un refus et un lien cassé se
  // ressemblaient trait pour trait. On le dit.
  if (!isAdmin) return <AccessDenied />
  return <Panel />
}

function Panel() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<InvitationStatus | null>(null)
  const [created, setCreated] = useState<{ url: string; token: string } | null>(null)

  const list = useInfiniteQuery({
    queryKey: queryKeys.invitations(status),
    queryFn: ({ pageParam, signal }) => fetchInvitations(status, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  })

  const items = list.data?.pages.flatMap((page) => page.items) ?? []

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.invitationsAll })

  const create = useMutation({
    mutationFn: (body: { expires_in_hours: number; note?: string }) => createInvitation(body),
    onSuccess: (result) => {
      // Le back ne compose le lien que si `PUBLIC_APP_URL` lui a été donnée ;
      // sinon il renvoie `null` et c'est à nous de le former — le front est
      // bien placé pour ça, il connaît sa propre adresse.
      setCreated({
        url: result.url ?? `${window.location.origin}/invitation/${result.token}`,
        token: result.token,
      })
      invalidate()
    },
  })

  const revoke = useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: invalidate,
  })

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Administration</p>
        <h1 className={styles.title}>Invitations</h1>
        <p className={styles.lede}>
          L'inscription se fait sur invitation, et le serveur n'envoie aucun courriel&nbsp;: tu
          fabriques un lien ici, puis tu le transmets par le moyen que tu veux.
        </p>
        <p className={styles.lede}>
          Pour agir sur un compte existant, va aux{' '}
          <Link to="/administration/membres">comptes</Link>.
        </p>
      </header>

      <CreateForm onSubmit={(body) => create.mutate(body)} isSaving={create.isPending} />
      {create.error ? <ErrorNotice error={create.error} /> : null}
      {created ? <CreatedLink url={created.url} onDismiss={() => setCreated(null)} /> : null}

      <div className={styles.filters} role="group" aria-label="Filtrer par état">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            className={styles.chip}
            aria-pressed={status === filter.value}
            onClick={() => setStatus(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {list.isPending ? (
        <p className={styles.quiet}>Chargement…</p>
      ) : list.error ? (
        <ErrorNotice error={list.error} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune invitation"
          note="Les liens que tu fabriqueras apparaîtront ici, avec leur état."
        />
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                onRevoke={() => revoke.mutate(invitation.id)}
                isRevoking={revoke.isPending}
              />
            ))}
          </ul>

          {revoke.error ? <ErrorNotice error={revoke.error} /> : null}

          {list.hasNextPage ? (
            <div className={styles.more}>
              <button
                type="button"
                className={styles.moreButton}
                onClick={() => void list.fetchNextPage()}
                disabled={list.isFetchingNextPage}
              >
                {list.isFetchingNextPage ? 'Chargement…' : 'Charger la suite'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function CreateForm({
  onSubmit,
  isSaving,
}: {
  onSubmit: (body: { expires_in_hours: number; note?: string }) => void
  isSaving: boolean
}) {
  const [hours, setHours] = useState(168)
  const [note, setNote] = useState('')

  return (
    <form
      className={styles.createForm}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          expires_in_hours: hours,
          note: note.trim() === '' ? undefined : note.trim(),
        })
      }}
    >
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Valable</span>
        <select value={hours} onChange={(event) => setHours(Number(event.target.value))}>
          {DURATIONS.map((duration) => (
            <option key={duration.hours} value={duration.hours}>
              {duration.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Aide-mémoire (privé)</span>
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="« pour Camille »"
          maxLength={200}
        />
      </label>

      <button type="submit" className={styles.submit} disabled={isSaving}>
        {isSaving ? 'Création…' : 'Fabriquer un lien'}
      </button>
    </form>
  )
}

/**
 * Le lien n'est montré qu'une fois, à sa création : la liste ne redonne jamais
 * le jeton. On le met donc bien en évidence, et on facilite la copie.
 */
function CreatedLink({ url, onDismiss }: { url: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className={styles.created}>
      <p className={styles.createdTitle}>Lien créé — copie-le maintenant</p>
      <p className={styles.createdNote}>
        Il ne sera plus affiché ensuite. Transmets-le comme tu veux&nbsp;: rien n'est envoyé
        automatiquement.
      </p>
      <code className={styles.createdUrl}>{url}</code>
      <div className={styles.createdActions}>
        <button
          type="button"
          className={styles.submit}
          onClick={() => {
            void navigator.clipboard?.writeText(url).then(
              () => setCopied(true),
              () => setCopied(false),
            )
          }}
        >
          {copied ? 'Copié' : 'Copier le lien'}
        </button>
        <button type="button" className={styles.ghost} onClick={onDismiss}>
          J'ai fini
        </button>
      </div>
    </div>
  )
}

function InvitationRow({
  invitation,
  onRevoke,
  isRevoking,
}: {
  invitation: Invitation
  onRevoke: () => void
  isRevoking: boolean
}) {
  return (
    <li className={styles.row}>
      <span className={styles.status} data-status={invitation.status}>
        {STATUS_LABEL[invitation.status]}
      </span>

      <span className={styles.rowBody}>
        <span className={styles.kind}>
          {invitation.kind === 'invite' ? 'Inscription' : 'Mot de passe'}
          {invitation.target_user ? ` · ${invitation.target_user.pseudo}` : ''}
        </span>
        <span className={styles.dates}>
          créée le {formatDate(invitation.created_at)} par {invitation.created_by.pseudo} ·{' '}
          {invitation.used_at
            ? `utilisée le ${formatDate(invitation.used_at)}`
            : `expire le ${formatDate(invitation.expires_at)}`}
        </span>
      </span>

      {/* Une invitation déjà consommée n'est plus révocable — le back répond
          409. On ne propose donc le geste que tant qu'il a un sens. */}
      {invitation.status === 'pending' ? (
        <button
          type="button"
          className={styles.revoke}
          onClick={onRevoke}
          disabled={isRevoking}
        >
          Annuler
        </button>
      ) : null}
    </li>
  )
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
