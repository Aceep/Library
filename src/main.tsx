import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { createQueryClient } from './api/queryClient'
import './styles/global.css'

const queryClient = createQueryClient()

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
