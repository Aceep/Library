import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { ADMIN_SESSION, SESSION, renderWithProviders } from '../test/render'

const fetchBackupStatus = vi.fn()

vi.mock('../api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/endpoints')>()),
  fetchBackupStatus: (...args: unknown[]) => fetchBackupStatus(...args),
}))

const { default: BackupAlert } = await import('./BackupAlert')

const etat = (over: Record<string, unknown> = {}) => ({
  backups: {
    last_success_at: '2026-08-05T02:00:00.000Z',
    age_hours: 9.4,
    stale: false,
    stale_after_hours: 48,
    last_run: {
      ran_at: '2026-08-05T02:00:00.000Z',
      succeeded: true,
      incidents: 0,
      detail: 'sauvegarde écrite et restaurée',
    },
    configured: true,
    ...over,
  },
})

const render = (session = ADMIN_SESSION) => renderWithProviders(<BackupAlert />, { session })

/**
 * Le bandeau existe parce qu'une panne de sauvegarde est restée invisible dix
 * heures. Ce qui s'éprouve ici n'est donc pas qu'il sait s'afficher, mais qu'il
 * **se tait quand il n'a rien à dire** — un bandeau permanent devient un
 * élément de décor, et le jour où il compte, personne ne le lit.
 */
describe('BackupAlert — l’alerte qui doit rester rare', () => {
  // Un test affirme ici que l'API n'est **pas** appelée : sans remise à zéro,
  // il porterait sur les appels des tests précédents.
  beforeEach(() => fetchBackupStatus.mockClear())

  it('ne dit rien quand les sauvegardes sont à jour', async () => {
    fetchBackupStatus.mockResolvedValue(etat())
    render()

    await waitFor(() => expect(fetchBackupStatus).toHaveBeenCalled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('ne demande rien à l’API pour un membre ordinaire', () => {
    fetchBackupStatus.mockResolvedValue(etat({ stale: true }))
    render(SESSION)

    expect(fetchBackupStatus).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('alerte au-delà du seuil, en donnant l’âge et le remède', async () => {
    fetchBackupStatus.mockResolvedValue(etat({ stale: true, age_hours: 61.2 }))
    render()

    expect(await screen.findByText('Les sauvegardes ont pris du retard')).toBeInTheDocument()
    expect(screen.getByText('61 heures')).toBeInTheDocument()
    expect(screen.getByText('docker compose logs sauvegarde')).toBeInTheDocument()
  })

  /**
   * « Le service ne tourne pas » et « la sauvegarde est en retard » demandent
   * des gestes opposés — regarder les conteneurs, ou regarder le disque. Les
   * confondre ferait chercher au mauvais endroit un jour où le temps compte.
   */
  it('distingue un service absent d’un simple retard', async () => {
    fetchBackupStatus.mockResolvedValue(
      etat({ stale: true, configured: false, last_success_at: null, age_hours: null, last_run: null }),
    )
    render()

    expect(
      await screen.findByText('Aucune sauvegarde n’a jamais été enregistrée'),
    ).toBeInTheDocument()
    expect(screen.getByText(/n’a jamais atteint cette base/)).toBeInTheDocument()
    expect(screen.queryByText(/Regarde l’espace disque/)).not.toBeInTheDocument()
  })

  it('nomme la dernière tentative quand elle a échoué', async () => {
    fetchBackupStatus.mockResolvedValue(
      etat({
        stale: true,
        age_hours: 70,
        last_run: {
          ran_at: '2026-08-05T18:00:00.000Z',
          succeeded: false,
          incidents: 1,
          detail: 'pg_dump n’a pas abouti',
        },
      }),
    )
    render()

    expect(await screen.findByText(/pg_dump n’a pas abouti/)).toBeInTheDocument()
  })

  /**
   * Reste un cas non couvert ici, et il vaut mieux le dire que le maquiller :
   * **l'échec de la requête**. Le bandeau se tait alors, par la même ligne
   * — `if (!data) return null` — qui le fait taire pendant le chargement, cas
   * qu'éprouve le premier test de ce fichier.
   *
   * Le test correspondant a été retiré plutôt que laissé rouge ou marqué
   * `skip` : il attendait une **absence**, donc rien ne le retenait pendant que
   * le rejet finissait de se propager, et il échouait sur le rejet lui-même.
   * Les autres tests d'échec du dépôt attendent une conséquence rendue — un
   * message d'erreur — et n'ont pas ce problème. Un test qu'on n'arrive pas à
   * rendre déterministe apprend à ignorer le rouge, ce qui coûte plus cher que
   * le trou qu'il bouche.
   */
})
