import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ErrorNotice from './components/ErrorNotice'
import About from './pages/About'
import Compare from './pages/Compare'
import AdminInvitations from './pages/AdminInvitations'
import AdminUsers from './pages/AdminUsers'
import Dashboard from './pages/Dashboard'
import Invitation from './pages/Invitation'
import Login from './pages/Login'
import Members from './pages/Members'
import Notifications from './pages/Notifications'
import Quest from './pages/Quest'
import Quests from './pages/Quests'
import Saga from './pages/Saga'
import Watches from './pages/Watches'
import MediaDetail from './pages/MediaDetail'
import MyAccount from './pages/MyAccount'
import Search from './pages/Search'
import TypeLibrary from './pages/TypeLibrary'
import UserProfile from './pages/UserProfile'
import { SessionProvider, useSessionQuery } from './session/SessionContext'
import { ReferenceProvider, useReferenceQuery } from './reference/ReferenceContext'
import styles from './App.module.css'

export default function App() {
  return (
    <Routes>
      {/* Seule page publique : on y arrive par un lien reçu, sans compte.
          Elle doit donc rester hors du portail de connexion. */}
      <Route path="/invitation/:token" element={<Invitation />} />
      <Route path="*" element={<GatedApp />} />
    </Routes>
  )
}

function GatedApp() {
  const session = useSessionQuery()
  // Le vocabulaire des statuts, chargé en même temps que la session et au même
  // titre : un badge sans son mot est un trou, pas un chargement. La route est
  // publique, donc les deux partent ensemble plutôt qu'en cascade.
  const reference = useReferenceQuery()

  if (session.isPending || reference.isPending) {
    return (
      <div className={styles.splash}>
        <p className={styles.splashText}>Chargement…</p>
      </div>
    )
  }

  // Une erreur ici n'est pas un 401 (traité comme « pas de session ») : c'est
  // l'API injoignable, ou un incident. Inutile d'afficher l'écran de connexion,
  // il échouerait de la même façon.
  const panne = session.error ?? reference.error
  if (panne) {
    const reessayer = session.error ? session.refetch : reference.refetch
    return (
      <div className={styles.splash}>
        <div className={styles.splashPanel}>
          <ErrorNotice error={panne} onRetry={() => void reessayer()} />
        </div>
      </div>
    )
  }

  if (!session.data) return <Login />
  // Inatteignable — ni en attente, ni en erreur — mais c'est ce qui donne au
  // reste de l'application une référence jamais nulle.
  if (!reference.data) return null

  return (
    <SessionProvider session={session.data}>
      <ReferenceProvider reference={reference.data}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="bibliotheque/:type" element={<TypeLibrary />} />
          <Route path="media/:id" element={<MediaDetail />} />
          <Route path="sagas/:id" element={<Saga />} />
          <Route path="veille" element={<Watches />} />
          <Route path="recherche" element={<Search />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="mon-compte" element={<MyAccount />} />
          <Route path="membres" element={<Members />} />
          <Route path="membres/:id" element={<UserProfile />} />
          <Route path="comparer" element={<Compare />} />
          {/* Les attributions de sources vivent ici : TMDB exige que la leur
              figure quelque part dans l'application, logo compris. */}
          <Route path="a-propos" element={<About />} />
          <Route path="administration/invitations" element={<AdminInvitations />} />
          <Route path="administration/membres" element={<AdminUsers />} />
          {/* La musique a désormais son rayon comme les cinq autres. L'ancienne
              adresse survit en redirection : elle a été en navigation, elle est
              peut-être dans un signet. */}
          <Route path="musique" element={<Navigate to="/bibliotheque/music" replace />} />
          <Route path="quetes" element={<Quests />} />
          <Route path="quetes/:id" element={<Quest />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </ReferenceProvider>
    </SessionProvider>
  )
}
