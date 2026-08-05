import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createQuest, fetchQuests } from '../api/endpoints'
import type { QuestSummary } from '../api/schema'
import { queryKeys } from '../api/keys'
import { useSession } from '../session/SessionContext'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import QuestProgress from '../components/QuestProgress'
import styles from './Quests.module.css'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Les quêtes : des listes d'œuvres réunies à la main par un administrateur.
 *
 * La progression est **rétroactive** — elle se lit dans le suivi qui existait
 * déjà. Une quête publiée aujourd'hui peut être achevée d'emblée par qui a
 * tout terminé, sans avoir rien fait de nouveau.
 *
 * Les brouillons ne remontent que pour un administrateur ; l'API les cache aux
 * autres, l'écran n'a pas à filtrer.
 */
export default function Quests() {
  const { isAdmin } = useSession()
  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.quests,
    queryFn: ({ signal }) => fetchQuests(signal),
  })

  const items = data?.items ?? []

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Quêtes</p>
        <h1 className={styles.title}>Des parcours proposés, et où tu en es</h1>
        <p className={styles.lede}>
          Une quête réunit des œuvres choisies à la main. Rien à cocher ici : ta progression se lit
          dans ce que tu as déjà terminé.
        </p>
      </header>

      {isAdmin ? <NouvelleQuete /> : null}

      {isPending ? (
        <p className={styles.loading}>Chargement…</p>
      ) : error ? (
        <ErrorNotice error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune quête"
          note={
            isAdmin
              ? 'Crée la première : un titre, puis les œuvres, puis la publication.'
              : 'Les administrateurs n’en ont pas encore proposé.'
          }
        />
      ) : (
        <ul className={styles.list}>
          {items.map((quest) => (
            <Row key={quest.id} quest={quest} />
          ))}
        </ul>
      )}
    </div>
  )
}

function Row({ quest }: { quest: QuestSummary }) {
  return (
    <li className={styles.row}>
      <div className={styles.rowHead}>
        <Link to={`/quetes/${quest.id}`} className={styles.rowTitle}>
          {quest.title}
        </Link>
        {/* Un brouillon n'est visible que des administrateurs : le dire évite
            de croire que les membres le voient déjà. */}
        {quest.status === 'draft' ? <span className={styles.draft}>brouillon</span> : null}
      </div>

      {quest.description ? <p className={styles.rowNote}>{quest.description}</p> : null}

      <QuestProgress progress={quest.progress} className={styles.rowProgress} />

      {/* L'échéance est **indicative** : rien ne se ferme, et une quête dépassée
          reste achevable. Le dire au lieu d'afficher une date qui semble
          couperet. */}
      {quest.due_at ? (
        <p className={styles.rowDue}>À viser pour le {formatDate(quest.due_at)} — indicatif</p>
      ) : null}
    </li>
  )
}

/** Création : le titre suffit, tout le reste s'ajoute ensuite sur la fiche. */
function NouvelleQuete() {
  const queryClient = useQueryClient()
  const [titre, setTitre] = useState('')

  const creer = useMutation({
    mutationFn: () => createQuest({ title: titre.trim() }),
    onSuccess: () => {
      setTitre('')
      void queryClient.invalidateQueries({ queryKey: queryKeys.quests })
    },
  })

  return (
    <form
      className={styles.create}
      onSubmit={(event) => {
        event.preventDefault()
        if (titre.trim()) creer.mutate()
      }}
    >
      <label className={styles.createLabel} htmlFor="titre-quete">
        Nouvelle quête
      </label>
      <div className={styles.createRow}>
        <input
          id="titre-quete"
          className={styles.createInput}
          value={titre}
          onChange={(event) => setTitre(event.target.value)}
          placeholder="Trois films pour commencer"
          maxLength={200}
        />
        <button
          type="submit"
          className={styles.createButton}
          disabled={titre.trim() === '' || creer.isPending}
        >
          {creer.isPending ? 'Création…' : 'Créer un brouillon'}
        </button>
      </div>
      <p className={styles.createHint}>
        Elle naît en brouillon, invisible des membres. Tu y ajouteras les œuvres, puis tu
        publieras.
      </p>
      {creer.error ? <ErrorNotice error={creer.error} /> : null}
    </form>
  )
}
