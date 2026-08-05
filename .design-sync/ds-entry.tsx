/**
 * Point d'entrée « bibliothèque » pour design-sync.
 *
 * Les composants de l'application sont tous en `export default` : ce fichier
 * les republie sous des noms, seule forme que le convertisseur sait exposer
 * dans `window.Mediatheque.*`. Rien n'est réécrit ici — ce sont les vrais
 * composants, compilés par le Vite du dépôt (mode `lib`), pour que les
 * modules CSS soient résolus comme en production.
 */
import type { ReactNode } from 'react'
// Les jetons vivent dans `src/styles/`, pas dans un paquet : `copyTokens` ne
// sait aller les chercher que sous `node_modules`. On les fait donc entrer par
// le build du dépôt — `global.css` importe `tokens.css`, et Vite inline les
// deux dans la feuille compilée, d'où elles atteignent les maquettes.
import '../src/styles/global.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { SessionProvider } from '../src/session/SessionContext'
import { ReferenceProvider } from '../src/reference/ReferenceContext'
import type { ReferenceStatuses, Session } from '../src/api/schema'

export { default as AppShell } from '../src/components/AppShell'
export { default as Cover } from '../src/components/Cover'
export { default as EmptyState } from '../src/components/EmptyState'
export { default as ErrorBoundary } from '../src/components/ErrorBoundary'
export { default as ErrorNotice } from '../src/components/ErrorNotice'
export { default as FollowButton } from '../src/components/FollowButton'
export { default as IdentityDot } from '../src/components/IdentityDot'
export { default as MediaMetadata } from '../src/components/MediaMetadata'
export { default as NotificationsLink } from '../src/components/NotificationsLink'
export { default as PeopleDisclosure } from '../src/components/PeopleDisclosure'
export { default as ProgressBar } from '../src/components/ProgressBar'
export { default as Screenshots } from '../src/components/Screenshots'
export { default as SeasonList } from '../src/components/SeasonList'
export { default as StatusBadge, NewContentBadge } from '../src/components/StatusBadge'
export { default as TrackingPanel, FollowedTrackings } from '../src/components/TrackingPanel'
export { default as VolumeGrid } from '../src/components/VolumeGrid'

/**
 * Le compte sous lequel les aperçus sont rendus. La couleur d'identité est
 * celle qui teinte les pastilles et les barres de progression : sans elle,
 * la moitié du sens de l'interface disparaît.
 */
const PREVIEW_SESSION: Session = {
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    pseudo: 'Alice',
    avatar_url: null,
    identity_color: '#e4572e',
    role: 'admin',
    deactivated: false,
  },
}

/**
 * Contexte minimal exigé par les composants branchés sur l'API : le cache de
 * requêtes, le routeur (les liens vers les fiches et les profils) et la
 * session. Aucune requête ne doit aboutir dans un aperçu — `retry: false`
 * fait échouer vite plutôt que de boucler.
 */
/**
 * Un seul cache pour tous les aperçus : construit dans le corps du composant,
 * il repartait de zéro à chaque rendu et faisait se réabonner tous les
 * consommateurs.
 */
const PREVIEW_CLIENT = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
})

/**
 * Le vocabulaire des statuts, que les aperçus ne peuvent pas aller chercher —
 * aucune requête n'aboutit ici. Sans lui, `StatusBadge` et `TrackingPanel`
 * lèveraient faute de `ReferenceProvider`.
 *
 * Recopié plutôt qu'importé de `src/test/` : ce fichier est compilé par le
 * build « bibliothèque », et n'a rien à devoir aux tests.
 */
const PREVIEW_REFERENCE: ReferenceStatuses = {
  types: [
    { type: 'movie', derived_status: false, statuses: [
      { value: 'todo', label: 'À voir' }, { value: 'doing', label: 'En cours' }, { value: 'done', label: 'Vu' }] },
    { type: 'tv', derived_status: true, statuses: [
      { value: 'todo', label: 'À voir' }, { value: 'doing', label: 'En cours' }, { value: 'done', label: 'Vue' }] },
    { type: 'book', derived_status: false, statuses: [
      { value: 'todo', label: 'À lire' }, { value: 'doing', label: 'En cours de lecture' }, { value: 'done', label: 'Lu' }] },
    { type: 'comic_series', derived_status: true, statuses: [
      { value: 'todo', label: 'À lire' }, { value: 'doing', label: 'En cours de lecture' }, { value: 'done', label: 'Lu' }] },
    { type: 'game', derived_status: false, statuses: [
      { value: 'todo', label: 'Envie d’y jouer' }, { value: 'doing', label: 'En cours' }, { value: 'done', label: 'Terminé' }] },
    { type: 'music', derived_status: false, statuses: [
      { value: 'todo', label: 'À écouter' }, { value: 'done', label: 'Écouté' }] },
  ],
}

export function DesignPreviewProvider({ children }: { children: ReactNode }) {
  const client = PREVIEW_CLIENT

  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SessionProvider session={PREVIEW_SESSION}>
          <ReferenceProvider reference={PREVIEW_REFERENCE}>{children}</ReferenceProvider>
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
