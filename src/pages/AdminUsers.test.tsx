import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { UserSummary } from '../api/endpoints'
import { ACCOUNT, ADMIN_SESSION, renderWithProviders } from '../test/render'

const fetchUsers = vi.fn()
const deleteUser = vi.fn()
const setUserRole = vi.fn()
const deactivateUser = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchUsers: (...args: unknown[]) => fetchUsers(...args),
  deleteUser: (...args: unknown[]) => deleteUser(...args),
  setUserRole: (...args: unknown[]) => setUserRole(...args),
  deactivateUser: (...args: unknown[]) => deactivateUser(...args),
}))

const { default: AdminUsers } = await import('./AdminUsers')

const membre = (over: Partial<UserSummary['user']> = {}): UserSummary => ({
  user: {
    ...ACCOUNT,
    id: '00000000-0000-4000-8000-0000000000b2',
    pseudo: 'Camille',
    role: 'user',
    deactivated: false,
    ...over,
  },
  following_count: 2,
  followers_count: 3,
  tracked_count: 12,
  followed_by_me: false,
  joined_at: '2025-01-04T10:00:00.000Z',
})

const render = () => renderWithProviders(<AdminUsers />, { session: ADMIN_SESSION })

/**
 * L'écran qui porte les gestes irréversibles du produit, et qui n'avait aucun
 * test. La suppression emporte le compte, ses notes, ses critiques et ses
 * cochages — rien n'est conservé ni anonymisé.
 *
 * Ce qui s'éprouve ici est donc d'abord **ce qui empêche le geste**, pas ce qui
 * le réussit.
 */
describe('Administration des comptes — les gestes qu’on ne rattrape pas', () => {
  beforeEach(() => {
    fetchUsers.mockReset()
    deleteUser.mockReset()
    setUserRole.mockReset()
    deactivateUser.mockReset()
    fetchUsers.mockResolvedValue({ items: [membre()], next_cursor: null })
    deleteUser.mockResolvedValue(undefined)
    setUserRole.mockResolvedValue({ user: membre().user })
    deactivateUser.mockResolvedValue({ user: membre({ deactivated: true }).user })
  })

  const ouvrirLaSuppression = async () => {
    render()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Supprimer définitivement ce compte' }),
    )
  }

  it('n’arme pas la suppression tant que le pseudo n’est pas écrit', async () => {
    await ouvrirLaSuppression()

    const bouton = screen.getByRole('button', { name: 'Supprimer définitivement' })
    expect(bouton).toBeDisabled()

    // Presque le bon pseudo n'est pas le bon pseudo.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'camille' } })
    expect(bouton).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Camille' } })
    expect(bouton).toBeEnabled()
  })

  it('transmet le pseudo écrit au serveur, qui revérifie', async () => {
    await ouvrirLaSuppression()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Camille' } })
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer définitivement' }))

    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith(membre().user.id, 'Camille'))
  })

  /**
   * La phrase qui compte plus que le bouton : quand quelqu'un s'en va, c'est
   * la désactivation qu'on veut, et elle garde ce qu'il a écrit pour les
   * autres. Sans elle, on supprime en croyant fermer un compte.
   */
  it('propose la désactivation comme le geste ordinaire du départ', async () => {
    await ouvrirLaSuppression()

    expect(screen.getByText(/irréversible/)).toBeInTheDocument()
    expect(screen.getByText(/reste alors visible pour les autres/)).toBeInTheDocument()
  })

  it('renonce sans rien envoyer', async () => {
    await ouvrirLaSuppression()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Camille' } })
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(
      screen.queryByRole('button', { name: 'Supprimer définitivement' }),
    ).not.toBeInTheDocument()
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('passe un membre administrateur', async () => {
    render()

    fireEvent.click(await screen.findByRole('button', { name: 'Passer administrateur' }))

    await waitFor(() => expect(setUserRole).toHaveBeenCalledWith(membre().user.id, 'admin'))
  })

  /**
   * Le back refuse de rétrograder le dernier administrateur (409). On ne
   * propose pas un geste dont on sait qu'il sera refusé — rendre l'action
   * impossible vaut mieux que traiter son erreur.
   */
  it('n’offre pas de rétrograder le dernier administrateur', async () => {
    fetchUsers.mockResolvedValue({
      items: [membre({ role: 'admin', pseudo: 'Seule' })],
      next_cursor: null,
    })
    render()

    const bouton = await screen.findByRole('button', { name: "Retirer l'administration" })
    expect(bouton).toBeDisabled()
    expect(bouton).toHaveAttribute('title', expect.stringContaining('Dernier administrateur'))
  })

  /** On ne peut pas se désactiver soi-même : le back répond 409. */
  it('n’offre pas de se désactiver soi-même', async () => {
    fetchUsers.mockResolvedValue({
      items: [{ ...membre(), user: { ...ACCOUNT, role: 'admin' as const } }],
      next_cursor: null,
    })
    render()

    await screen.findByText(ACCOUNT.pseudo)
    expect(screen.queryByRole('button', { name: 'Désactiver' })).not.toBeInTheDocument()
  })
})
