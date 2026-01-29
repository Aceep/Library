import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

// User passwords - each password maps to a user
const USERS: Record<string, { name: string; avatar: string; color: string }> = {
  'ost': { name: 'Aceep', avatar: '🦊', color: '#f97316' },
  'crepe@davidson1': { name: 'Théo', avatar: '🐺', color: '#8b5cf6' }
}

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    let user
    if (password === 'Crepe@davidson1') {
      user = USERS['crepe@davidson1']
    } else {
      user = USERS[password.toLowerCase()]
    }
    if (user) {
      sessionStorage.setItem('authenticated', 'true')
      sessionStorage.setItem('currentUser', JSON.stringify(user))
      sessionStorage.setItem('userPassword', password)
      navigate('/')
    } else {
      setError('🔒 Access denied. Invalid password.')
      setShake(true)
      setPassword('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="login-container">
      <div className={`login-box ${shake ? 'shake' : ''}`}>
        <h1 className="login-title">📚 Personal Library</h1>
        <p className="login-subtitle">Enter your secret code</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your code..."
            className={`login-input ${error ? 'input-error' : ''}`}
            autoFocus
          />
          
          {error && (
            <div className="login-error-box">
              <p className="login-error">{error}</p>
            </div>
          )}
          
          <button type="submit" className="login-button">
            Enter Realm
          </button>
        </form>
        
        <p className="login-hint">Each code unlocks a unique identity</p>
      </div>
    </div>
  )
}
