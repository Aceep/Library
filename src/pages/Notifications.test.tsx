import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import type { NotificationItem, NotificationList } from '../api/schema'
import { media, renderWithProviders } from '../test/render'

const fetchNotifications = vi.fn()
const markNotificationRead = vi.fn()
const markAllNotificationsRead = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchNotifications: (...args: unknown[]) => fetchNotifications(...args),
  markNotificationRead: (...args: unknown[]) => markNotificationRead(...args),
  markAllNotificationsRead: () => markAllNotificationsRead(),
}))

const { default: Notifications } = await import('./Notifications')

const notification = (over: Partial<NotificationItem> = {}) =>
  ({
    id: '00000000-0000-4000-8000-0000000000b1',
    kind: 'episode',
    label: 'Severance — S02E03 est paru',
    released_at: '2026-07-30T00:00:00.000Z',
    read_at: null,
    created_at: '2026-07-30T06:00:00.000Z',
    media: media({ type: 'tv', title: 'Severance' }),
    episode: null,
    volume: null,
    saga: null,
    quest: null,
    ...over,
  }) as unknown as NotificationItem

const page = (items: NotificationItem[], unread_count: number): NotificationList =>
  ({ items, next_cursor: null, unread_count }) as unknown as NotificationList

describe('Notifications', () => {
  it('affiche le texte rédigé par le serveur et le compte de non lues', async () => {
    fetchNotifications.mockResolvedValue(page([notification()], 1))
    renderWithProviders(<Notifications />)

    expect(await screen.findByText('Severance — S02E03 est paru')).toBeInTheDocument()
    expect(screen.getByText('1 non lue.')).toBeInTheDocument()
  })

  /**
   * `label` nomme le sujet, pas l'œuvre : « Tome 21 » seul ne veut rien dire.
   * Constaté sur les données réelles de l'instance.
   */
  it('nomme l’œuvre à côté du sujet', async () => {
    fetchNotifications.mockResolvedValue(
      page([notification({ kind: 'volume', label: 'Tome 21', media: media({ type: 'comic_series', title: 'Dandadan' }) })], 1),
    )
    renderWithProviders(<Notifications />)

    const ligne = await screen.findByRole('listitem')
    expect(ligne).toHaveTextContent('Dandadan')
    expect(ligne).toHaveTextContent('Tome 21')
  })

  /**
   * Le compteur vient de `unread_count`, qui vaut pour l'ensemble — pas de la
   * longueur de la page. Une page d'une seule notification déjà lue doit donc
   * pouvoir annoncer douze non lues sans se contredire.
   */
  it('lit le compteur global, pas la longueur de la page', async () => {
    fetchNotifications.mockResolvedValue(
      page([notification({ read_at: '2026-08-01T09:00:00.000Z' })], 12),
    )
    renderWithProviders(<Notifications />)

    expect(await screen.findByText('12 non lues.')).toBeInTheDocument()
  })

  it('marque une notification comme lue', async () => {
    fetchNotifications.mockResolvedValue(page([notification()], 1))
    markNotificationRead.mockResolvedValue({ updated: 1, unread_count: 0 })
    const { container } = renderWithProviders(<Notifications />)

    const bouton = await screen.findByRole('button', { name: 'Marquer comme lu' })
    bouton.click()

    await waitFor(() =>
      expect(markNotificationRead).toHaveBeenCalledWith('00000000-0000-4000-8000-0000000000b1'),
    )
    expect(container).toBeTruthy()
  })

  it('n’offre pas de tout marquer comme lu quand tout l’est déjà', async () => {
    fetchNotifications.mockResolvedValue(
      page([notification({ read_at: '2026-08-01T09:00:00.000Z' })], 0),
    )
    renderWithProviders(<Notifications />)

    expect(await screen.findByText('Tout est lu.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tout marquer comme lu' })).toBeDisabled()
  })

  /** Chaque notification mène à son sujet : une fiche, ou la quête. */
  it('lie vers l’œuvre, ou vers la quête', async () => {
    fetchNotifications.mockResolvedValue(
      page(
        [
          notification(),
          notification({
            id: '00000000-0000-4000-8000-0000000000b2',
            kind: 'quest_published',
            label: 'Nouvelle quête : Trois films pour commencer',
            media: null,
            quest: { id: '00000000-0000-4000-8000-0000000000e1', title: 'Trois films' },
          }),
        ],
        2,
      ),
    )
    renderWithProviders(<Notifications />)

    const lignes = await screen.findAllByRole('listitem')
    expect(within(lignes[0]).getByRole('link')).toHaveAttribute(
      'href',
      '/media/00000000-0000-4000-8000-0000000000aa',
    )
    expect(within(lignes[1]).getByRole('link')).toHaveAttribute(
      'href',
      '/quetes/00000000-0000-4000-8000-0000000000e1',
    )
  })
})
