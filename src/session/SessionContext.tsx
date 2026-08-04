import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as endpoints from '../api/endpoints'
import { queryKeys } from '../api/keys'
import type { Account, Session } from '../api/schema'

/**
 * Qui je suis, et rien d'autre.
 *
 * L'API ne renvoie plus de partenaire depuis le passage aux comptes multiples :
 * les autres membres n'accompagnent plus la session mais chaque charge utile,
 * dans `tracking.following`. C'est plus juste — qui apparaît à côté d'une œuvre
 * dépend de l'œuvre, pas d'un binôme fixé une fois pour toutes.
 */
interface SessionValue {
  user: Account
  /** L'administration n'est ouverte qu'à ce rôle ; le back revérifie de son côté. */
  isAdmin: boolean
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
      isAdmin: session.user.role === 'admin',
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
