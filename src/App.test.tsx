import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import type { NotificationList, Session } from './api/schema'
import { createQueryClient } from './api/queryClient'
import { ACCOUNT, REFERENCE } from './test/render'

const fetchSession = vi.fn()
const fetchReference = vi.fn()
const fetchNotifications = vi.fn()
const logout = vi.fn()

vi.mock('./api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/endpoints')>()),
  fetchSession: (...args: unknown[]) => fetchSession(...args),
  fetchReference: (...args: unknown[]) => fetchReference(...args),
  fetchNotifications: (...args: unknown[]) => fetchNotifications(...args),
  logout: (...args: unknown[]) => logout(...args),
}))

const { default: App } = await import('./App')

const SESSION: Session = { user: ACCOUNT }

const notifications = (): NotificationList =>
  ({ items: [], next_cursor: null, unread_count: 0 }) as unknown as NotificationList

/**
 * Le défaut suspecté : `queryClient.clear()` avant `setQueryData(session,
 * null)` ne rappelle pas l'observateur actif de `useSessionQuery` (mesuré sur
 * `@tanstack/query-core` 5.101.4). L'écran connecté — ici le bandeau de compte
 * de `AppShell` — resterait donc affiché après « Déconnexion », jusqu'à un
 * rechargement complet.
 *
 * Le rendu passe par `App` en entier, et non par `SessionProvider` seul : c'est
 * `GatedApp` (`src/App.tsx`) qui porte l'unique observateur de la session
 * (`useSessionQuery`), et c'est lui qui doit se rappeler pour que l'écran
 * bascule vers `Login`.
 */
describe('App — la déconnexion quitte l’écran connecté', () => {
  it('remplace le bandeau de compte par l’écran de connexion après « Déconnexion »', async () => {
    fetchSession.mockResolvedValue(SESSION)
    fetchReference.mockResolvedValue(REFERENCE)
    fetchNotifications.mockResolvedValue(notifications())
    logout.mockResolvedValue(undefined)

    const client = createQueryClient()
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/a-propos']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const trigger = await screen.findByRole('button', { name: /mon compte/i })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Déconnexion' }))

    await waitFor(() => expect(logout).toHaveBeenCalled())

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /mon compte/i })).not.toBeInTheDocument()
    })
    expect(await screen.findByRole('heading', { name: 'Se connecter' })).toBeInTheDocument()
  })
})
