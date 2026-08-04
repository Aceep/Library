import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setFollow } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import ErrorNotice from './ErrorNotice'
import styles from './FollowButton.module.css'

/**
 * S'abonner à un compte, ou s'en désabonner.
 *
 * L'abonnement ne demande rien à personne : il trie ce qu'on voit, il n'ouvre
 * aucun droit. Le libellé évite donc le vocabulaire de la permission — on suit
 * quelqu'un, on ne lui « demande » pas.
 */
export default function FollowButton({
  userId,
  following,
  pseudo,
  size = 'base',
}: {
  userId: string
  following: boolean
  pseudo: string
  size?: 'sm' | 'base'
}) {
  const queryClient = useQueryClient()

  const toggle = useMutation({
    mutationFn: () => setFollow(userId, !following),
    onSuccess: () => {
      // Un abonnement change ce que renvoient l'accueil, les rayons et les
      // fiches — `following[]` y apparaît ou en disparaît. On périme large
      // plutôt que de recoudre chaque liste à la main.
      void queryClient.invalidateQueries({ queryKey: queryKeys.people })
      void queryClient.invalidateQueries({ queryKey: queryKeys.home })
      void queryClient.invalidateQueries({ queryKey: queryKeys.library })
      void queryClient.invalidateQueries({ queryKey: queryKeys.compare })
      void queryClient.invalidateQueries({ queryKey: ['media'] })
    },
  })

  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        className={size === 'sm' ? styles.buttonSm : styles.button}
        data-following={following}
        onClick={() => toggle.mutate()}
        disabled={toggle.isPending}
        aria-label={following ? `Ne plus suivre ${pseudo}` : `Suivre ${pseudo}`}
      >
        {toggle.isPending ? '…' : following ? 'Suivi' : 'Suivre'}
      </button>
      {toggle.error ? <ErrorNotice error={toggle.error} /> : null}
    </span>
  )
}
