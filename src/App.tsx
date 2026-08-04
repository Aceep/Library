import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ErrorNotice from './components/ErrorNotice'
import ComingSoon from './pages/ComingSoon'
import Compare from './pages/Compare'
import AdminInvitations from './pages/AdminInvitations'
import Dashboard from './pages/Dashboard'
import Invitation from './pages/Invitation'
import Login from './pages/Login'
import Members from './pages/Members'
import MediaDetail from './pages/MediaDetail'
import Search from './pages/Search'
import TypeLibrary from './pages/TypeLibrary'
import UserProfile from './pages/UserProfile'
import { SessionProvider, useSessionQuery } from './session/SessionContext'
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
  const { data: session, isPending, error, refetch } = useSessionQuery()

  if (isPending) {
    return (
      <div className={styles.splash}>
        <p className={styles.splashText}>Chargement…</p>
      </div>
    )
  }

  // Une erreur ici n'est pas un 401 (traité comme « pas de session ») : c'est
  // l'API injoignable, ou un incident. Inutile d'afficher l'écran de connexion,
  // il échouerait de la même façon.
  if (error) {
    return (
      <div className={styles.splash}>
        <div className={styles.splashPanel}>
          <ErrorNotice error={error} onRetry={() => void refetch()} />
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <SessionProvider session={session}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="bibliotheque/:type" element={<TypeLibrary />} />
          <Route path="media/:id" element={<MediaDetail />} />
          <Route path="recherche" element={<Search />} />
          <Route path="membres" element={<Members />} />
          <Route path="membres/:id" element={<UserProfile />} />
          <Route path="comparer" element={<Compare />} />
          <Route path="administration/invitations" element={<AdminInvitations />} />
          <Route
            path="musique"
            element={
              <ComingSoon
                title="Music History"
                note="La musique est en cours de développement côté API — elle rejoindra les films, les séries, les livres, les mangas et les jeux. Cette page l'attend, et rien n'y sera inventé en attendant."
              />
            }
          />
          <Route
            path="quetes"
            element={
              <ComingSoon
                title="Quests"
                note="Les quêtes sont en cours de développement côté API. Les jeux vidéo, eux, ont déjà leur rayon à part entière."
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SessionProvider>
  )
}
