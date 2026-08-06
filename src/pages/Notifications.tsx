import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/endpoints'
import type { NotificationItem, NotificationKind } from '../api/schema'
import { queryKeys } from '../api/keys'
import { useAnnounce } from '../components/Announcer'
import EmptyState from '../components/EmptyState'
import LoadingNotice from '../components/LoadingNotice'
import ErrorNotice from '../components/ErrorNotice'
import { useDocumentTitle } from '../components/useDocumentTitle'
import styles from './Notifications.module.css'

/**
 * Ce que chaque genre annonce, en un mot.
 *
 * Volontairement court : c'est un sourcil au-dessus de la phrase, pas la
 * phrase. Celle-ci vient du serveur dans `label`, déjà rédigée avec le titre
 * de l'œuvre et le numéro du tome — la réécrire ici la priverait de tout ce
 * contexte, comme pour les messages d'erreur.
 */
const KIND_LABELS: Record<NotificationKind, string> = {
  episode: 'Épisode',
  volume: 'Tome',
  saga_part: 'Saga',
  quest_published: 'Quête',
  quest_completed: 'Quête achevée',
}

/**
 * Où mène une notification : la fiche de l'œuvre, ou la quête concernée.
 *
 * Les deux ne coexistent jamais — une notification de quête n'a pas de `media`,
 * et l'inverse. L'ordre n'a donc pas d'importance, mais l'explicite reste
 * préférable à un `??` qui masquerait un troisième cas le jour venu.
 */
const subjectLink = (notification: NotificationItem): string | null => {
  if (notification.media) return `/media/${notification.media.id}`
  if (notification.quest) return `/quetes/${notification.quest.id}`
  return null
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export default function Notifications() {
  const queryClient = useQueryClient()
  const annoncer = useAnnounce()
  const [unreadOnly, setUnreadOnly] = useState(false)

  const filters = { unread: unreadOnly }

  const { data, isPending, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.notificationsWith(filters),
      queryFn: ({ pageParam, signal }) => fetchNotifications(filters, pageParam, signal),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.next_cursor,
    })

  // Toute lecture périme les deux vues — « toutes » et « non lues » — ainsi que
  // la pastille de la coquille, qui lit le même compteur. Invalider le préfixe
  // les emporte d'un geste.
  const invalider = () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications })

  const lire = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: invalider,
  })

  const toutLire = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: (resultat) => {
      // Le compte vient du serveur — c'est lui qui sait combien il en a
      // marquées, et le geste vide la liste sans qu'un mot soit prononcé.
      const n = resultat.updated
      const s = n > 1 ? 's' : ''
      annoncer(`${n} nouveauté${s} marquée${s} comme lue${s}.`)
      invalider()
    },
  })

  const items = data?.pages.flatMap((page) => page.items) ?? []
  // Le compteur accompagne chaque page et vaut pour l'ensemble : on lit celui
  // de la première plutôt que de compter `items`, qui n'en est qu'une tranche.
  const unreadCount = data?.pages[0]?.unread_count ?? 0

  // Le compteur dans l'onglet vient du serveur, comme celui de la pastille du
  // bandeau : rien n'est recompté ici.
  useDocumentTitle(unreadCount > 0 ? `Nouveautés (${unreadCount})` : 'Nouveautés')

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Nouveautés</p>
        <h1 className={styles.title}>Ce qui est paru depuis ton dernier passage</h1>
        <p className={styles.lede}>
          {unreadCount > 0
            ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}.`
            : 'Tout est lu.'}
        </p>
      </header>

      <div className={styles.filters}>
        <div className={styles.filterGroup} role="group" aria-label="Filtrer">
          <button
            type="button"
            className={styles.chip}
            aria-pressed={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
          >
            Toutes
          </button>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly(true)}
          >
            Non lues
          </button>
        </div>

        <button
          type="button"
          className={styles.readAll}
          onClick={() => toutLire.mutate()}
          disabled={unreadCount === 0 || toutLire.isPending}
        >
          {toutLire.isPending ? 'Enregistrement…' : 'Tout marquer comme lu'}
        </button>
      </div>

      {toutLire.error ? <ErrorNotice error={toutLire.error} /> : null}
      {lire.error ? <ErrorNotice error={lire.error} /> : null}

      {isPending ? (
        <LoadingNotice />
      ) : error ? (
        <ErrorNotice error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={unreadOnly ? 'Rien à lire' : 'Aucune nouveauté'}
          note={
            unreadOnly
              ? 'Tu as tout lu. Les notifications déjà lues restent consultables dans « Toutes ».'
              : "Les nouveautés arrivent quand un épisode ou un tome paraît sur une œuvre que tu suis, ou qu'une quête est publiée. Rien pour l'instant."
          }
        />
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((notification) => (
              <Row
                key={notification.id}
                notification={notification}
                onRead={() => lire.mutate(notification.id)}
                isReading={lire.isPending && lire.variables === notification.id}
              />
            ))}
          </ul>

          {hasNextPage ? (
            <div className={styles.more}>
              <button
                type="button"
                className={styles.moreButton}
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Chargement…' : 'Charger la suite'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function Row({
  notification,
  onRead,
  isReading,
}: {
  notification: NotificationItem
  onRead: () => void
  isReading: boolean
}) {
  const unread = notification.read_at === null
  const lien = subjectLink(notification)

  const corps = (
    <>
      <p className={styles.rowKind}>{KIND_LABELS[notification.kind]}</p>
      {/* `label` nomme le **sujet** — « Tome 21 », « S02E03 » —, pas l'œuvre :
          seul, il ne veut rien dire. Le titre vient de `media`, quand il y en
          a un. On ne réécrit ni l'un ni l'autre, on les met côte à côte. */}
      <p className={styles.rowLabel}>
        {notification.media ? (
          <>
            <span className={styles.rowWork}>{notification.media.title}</span>
            <span className={styles.rowSeparator} aria-hidden="true">
              {' — '}
            </span>
          </>
        ) : null}
        {notification.label}
      </p>
      <p className={styles.rowDate}>
        {/* `released_at` est la date de parution, `created_at` celle où on l'a
            su. C'est la première qui intéresse — la seconde ne dit que le
            passage de la veille. */}
        {formatDate(notification.released_at ?? notification.created_at)}
      </p>
    </>
  )

  return (
    <li className={unread ? `${styles.row} ${styles.rowUnread}` : styles.row}>
      <div className={styles.rowBody}>
        {lien ? (
          <Link to={lien} className={styles.rowLink}>
            {corps}
          </Link>
        ) : (
          <div className={styles.rowLink}>{corps}</div>
        )}
      </div>

      {unread ? (
        <button type="button" className={styles.markRead} onClick={onRead} disabled={isReading}>
          {isReading ? '…' : 'Marquer comme lu'}
        </button>
      ) : (
        <span className={styles.readTag}>lu</span>
      )}
    </li>
  )
}
