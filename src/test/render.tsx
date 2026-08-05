import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { SessionProvider } from '../session/SessionContext'
import { ReferenceProvider } from '../reference/ReferenceContext'
import type {
  Account,
  MediaSummary,
  ReferenceStatuses,
  Session,
  UserTracking,
} from '../api/schema'

/**
 * Ce que `GET /reference/statuses` répond, tel que les écrans le reçoivent.
 *
 * Les libellés sont ceux de l'API — leur **rédaction** est vérifiée côté back
 * (`apps/api/test/reference.test.ts`), pas ici : ce qui s'éprouve de ce côté-ci,
 * c'est que les écrans affichent ce que la référence dit, et rien d'autre.
 * D'où le libellé volontairement improbable de `book/doing` plus bas, dans le
 * test qui s'en sert.
 */
export const REFERENCE: ReferenceStatuses = {
  types: [
    {
      type: 'movie',
      derived_status: false,
      statuses: [
        { value: 'todo', label: 'À voir' },
        { value: 'doing', label: 'En cours' },
        { value: 'done', label: 'Vu' },
      ],
    },
    {
      type: 'tv',
      derived_status: true,
      statuses: [
        { value: 'todo', label: 'À voir' },
        { value: 'doing', label: 'En cours' },
        { value: 'done', label: 'Vue' },
      ],
    },
    {
      type: 'book',
      derived_status: false,
      statuses: [
        { value: 'todo', label: 'À lire' },
        { value: 'doing', label: 'En cours de lecture' },
        { value: 'done', label: 'Lu' },
      ],
    },
    {
      type: 'comic_series',
      derived_status: true,
      statuses: [
        { value: 'todo', label: 'À lire' },
        { value: 'doing', label: 'En cours de lecture' },
        { value: 'done', label: 'Lu' },
      ],
    },
    {
      type: 'game',
      derived_status: false,
      statuses: [
        { value: 'todo', label: 'Envie d’y jouer' },
        { value: 'doing', label: 'En cours' },
        { value: 'done', label: 'Terminé' },
      ],
    },
    {
      type: 'music',
      derived_status: false,
      statuses: [
        { value: 'todo', label: 'À écouter' },
        { value: 'done', label: 'Écouté' },
      ],
    },
  ],
}

/**
 * Le contexte minimal que réclament les écrans : cache, routeur, session.
 *
 * Un `QueryClient` **neuf par test** — partagé, il rendrait le second test
 * dépendant de ce que le premier a mis en cache, et l'ordre d'exécution
 * deviendrait significatif. `retry: false` fait échouer tout de suite plutôt
 * que de faire durer un test qui échoue de toute façon.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    reference = REFERENCE,
    session = SESSION,
  }: { route?: string; reference?: ReferenceStatuses; session?: Session } = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  // Le client est rendu à l'appelant : un test qui éprouve un échec de requête
  // doit pouvoir **attendre que la requête ait échoué**, sans quoi le rejet se
  // produit après la fin du test et Vitest le signale comme une promesse non
  // traitée — un faux échec qui masquerait un vrai le jour venu.
  return {
    client,
    ...render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <SessionProvider session={session}>
          <ReferenceProvider reference={reference}>{ui}</ReferenceProvider>
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
    ),
  }
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

/** Le même compte, en administrateur — pour les écrans qui en ouvrent plus. */
export const ADMIN_SESSION: Session = { user: { ...ACCOUNT, role: 'admin' } }

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
