import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MemberChip, { initials } from './MemberChip'
import { ACCOUNT } from '../test/render'

/**
 * La pastille est le seul endroit où un membre est réduit à deux signes. Deux
 * choses doivent donc tenir : que l'abréviation reste juste quel que soit le
 * pseudo, et que **le nom entier reste accessible** — des initiales seules ne
 * nomment personne pour qui n'a pas la page sous les yeux.
 */
describe('MemberChip — un membre en deux signes', () => {
  it('abrège au mot, deux au plus', () => {
    // Un pseudo d'un seul tenant ne donne qu'une lettre : la maquette suppose
    // des prénoms-noms, ici un pseudo est libre, et on n'invente pas une
    // seconde lettre qui ne voudrait rien dire.
    expect(initials('alice')).toBe('A.')
    expect(initials('marie-claire')).toBe('M.C.')
    expect(initials('jean paul gaultier')).toBe('J.P.')
    expect(initials('elior_b')).toBe('E.B.')
  })

  it('tient sur les pseudos qui ne commencent pas par une lettre', () => {
    expect(initials('  éliane')).toBe('É.')
    expect(initials('42')).toBe('4.')
    // Aucune lettre, aucun chiffre : la pastille ne peut pas rester vide.
    expect(initials('!!!')).toBe('?')
    expect(initials('')).toBe('?')
  })

  it('garde le pseudo entier comme nom accessible', () => {
    render(<MemberChip account={ACCOUNT} />)

    // Trouvable par le nom complet, alors que « A. » est tout ce qui est écrit.
    const pastille = screen.getByLabelText('Alice')
    expect(pastille).toHaveTextContent('A.')
  })

  it('porte l’encre du membre en variable, jamais en couleur écrite', () => {
    render(<MemberChip account={ACCOUNT} />)

    // La couleur arrive du réseau : elle se pose sur l'élément et la feuille
    // la lit. Une couleur écrite en CSS ne pourrait pas suivre le membre.
    expect(screen.getByLabelText('Alice').style.getPropertyValue('--identity')).toBe('#E4572E')
  })
})
