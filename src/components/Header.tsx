import { Link, useNavigate } from 'react-router-dom'
import './Layout.css'
import './Header.css'

interface User {
  name: string
  avatar: string
  color: string
}

interface HeaderProps {
  showBackButton?: boolean
  title?: string
}

export default function Header({ showBackButton = false, title }: HeaderProps) {
  const navigate = useNavigate()
  let currentUser: User | null = null
  try {
    const data = sessionStorage.getItem('currentUser')
    if (data) currentUser = JSON.parse(data)
  } catch {
    currentUser = null
  }
  const isAuthenticated = sessionStorage.getItem('authenticated') === 'true'

  const handleLogout = () => {
    sessionStorage.removeItem('authenticated')
    sessionStorage.removeItem('currentUser')
    sessionStorage.removeItem('userPassword')
    navigate('/login')
  }

  return (
    <header className="header">
      <div className="header-left">
        {showBackButton && (
          <Link to="/" className="back-button">
            ← Back to Home
          </Link>
        )}
        {title && <h1 className="layout-title">{title}</h1>}
      </div>
      {isAuthenticated && (
        <div className="header-right">
          <div className="user-info">
            <span className="user-avatar" style={{ background: currentUser?.color || '#888' }}>
              {currentUser?.avatar || '👤'}
            </span>
            <span className="user-name">{currentUser?.name || 'User'}</span>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </header>
  )
}
