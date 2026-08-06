import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { Invitation } from '../api/endpoints'
import { ACCOUNT, ADMIN_SESSION, renderWithProviders } from '../test/render'

const fetchInvitations = vi.fn()
const createInvitation = vi.fn()
const revokeInvitation = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchInvitations: (...args: unknown[]) => fetchInvitations(...args),
  createInvitation: (...args: unknown[]) => createInvitation(...args),
  revokeInvitation: (...args: unknown[]) => revokeInvitation(...args),
}))

const { default: AdminInvitations } = await import('./AdminInvitations')

const invitation = (over: Partial<Invitation> = {}): Invitation => ({
  id: '00000000-0000-4000-8000-0000000000d1',
  kind: 'invite',
  created_by: ACCOUNT,
  target_user: null,
  expires_at: '2026-08-08T10:00:00.000Z',
  used_at: null,
  revoked_at: null,
  created_at: '2026-08-01T10:00:00.000Z',
  status: 'pending',
  ...over,
})

const render = () => renderWithProviders(<AdminInvitations />, { session: ADMIN_SESSION })

/**
 * L'inscription se fait sur invitation, et le serveur n'envoie aucun courriel :
 * c'est ici que se fabrique le seul chemin d'entrée dans la médiathèque.
 *
 * Le point qui compte : **le jeton n'est montré qu'une fois**, à sa création.
 * La liste ne le redonne jamais. Si cet affichage cassait, on fabriquerait des
 * liens qu'on ne pourrait plus transmettre.
 */
describe('Invitations — fabriquer le seul chemin d’entrée', () => {
  beforeEach(() => {
    fetchInvitations.mockReset()
    createInvitation.mockReset()
    revokeInvitation.mockReset()
    fetchInvitations.mockResolvedValue({ items: [invitation()], next_cursor: null })
    revokeInvitation.mockResolvedValue(undefined)
  })

  it('fabrique un lien avec la durée et l’aide-mémoire choisis', async () => {
    createInvitation.mockResolvedValue({ token: 'jeton-neuf', url: null })
    render()

    await screen.findByRole('heading', { name: 'Invitations' })
    fireEvent.change(screen.getByLabelText('Valable'), { target: { value: '24' } })
    fireEvent.change(screen.getByLabelText(/Aide-mémoire/), { target: { value: 'pour Dominique' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fabriquer un lien' }))

    await waitFor(() =>
      expect(createInvitation).toHaveBeenCalledWith({
        expires_in_hours: 24,
        note: 'pour Dominique',
      }),
    )
  })

  /**
   * Le back ne compose l'adresse que si `PUBLIC_APP_URL` lui a été donnée ;
   * sinon il renvoie `null` et c'est au front de la former — il est bien placé,
   * il connaît la sienne. Sans ça, l'administrateur reçoit un jeton nu et
   * aucun lien à transmettre.
   */
  it('compose le lien quand le serveur ne le fait pas', async () => {
    createInvitation.mockResolvedValue({ token: 'jeton-neuf', url: null })
    render()

    await screen.findByRole('heading', { name: 'Invitations' })
    fireEvent.click(screen.getByRole('button', { name: 'Fabriquer un lien' }))

    const attendu = `${window.location.origin}/invitation/jeton-neuf`
    expect(await screen.findByText(attendu)).toBeInTheDocument()
  })

  it('préfère l’adresse du serveur quand il en donne une', async () => {
    createInvitation.mockResolvedValue({
      token: 'jeton-neuf',
      url: 'https://mediatheque.example/invitation/jeton-neuf',
    })
    render()

    await screen.findByRole('heading', { name: 'Invitations' })
    fireEvent.click(screen.getByRole('button', { name: 'Fabriquer un lien' }))

    expect(
      await screen.findByText('https://mediatheque.example/invitation/jeton-neuf'),
    ).toBeInTheDocument()
  })

  /** Il ne sera plus affiché ensuite : le dire est la moitié du travail. */
  it('avertit que le lien ne sera plus montré', async () => {
    createInvitation.mockResolvedValue({ token: 'jeton-neuf', url: null })
    render()

    await screen.findByRole('heading', { name: 'Invitations' })
    fireEvent.click(screen.getByRole('button', { name: 'Fabriquer un lien' }))

    expect(await screen.findByText(/copie-le maintenant/)).toBeInTheDocument()
    expect(screen.getByText(/ne sera plus affiché ensuite/)).toBeInTheDocument()
  })

  it('annule une invitation en attente', async () => {
    render()

    fireEvent.click(await screen.findByRole('button', { name: 'Annuler' }))

    await waitFor(() => expect(revokeInvitation).toHaveBeenCalledWith(invitation().id))
  })

  /** Une invitation déjà servie ne s'annule pas : le geste n'aurait pas d'objet. */
  it('n’offre pas d’annuler ce qui est déjà utilisé', async () => {
    fetchInvitations.mockResolvedValue({
      items: [invitation({ status: 'used', used_at: '2026-08-02T10:00:00.000Z' })],
      next_cursor: null,
    })
    render()

    await screen.findByText('Utilisée')
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument()
  })
})
