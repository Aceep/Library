import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { SessionProvider } from '../session/SessionContext'
import type { Account, MediaSummary, Session, UserTracking } from '../api/schema'

/**
 * Le contexte minimal que réclament les écrans : cache, routeur, session.
 *
 * Un `QueryClient` **neuf par test** — partagé, il rendrait le second test
 * dépendant de ce que le premier a mis en cache, et l'ordre d'exécution
 * deviendrait significatif. `retry: false` fait échouer tout de suite plutôt
 * que de faire durer un test qui échoue de toute façon.
 */
export function renderWithProviders(ui: ReactElement, { route = '/' } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <SessionProvider session={SESSION}>{ui}</SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

export const ACCOUNT: Account = {
  id: '00000000-0000-4000-8000-000000000001',
  pseudo: 'Alice',
  avatar_url: null,
  identity_color: '#E4572E',
  role: 'user',
  deactivated: false,
}

export const SESSION: Session = { user: ACCOUNT }

/** Un suivi complet — tous les champs du contrat sont requis, aucun n'est optionnel. */
export const tracking = (over: Partial<UserTracking> = {}): UserTracking => ({
  user_id: ACCOUNT.id,
  owned: false,
  status: 'todo',
  rating: null,
  review: null,
  started_at: null,
  finished_at: null,
  completed_at: null,
  has_new_content: false,
  favorite: false,
  times: 0,
  updated_at: '2026-08-05T10:00:00.000Z',
  ...over,
})

export const media = (over: Partial<MediaSummary> = {}): MediaSummary => ({
  id: '00000000-0000-4000-8000-0000000000aa',
  type: 'movie',
  source: 'tmdb',
  title: 'Une œuvre',
  cover_url: null,
  year: 2020,
  ...over,
})
