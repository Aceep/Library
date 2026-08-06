import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createPasswordReset,
  deactivateUser,
  deleteUser,
  fetchUsers,
  reactivateUser,
  setUserRole,
} from '../api/endpoints'
import type { UserSummary } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import type { UserRole } from '../api/schema'
import AccessDenied from '../components/AccessDenied'
import ErrorNotice from '../components/ErrorNotice'
import IdentityDot from '../components/IdentityDot'
import { useSession } from '../session/SessionContext'
import styles from './AdminUsers.module.css'

export default function AdminUsers() {
  const { isAdmin } = useSession()
  // Le back revérifie et répond 403 : cette garde évite d'afficher un écran
  // muet, elle ne tient pas lieu de sécurité.
  //
  // Elle redirigeait vers l'accueil sans un mot. Un membre qui suit le lien
  // d'un administrateur se retrouvait ailleurs sans comprendre, et ne pouvait
  // pas distinguer un refus d'un lien cassé. On le lui dit.
  if (!isAdmin) return <AccessDenied />
  return <Panel />
}

function Panel() {
  const { user: me } = useSession()
  const queryClient = useQueryClient()
  const [resetLink, setResetLink] = useState<{ pseudo: string; url: string } | null>(null)

  const params = { sort: 'pseudo' as const, includeDeactivated: true }
  const list = useInfiniteQuery({
    queryKey: queryKeys.users(params),
    queryFn: ({ pageParam, signal }) => fetchUsers(params, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  })

  const items = list.data?.pages.flatMap((page) => page.items) ?? []
  const adminCount = items.filter((entry) => entry.user.role === 'admin').length

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.people })
    void queryClient.invalidateQueries({ queryKey: queryKeys.session })
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Administration</p>
        <h1 className={styles.title}>Les comptes</h1>
        <p className={styles.lede}>
          Pour inviter quelqu'un, passe par les{' '}
          <Link to="/administration/invitations">invitations</Link>.
        </p>
      </header>

      {resetLink ? (
        <ResetLinkPanel
          pseudo={resetLink.pseudo}
          url={resetLink.url}
          onDismiss={() => setResetLink(null)}
        />
      ) : null}

      {list.isPending ? (
        <p className={styles.quiet}>Chargement…</p>
      ) : list.error ? (
        <ErrorNotice error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((entry) => (
              <UserRow
                key={entry.user.id}
                entry={entry}
                isMe={entry.user.id === me.id}
                isLastAdmin={entry.user.role === 'admin' && adminCount <= 1}
                onChanged={refresh}
                onResetLink={(url) => setResetLink({ pseudo: entry.user.pseudo, url })}
              />
            ))}
          </ul>

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

function UserRow({
  entry,
  isMe,
  isLastAdmin,
  onChanged,
  onResetLink,
}: {
  entry: UserSummary
  isMe: boolean
  isLastAdmin: boolean
  onChanged: () => void
  onResetLink: (url: string) => void
}) {
  const { user } = entry
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const role = useMutation({
    mutationFn: (next: UserRole) => setUserRole(user.id, next),
    onSuccess: onChanged,
  })

  const deactivate = useMutation({
    mutationFn: () => deactivateUser(user.id),
    onSuccess: onChanged,
  })

  const reactivate = useMutation({
    mutationFn: () => reactivateUser(user.id),
    onSuccess: onChanged,
  })

  const reset = useMutation({
    mutationFn: () => createPasswordReset(user.id, { expires_in_hours: 24 }),
    onSuccess: (result) => {
      // Comme pour les invitations, `url` est nulle tant que PUBLIC_APP_URL
      // n'est pas configurée côté serveur : le front sait composer le lien.
      onResetLink(result.url ?? `${window.location.origin}/invitation/${result.token}`)
    },
  })

  const busy =
    role.isPending || deactivate.isPending || reactivate.isPending || reset.isPending

  return (
    <li className={styles.row} data-deactivated={user.deactivated}>
      <div className={styles.identity}>
        <IdentityDot account={user} />
        <span className={styles.name}>
          {user.pseudo}
          {isMe ? <span className={styles.tag}>toi</span> : null}
          {user.role === 'admin' ? <span className={styles.tagStrong}>admin</span> : null}
          {user.deactivated ? <span className={styles.tagQuiet}>désactivé</span> : null}
        </span>
        <span className={styles.counts}>
          {entry.tracked_count} œuvre{entry.tracked_count > 1 ? 's' : ''} ·{' '}
          {entry.followers_count} abonné{entry.followers_count > 1 ? 's' : ''}
        </span>
      </div>

      <div className={styles.actions}>
        {/* Le back refuse de rétrograder le dernier administrateur ; on ne
            propose pas un geste dont on sait qu'il sera refusé. */}
        {user.role === 'admin' ? (
          <button
            type="button"
            className={styles.action}
            onClick={() => role.mutate('user')}
            disabled={busy || isLastAdmin}
            title={
              isLastAdmin
                ? 'Dernier administrateur : le rétrograder laisserait la médiathèque sans personne pour inviter'
                : undefined
            }
          >
            Retirer l'administration
          </button>
        ) : (
          <button
            type="button"
            className={styles.action}
            onClick={() => role.mutate('admin')}
            disabled={busy}
          >
            Passer administrateur
          </button>
        )}

        <button
          type="button"
          className={styles.action}
          onClick={() => reset.mutate()}
          disabled={busy || user.deactivated}
        >
          {reset.isPending ? 'Création…' : 'Lien de mot de passe'}
        </button>

        {/* Désactiver est le geste courant quand quelqu'un s'en va : il laisse
            en place tout ce que les autres voyaient. On ne peut pas se
            désactiver soi-même, le back répond 409. */}
        {user.deactivated ? (
          <button
            type="button"
            className={styles.action}
            onClick={() => reactivate.mutate()}
            disabled={busy}
          >
            Réactiver
          </button>
        ) : isMe ? null : (
          <button
            type="button"
            className={styles.action}
            onClick={() => deactivate.mutate()}
            disabled={busy}
          >
            Désactiver
          </button>
        )}
      </div>

      {role.error ? <ErrorNotice error={role.error} /> : null}
      {deactivate.error ? <ErrorNotice error={deactivate.error} /> : null}
      {reactivate.error ? <ErrorNotice error={reactivate.error} /> : null}
      {reset.error ? <ErrorNotice error={reset.error} /> : null}

      {/* La suppression n'est pas une action parmi d'autres : elle est en
          retrait, sur sa propre ligne, et derrière une confirmation qui exige
          d'écrire le pseudo. */}
      {isMe ? null : (
        <div className={styles.danger}>
          {confirmingDelete ? (
            <DeleteConfirm
              pseudo={user.pseudo}
              userId={user.id}
              onCancel={() => setConfirmingDelete(false)}
              onDeleted={() => {
                setConfirmingDelete(false)
                onChanged()
              }}
            />
          ) : (
            <button
              type="button"
              className={styles.dangerLink}
              onClick={() => setConfirmingDelete(true)}
            >
              Supprimer définitivement ce compte
            </button>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * L'effacement est irréversible et emporte tout par cascade. Il existe pour
 * qu'une personne puisse obtenir la suppression de ses données — pas pour
 * fermer un compte, ce à quoi sert la désactivation.
 *
 * Le back exige le pseudo exact ; on le redemande ici plutôt que de l'envoyer
 * en silence, pour que le geste soit conscient et non un clic de trop.
 */
function DeleteConfirm({
  pseudo,
  userId,
  onCancel,
  onDeleted,
}: {
  pseudo: string
  userId: string
  onCancel: () => void
  onDeleted: () => void
}) {
  const [typed, setTyped] = useState('')

  const remove = useMutation({
    mutationFn: () => deleteUser(userId, typed),
    onSuccess: onDeleted,
  })

  const matches = typed === pseudo

  return (
    <div className={styles.dangerPanel}>
      <p className={styles.dangerText}>
        Cette suppression est <strong>irréversible</strong>. Elle emporte le compte, son suivi, ses
        notes, ses critiques, ses cochages et ses abonnements. Rien n'est conservé ni anonymisé.
      </p>
      <p className={styles.dangerText}>
        Pour fermer un compte dont la personne s'en va, <strong>désactive-le</strong> plutôt&nbsp;:
        ce qu'il a écrit reste alors visible pour les autres.
      </p>

      <label className={styles.dangerField}>
        <span className={styles.dangerLabel}>
          Écris <code>{pseudo}</code> pour confirmer
        </span>
        <input
          type="text"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
      </label>

      {remove.error ? <ErrorNotice error={remove.error} /> : null}

      <div className={styles.dangerActions}>
        <button
          type="button"
          className={styles.dangerButton}
          onClick={() => remove.mutate()}
          disabled={!matches || remove.isPending}
        >
          {remove.isPending ? 'Suppression…' : 'Supprimer définitivement'}
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={onCancel}
          disabled={remove.isPending}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

function ResetLinkPanel({
  pseudo,
  url,
  onDismiss,
}: {
  pseudo: string
  url: string
  onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)

  return (
    <div className={styles.created}>
      <p className={styles.createdTitle}>Lien de mot de passe pour {pseudo}</p>
      <p className={styles.createdNote}>
        Il ne sera plus affiché ensuite. Transmets-le comme tu veux&nbsp;: rien n'est envoyé
        automatiquement.
      </p>
      <code className={styles.createdUrl}>{url}</code>
      <div className={styles.createdActions}>
        <button
          type="button"
          className={styles.primary}
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
