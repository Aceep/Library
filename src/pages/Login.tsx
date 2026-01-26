import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const CORRECT_PASSWORD = 'library2026' // Change this to your desired password

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem('authenticated', 'true')
      navigate('/')
    } else {
      setError('Incorrect password. Please try again.')
      setPassword('')
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">📚 Personal Library</h1>
        <p className="login-subtitle">Enter password to access</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="login-input"
            autoFocus
          />
          
          {error && <p className="login-error">{error}</p>}
          
          <button type="submit" className="login-button">
            Enter Library
          </button>
        </form>
      </div>
    </div>
  )
}
