import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useLogin } from '../session/SessionContext'
import { useDocumentTitle } from '../components/useDocumentTitle'
import styles from './Login.module.css'

export default function Login() {
  useDocumentTitle('Se connecter')
  const [pseudo, setPseudo] = useState('')
  const [password, setPassword] = useState('')
  /** Secondes restantes avant de pouvoir réessayer, après un 429. */
  const [cooldown, setCooldown] = useState(0)

  const loginMutation = useLogin()
  const error = loginMutation.error

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (cooldown > 0 || loginMutation.isPending) return

    loginMutation.mutate(
      { pseudo: pseudo.trim(), password },
      {
        onError: (err) => {
          setPassword('')
          // Le back limite à 10 tentatives échouées par 15 minutes et renvoie
          // un Retry-After : on désactive le bouton plutôt que de laisser
          // réessayer dans le vide.
          if (err instanceof ApiError && err.code === 'RATE_LIMITED') {
            setCooldown(err.retryAfterSeconds ?? 15 * 60)
          }
        },
      },
    )
  }

  const disabled = loginMutation.isPending || cooldown > 0 || !pseudo.trim() || !password

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Médiathèque partagée</p>
        <h1 className={styles.title}>Se connecter</h1>
        <p className={styles.lede}>
          Une bibliothèque commune, deux suivis distincts. Connecte-toi pour retrouver le tien.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Pseudo</span>
            <input
              type="text"
              value={pseudo}
              onChange={(event) => setPseudo(event.target.value)}
              className={styles.input}
              autoComplete="username"
              autoFocus
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={styles.input}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <p className={styles.error} role="alert">
              {/* Message du serveur, affiché tel quel. */}
              {error instanceof ApiError
                ? error.message
                : 'Connexion impossible. Réessaie dans un instant.'}
            </p>
          ) : null}

          <button type="submit" className={styles.submit} disabled={disabled}>
            {loginMutation.isPending
              ? 'Connexion…'
              : cooldown > 0
                ? `Réessayer dans ${formatCooldown(cooldown)}`
                : 'Entrer'}
          </button>
        </form>
      </div>
    </div>
  )
}

const formatCooldown = (seconds: number) => {
  if (seconds < 60) return `${seconds} s`
  return `${Math.ceil(seconds / 60)} min`
}
