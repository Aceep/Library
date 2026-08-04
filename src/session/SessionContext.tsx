import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as endpoints from '../api/endpoints'
import { queryKeys } from '../api/keys'
import type { Account, Session } from '../api/schema'

/**
 * Point unique où vit l'hypothèse « il y a un partenaire ».
 *
 * L'API répond aujourd'hui `{ user, partner }` avec `partner` nullable, et
 * passera à plus de deux comptes plus tard. Tous les écrans passent par
 * `partners` (une liste) plutôt que par `partner` : le jour où le back change,
 * seul ce fichier bouge.
 */
interface SessionValue {
  user: Account
  /** Les autres comptes de la médiathèque. Aujourd'hui zéro ou un. */
  partners: Account[]
  /** Raccourci pour les écrans encore binaires (comparaison, double colonne). */
  partner: Account | null
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

/** Réexporté sous ce nom parce que `main.tsx` s'en sert pour traiter les 401. */
export const SESSION_QUERY_KEY = queryKeys.session

/** État de chargement de la session, avant de savoir s'il y a quelqu'un. */
export function useSessionQuery() {
  return useQuery<Session | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => endpoints.fetchSession(),
    staleTime: Infinity,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ pseudo, password }: { pseudo: string; password: string }) =>
      endpoints.login(pseudo, password),
    onSuccess: (session) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, session)
    },
  })
}

export function SessionProvider({ session, children }: { session: Session; children: ReactNode }) {
  const queryClient = useQueryClient()

  const handleLogout = useCallback(async () => {
    try {
      await endpoints.logout()
    } finally {
      // Le cache entier appartient à la session qui se ferme.
      queryClient.clear()
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
    }
  }, [queryClient])

  const value = useMemo<SessionValue>(
    () => ({
      user: session.user,
      partners: session.partner ? [session.partner] : [],
      partner: session.partner,
      logout: handleLogout,
    }),
    [session, handleLogout],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession doit être utilisé sous un SessionProvider')
  return value
}
