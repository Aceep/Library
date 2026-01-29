import { ReactNode } from 'react'
import Header from './Header'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
  showBackButton?: boolean
  title?: string
}

export default function Layout({ children, showBackButton = false, title }: LayoutProps) {
  return (
    <div className="layout">
      <Header showBackButton={showBackButton} title={title} />
      <main className="layout-content">{children}</main>
    </div>
  )
}
