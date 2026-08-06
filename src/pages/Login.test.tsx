import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { ApiError } from '../api/client'
import { renderWithProviders } from '../test/render'

const login = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  login: (...args: unknown[]) => login(...args),
}))

const { default: Login } = await import('./Login')

const remplir = (motDePasse = 'un-mot-de-passe') => {
  fireEvent.change(screen.getByLabelText('Pseudo'), { target: { value: 'Alice' } })
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: motDePasse } })
}

const entrer = () => fireEvent.click(screen.getByRole('button'))

/**
 * L'unique porte d'entrée de l'application, et elle n'avait aucun test.
 *
 * Deux comportements y sont invisibles en lecture et coûteux s'ils cassent :
 * le mot de passe s'efface après un échec — sinon on réessaie en boucle la même
 * frappe fautive — et le refroidissement du 429 désactive le bouton, faute de
 * quoi on épuise sa fenêtre de tentatives contre un serveur qui refuse déjà.
 */
describe('Connexion — ce qui protège de soi-même', () => {
  beforeEach(() => {
    login.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('affiche le message du serveur, tel quel', async () => {
    login.mockRejectedValue(
      new ApiError(
        { code: 'INVALID_CREDENTIALS', message: 'Pseudo ou mot de passe incorrect.', retryable: false },
        401,
      ),
    )
    renderWithProviders(<Login />)

    remplir()
    entrer()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pseudo ou mot de passe incorrect.',
    )
  })

  it('efface le mot de passe après un échec, et garde le pseudo', async () => {
    login.mockRejectedValue(
      new ApiError({ code: 'INVALID_CREDENTIALS', message: 'Non.', retryable: false }, 401),
    )
    renderWithProviders(<Login />)

    remplir()
    entrer()

    await screen.findByRole('alert')
    expect(screen.getByLabelText('Mot de passe')).toHaveValue('')
    // Le pseudo reste : ce n'est pas lui qu'on retape.
    expect(screen.getByLabelText('Pseudo')).toHaveValue('Alice')
  })

  /**
   * Le back limite à dix tentatives par quart d'heure et renvoie un
   * `Retry-After`. Laisser réessayer dans le vide consommerait la fenêtre
   * contre un serveur qui refuse déjà.
   */
  it('désactive le bouton pendant le refroidissement et dit combien de temps', async () => {
    login.mockRejectedValue(
      new ApiError({ code: 'RATE_LIMITED', message: 'Trop d’essais.', retryable: true }, 429, 90),
    )
    renderWithProviders(<Login />)

    remplir()
    entrer()

    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent('Réessayer dans 2 min'),
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  /** Sans `Retry-After`, on retombe sur la fenêtre du back plutôt que sur zéro. */
  it('se rabat sur un quart d’heure quand le serveur ne dit pas combien', async () => {
    login.mockRejectedValue(
      new ApiError({ code: 'RATE_LIMITED', message: 'Trop d’essais.', retryable: true }, 429),
    )
    renderWithProviders(<Login />)

    remplir()
    entrer()

    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent('Réessayer dans 15 min'),
    )
  })

  it('n’envoie rien tant que les deux champs ne sont pas remplis', () => {
    renderWithProviders(<Login />)

    expect(screen.getByRole('button')).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Pseudo'), { target: { value: 'Alice' } })
    expect(screen.getByRole('button')).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'x' } })
    expect(screen.getByRole('button')).toBeEnabled()
  })

  /** Le pseudo part élagué : un espace collé au coller-copier ne doit pas
      faire échouer une connexion valable. */
  it('élague le pseudo avant de l’envoyer', async () => {
    login.mockResolvedValue({ user: { id: 'u1' } })
    renderWithProviders(<Login />)

    fireEvent.change(screen.getByLabelText('Pseudo'), { target: { value: '  Alice  ' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'secret' } })
    entrer()

    await waitFor(() => expect(login).toHaveBeenCalledWith('Alice', 'secret'))
  })
})
