import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import AdminInvitations from './AdminInvitations'
import AdminUsers from './AdminUsers'
import NotFound from './NotFound'

/**
 * Trois façons d'arriver là où l'on n'est pas attendu — une adresse qui
 * n'existe pas, et deux écrans réservés — produisaient **le même geste
 * silencieux** : une redirection vers l'accueil. On se retrouvait ailleurs sans
 * savoir qu'on s'était trompé, ni de quoi.
 *
 * Ce qui s'éprouve ici n'est pas la mise en page : c'est qu'aucune des trois ne
 * se taise, et qu'elles ne se confondent pas entre elles.
 */
describe('Les impasses se disent', () => {
  it('nomme l’adresse demandée au lieu de rediriger', () => {
    renderWithProviders(
      <Routes>
        <Route path="*" element={<NotFound />} />
      </Routes>,
      { route: '/bibliotheqe/film' },
    )

    expect(screen.getByRole('heading', { name: /n’existe pas/ })).toBeInTheDocument()
    // L'adresse est montrée : c'est là qu'est la coquille, et c'est la seule
    // chose que nous sachions et que le lecteur ignore.
    expect(screen.getByText('/bibliotheqe/film')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /accueil/i })).toHaveAttribute('href', '/')
  })

  it('dit à un membre que les comptes sont réservés, sans le renvoyer ailleurs', () => {
    renderWithProviders(<AdminUsers />)

    expect(screen.getByText(/réservé à l’administration/)).toBeInTheDocument()
    // Et surtout : l'écran d'administration lui-même ne s'est pas monté.
    expect(screen.queryByRole('heading', { name: 'Les comptes' })).not.toBeInTheDocument()
  })

  it('dit la même chose sur les invitations', () => {
    renderWithProviders(<AdminInvitations />)

    expect(screen.getByText(/réservé à l’administration/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Invitations' })).not.toBeInTheDocument()
  })

  /**
   * Un refus n'est pas une adresse inconnue. Les deux menaient au même endroit
   * avant ; si leurs textes se remettaient à coïncider, on aurait reperdu la
   * distinction sans que rien ne casse.
   */
  it('ne dit pas d’un refus qu’il s’agit d’une adresse inconnue', () => {
    renderWithProviders(<AdminUsers />)

    expect(screen.queryByText(/n’existe pas/)).not.toBeInTheDocument()
  })
})
