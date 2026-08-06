import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { ApiError } from '../api/client'
import { renderWithProviders } from '../test/render'

const checkInvitation = vi.fn()
const register = vi.fn()
const login = vi.fn()
const resetPassword = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  checkInvitation: (...args: unknown[]) => checkInvitation(...args),
  register: (...args: unknown[]) => register(...args),
  login: (...args: unknown[]) => login(...args),
  resetPassword: (...args: unknown[]) => resetPassword(...args),
}))

const { default: Invitation } = await import('./Invitation')

const render = (token = 'jeton-valide') =>
  renderWithProviders(
    <Routes>
      <Route path="/invitation/:token" element={<Invitation />} />
    </Routes>,
    { route: `/invitation/${token}` },
  )

/**
 * La seule route publique de l'application : on y arrive par un lien reçu,
 * sans compte, et elle porte deux écritures — l'inscription et la
 * réinitialisation d'un mot de passe. Elle n'avait aucun test.
 */
describe('Invitation — la seule porte ouverte', () => {
  beforeEach(() => {
    checkInvitation.mockReset()
    register.mockReset()
    login.mockReset()
    resetPassword.mockReset()
  })

  /**
   * Le back ne dit **jamais** pourquoi un jeton ne vaut rien : expiré, révoqué,
   * déjà servi ou inventé donnent la même réponse. En choisir une ici serait
   * mentir à quelqu'un qui n'a aucun moyen de vérifier.
   */
  it('n’invente pas de raison quand le lien ne vaut rien', async () => {
    checkInvitation.mockResolvedValue({ valid: false })
    render('jeton-mort')

    expect(await screen.findByRole('heading', { name: /ne fonctionne pas/ })).toBeInTheDocument()
    expect(screen.getByText(/peut-être expiré, déjà servi, ou été annulé/)).toBeInTheDocument()
    // Aucun formulaire : il n'y a rien à remplir derrière un lien mort.
    expect(screen.queryByRole('button', { name: /Créer|Choisir/ })).not.toBeInTheDocument()
  })

  it('propose l’inscription derrière un lien d’invitation', async () => {
    checkInvitation.mockResolvedValue({ valid: true, kind: 'invitation' })
    render()

    expect(await screen.findByLabelText(/Pseudo/)).toBeInTheDocument()
  })

  /**
   * S'inscrire ne connecte pas côté serveur : l'écran enchaîne la connexion,
   * pour ne pas renvoyer vers un formulaire quelqu'un qui vient d'en remplir
   * un. Si l'enchaînement saute, on se retrouve dehors avec un compte créé.
   */
  it('enchaîne la connexion après l’inscription', async () => {
    checkInvitation.mockResolvedValue({ valid: true, kind: 'invitation' })
    register.mockResolvedValue({ user: { id: 'u1' } })
    login.mockResolvedValue({ user: { id: 'u1' } })
    render('jeton-neuf')

    fireEvent.change(await screen.findByLabelText(/Pseudo/), { target: { value: ' Camille ' } })
    const mots = screen.getAllByLabelText(/mot de passe/i)
    mots.forEach((champ) => fireEvent.change(champ, { target: { value: 'un-mot-de-passe' } }))
    fireEvent.click(screen.getByRole('button', { name: /Créer|Entrer|S’inscrire/i }))

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        token: 'jeton-neuf',
        pseudo: 'Camille',
        password: 'un-mot-de-passe',
      }),
    )
    await waitFor(() => expect(login).toHaveBeenCalledWith('Camille', 'un-mot-de-passe'))
  })

  it('propose la réinitialisation derrière un lien de mot de passe', async () => {
    checkInvitation.mockResolvedValue({ valid: true, kind: 'password_reset', pseudo: 'Camille' })
    render()

    expect(await screen.findByRole('heading', { name: 'Nouveau mot de passe' })).toBeInTheDocument()
    // Le compte concerné est nommé : on ne change pas un mot de passe à
    // l'aveugle sur un lien reçu.
    expect(screen.getByText('Pour le compte Camille.')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Pseudo/)).not.toBeInTheDocument()
  })

  it('affiche le message du serveur quand l’écriture échoue', async () => {
    checkInvitation.mockResolvedValue({ valid: true, kind: 'invitation' })
    register.mockRejectedValue(
      new ApiError({ code: 'CONFLICT', message: 'Ce pseudo est déjà pris.', retryable: false }, 409),
    )
    render()

    fireEvent.change(await screen.findByLabelText(/Pseudo/), { target: { value: 'Camille' } })
    const mots = screen.getAllByLabelText(/mot de passe/i)
    mots.forEach((champ) => fireEvent.change(champ, { target: { value: 'un-mot-de-passe' } }))
    fireEvent.click(screen.getByRole('button', { name: /Créer|Entrer|S’inscrire/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce pseudo est déjà pris.')
    // Et l'on reste sur le formulaire, avec ce qu'on avait tapé.
    expect(screen.getByLabelText(/Pseudo/)).toHaveValue('Camille')
  })
})
