import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changePassword, fetchFollowing, updateMe } from '../api/endpoints'
import { SUGGESTED_COLORS, TOO_CLOSE, colorDistance, isHexColor } from '../api/colors'
import { queryKeys } from '../api/keys'
import type { Session } from '../api/schema'
import ErrorNotice from '../components/ErrorNotice'
import { useSession } from '../session/SessionContext'
import styles from './MyAccount.module.css'

const MIN_PASSWORD = 8

export default function MyAccount() {
  const { user } = useSession()

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Mon compte</p>
        <h1 className={styles.title}>{user.pseudo}</h1>
        <p className={styles.lede}>
          Le pseudo ne se change pas depuis ici&nbsp;: c'est sous ce nom que tes avis apparaissent
          chez les autres. <Link to={`/membres/${user.id}`}>Voir mon profil public</Link>
        </p>
      </header>

      <IdentitySection />
      <PasswordSection />
    </div>
  )
}

function IdentitySection() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const [color, setColor] = useState(user.identity_color)
  const [avatar, setAvatar] = useState(user.avatar_url ?? '')

  // Pour prévenir d'une teinte trop proche, il faut savoir celles des comptes
  // qu'on croisera le plus — ceux auxquels on est abonné.
  const following = useQuery({
    queryKey: queryKeys.following('me'),
    queryFn: ({ signal }) => fetchFollowing('me', null, signal),
  })

  const save = useMutation({
    mutationFn: () =>
      updateMe({
        identity_color: color,
        avatar_url: avatar.trim() === '' ? null : avatar.trim(),
      }),
    onSuccess: (result) => {
      // La session porte le profil : on y range la version du serveur plutôt
      // que d'attendre un rechargement.
      queryClient.setQueryData(queryKeys.session, (previous?: Session | null) =>
        previous ? { ...previous, user: result.user } : previous,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.people })
      void queryClient.invalidateQueries({ queryKey: queryKeys.home })
    },
  })

  const valid = isHexColor(color)
  const clash = valid
    ? (following.data?.items ?? []).find(
        (entry) => colorDistance(entry.user.identity_color, color) < TOO_CLOSE,
      )
    : undefined
  const dirty = color !== user.identity_color || avatar !== (user.avatar_url ?? '')

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Mon identité</h2>
      <p className={styles.note}>
        Cette couleur te distingue partout&nbsp;: sur les fils, à côté des œuvres, sur les barres de
        progression. Elle n'a pas à être unique, mais deux teintes voisines deviennent vite
        indiscernables.
      </p>

      <div className={styles.colorRow}>
        <span
          className={styles.preview}
          style={{ background: valid ? color : 'transparent' }}
          aria-hidden="true"
        />
        <span className={styles.previewLabel}>{user.pseudo}</span>
      </div>

      <div className={styles.swatches} role="group" aria-label="Couleurs suggérées">
        {SUGGESTED_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className={styles.swatch}
            style={{ background: swatch }}
            aria-label={swatch}
            aria-pressed={color.toLowerCase() === swatch.toLowerCase()}
            onClick={() => setColor(swatch)}
          />
        ))}
      </div>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Couleur</span>
          <span className={styles.colorInputs}>
            <input
              type="color"
              value={valid ? color : '#000000'}
              onChange={(event) => setColor(event.target.value)}
              aria-label="Choisir une couleur"
            />
            <input
              type="text"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              spellCheck={false}
              maxLength={7}
              className={valid ? undefined : styles.invalid}
            />
          </span>
          {!valid ? <span className={styles.warn}>Format attendu : #RRGGBB</span> : null}
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Avatar (adresse d'image, facultatif)</span>
          <input
            type="url"
            value={avatar}
            onChange={(event) => setAvatar(event.target.value)}
            placeholder="https://…"
            maxLength={2000}
          />
        </label>
      </div>

      {/* Signalé, jamais bloqué : le back accepte, et c'est peut-être voulu. */}
      {clash ? (
        <p className={styles.clash}>
          <span
            className={styles.clashDot}
            style={{ background: clash.user.identity_color }}
            aria-hidden="true"
          />
          Cette teinte est très proche de celle de <strong>{clash.user.pseudo}</strong>, que tu
          suis. Vos deux pastilles seront difficiles à distinguer.
        </p>
      ) : null}

      {save.error ? <ErrorNotice error={save.error} /> : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => save.mutate()}
          disabled={!valid || !dirty || save.isPending}
        >
          {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {dirty ? (
          <button
            type="button"
            className={styles.ghost}
            onClick={() => {
              setColor(user.identity_color)
              setAvatar(user.avatar_url ?? '')
            }}
            disabled={save.isPending}
          >
            Annuler
          </button>
        ) : null}
        {save.isSuccess && !dirty ? <span className={styles.saved}>Enregistré</span> : null}
      </div>
    </section>
  )
}

function PasswordSection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  const submit = useMutation({
    mutationFn: () => changePassword({ current_password: current, new_password: next }),
    onSuccess: () => {
      setCurrent('')
      setNext('')
      setConfirm('')
    },
  })

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD
  // La confirmation est une garde d'interface : le back ne la demande pas,
  // mais se tromper en tapant à l'aveugle enfermerait dehors.
  const mismatch = confirm.length > 0 && confirm !== next
  const ready = current !== '' && next.length >= MIN_PASSWORD && confirm === next

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Mon mot de passe</h2>

      <form
        className={styles.fields}
        onSubmit={(event) => {
          event.preventDefault()
          if (ready) submit.mutate()
        }}
      >
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Mot de passe actuel</span>
          <input
            type="password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nouveau mot de passe</span>
          <input
            type="password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            maxLength={200}
            required
          />
          <span className={tooShort ? styles.warn : styles.hint}>
            {MIN_PASSWORD} caractères au minimum
          </span>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Confirmation</span>
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            required
          />
          {mismatch ? <span className={styles.warn}>Les deux saisies diffèrent</span> : null}
        </label>

        {submit.error ? <ErrorNotice error={submit.error} /> : null}

        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={!ready || submit.isPending}>
            {submit.isPending ? 'Enregistrement…' : 'Changer mon mot de passe'}
          </button>
          {submit.isSuccess ? <span className={styles.saved}>Mot de passe changé</span> : null}
        </div>
      </form>

      {/* Vérifié contre l'API : une session ouverte ailleurs reste valide
          après le changement. Le dire évite de croire à tort qu'on vient de
          fermer la porte à un appareil perdu. */}
      <p className={styles.note}>
        Les sessions déjà ouvertes ailleurs restent actives&nbsp;: changer de mot de passe ne les
        ferme pas.
      </p>
    </section>
  )
}
