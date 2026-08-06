import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { checkInvitation, login, register, resetPassword } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import ErrorNotice from '../components/ErrorNotice'
import { useDocumentTitle } from '../components/useDocumentTitle'
import styles from './Invitation.module.css'

const MIN_PASSWORD = 8

/**
 * Le bout public de l'application : on y arrive par un lien reçu, sans compte
 * et sans session. C'est la seule page accessible hors du portail de connexion.
 *
 * Un même jeton sert deux usages, et c'est le back qui tranche : `invite` pour
 * créer un compte, `password_reset` pour en reprendre un.
 */
export default function Invitation() {
  useDocumentTitle('Invitation')
  const { token } = useParams()
  if (!token) return null
  return <Gate key={token} token={token} />
}

function Gate({ token }: { token: string }) {
  const check = useQuery({
    queryKey: queryKeys.invitation(token),
    queryFn: ({ signal }) => checkInvitation(token, signal),
    retry: false,
  })

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Médiathèque</p>

        {check.isPending ? (
          <p className={styles.quiet}>Vérification du lien…</p>
        ) : check.error ? (
          <ErrorNotice error={check.error} onRetry={() => void check.refetch()} />
        ) : !check.data.valid ? (
          // Le back ne dit jamais pourquoi un jeton ne vaut rien — expiré,
          // révoqué, déjà utilisé ou inventé donnent la même réponse. Inventer
          // une raison ici serait mentir.
          <>
            <h1 className={styles.title}>Ce lien ne fonctionne pas</h1>
            <p className={styles.note}>
              Il a peut-être expiré, déjà servi, ou été annulé. Demande un nouveau lien à la
              personne qui t'a invitée.
            </p>
          </>
        ) : check.data.kind === 'password_reset' ? (
          <ResetForm token={token} pseudo={check.data.pseudo} />
        ) : (
          <RegisterForm token={token} />
        )}
      </div>
    </div>
  )
}

function RegisterForm({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const [pseudo, setPseudo] = useState('')
  const [password, setPassword] = useState('')

  const submit = useMutation({
    // S'inscrire ne connecte pas : on enchaîne la connexion pour éviter de
    // renvoyer quelqu'un vers un formulaire juste après en avoir rempli un.
    mutationFn: async () => {
      await register({ token, pseudo: pseudo.trim(), password })
      return login(pseudo.trim(), password)
    },
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.session, session)
      window.location.replace('/')
    },
  })

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD
  const ready = pseudo.trim() !== '' && password.length >= MIN_PASSWORD

  return (
    <>
      <h1 className={styles.title}>Bienvenue</h1>
      <p className={styles.note}>
        Choisis un pseudo et un mot de passe. Tu suivras d'office la personne qui t'a invitée — de
        quoi ne pas arriver sur une page vide.
      </p>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          if (ready) submit.mutate()
        }}
      >
        <label className={styles.field}>
          <span className={styles.label}>Pseudo</span>
          <input
            type="text"
            value={pseudo}
            onChange={(event) => setPseudo(event.target.value)}
            autoComplete="username"
            maxLength={64}
            required
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            maxLength={200}
            required
          />
          <span className={tooShort ? styles.hintWarn : styles.hint}>
            {MIN_PASSWORD} caractères au minimum
          </span>
        </label>

        {submit.error ? <ErrorNotice error={submit.error} /> : null}

        <button type="submit" className={styles.submit} disabled={!ready || submit.isPending}>
          {submit.isPending ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
    </>
  )
}

function ResetForm({ token, pseudo }: { token: string; pseudo: string | null }) {
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)

  const submit = useMutation({
    mutationFn: () => resetPassword({ token, password }),
    onSuccess: () => setDone(true),
  })

  if (done) {
    return (
      <>
        <h1 className={styles.title}>Mot de passe changé</h1>
        <p className={styles.note}>Tu peux maintenant te connecter avec le nouveau.</p>
        <a href="/" className={styles.submit}>
          Aller à la connexion
        </a>
      </>
    )
  }

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD
  const ready = password.length >= MIN_PASSWORD

  return (
    <>
      <h1 className={styles.title}>Nouveau mot de passe</h1>
      <p className={styles.note}>
        {pseudo ? `Pour le compte ${pseudo}.` : 'Choisis un nouveau mot de passe.'}
      </p>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          if (ready) submit.mutate()
        }}
      >
        <label className={styles.field}>
          <span className={styles.label}>Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            maxLength={200}
            required
            autoFocus
          />
          <span className={tooShort ? styles.hintWarn : styles.hint}>
            {MIN_PASSWORD} caractères au minimum
          </span>
        </label>

        {submit.error ? <ErrorNotice error={submit.error} /> : null}

        <button type="submit" className={styles.submit} disabled={!ready || submit.isPending}>
          {submit.isPending ? 'Enregistrement…' : 'Changer mon mot de passe'}
        </button>
      </form>
    </>
  )
}
