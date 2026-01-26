import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './Card.css'

interface CardProps {
  title: string
  description: string
  to: string
  icon: ReactNode
  color?: string
}

export default function Card({ title, description, to, icon, color }: CardProps) {
  return (
    <Link to={to} className="card" style={{ '--card-color': color } as React.CSSProperties}>
      <div className="card-icon">{icon}</div>
      <h2 className="card-title">{title}</h2>
      <p className="card-description">{description}</p>
    </Link>
  )
}
