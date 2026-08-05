import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { ApiError } from './api/client'
import { SESSION_QUERY_KEY } from './session/SessionContext'
import './styles/global.css'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Session expirée : on la remet à zéro une fois pour toutes plutôt que
      // de laisser chaque écran gérer son propre 401.
      if (error instanceof ApiError && error.isUnauthenticated) {
        queryClient.setQueryData(SESSION_QUERY_KEY, null)
      }
    },
  }),
  defaultOptions: {
    queries: {
      // `retryable` du back tranche : réessayer une erreur de validation ou un
      // service non configuré ne sert à rien.
      retry: (failureCount, error) =>
        error instanceof ApiError && error.retryable && failureCount < 2,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
})

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    {/* Au-dessus des fournisseurs, pour attraper aussi ce qui casserait à leur
        montage. Le repli est statique et n'a donc besoin d'aucun contexte. */}
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
