import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
  showBackButton?: boolean
  title?: string
}

export default function Layout({ children, showBackButton = false, title }: LayoutProps) {
  return (
    <div className="layout">
      {(showBackButton || title) && (
        <header className="layout-header">
          {showBackButton && (
            <Link to="/" className="back-button">
              ← Back to Home
            </Link>
          )}
          {title && <h1 className="layout-title">{title}</h1>}
        </header>
      )}
      <main className="layout-content">{children}</main>
    </div>
  )
}
