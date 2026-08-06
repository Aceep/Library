import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createQuest, fetchQuests } from '../api/endpoints'
import type { QuestSummary } from '../api/schema'
import { queryKeys } from '../api/keys'
import { useSession } from '../session/SessionContext'
import { useAnnounce } from '../components/Announcer'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import QuestProgress from '../components/QuestProgress'
import Reveal from '../components/Reveal'
import { useDocumentTitle } from '../components/useDocumentTitle'
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
  useDocumentTitle('Quêtes')
  const { isAdmin } = useSession()
  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.quests,
    queryFn: ({ signal }) => fetchQuests(signal),
  })

  const items = data?.items ?? []

  return (
    <div className={styles.page}>
      {/*
        L'en-tête du registre, dans la forme des maquettes : une étiquette dorée
        en aplat, un filet, le compte à droite. Doré et non gel — les quêtes ne
        sont pas un rayon, et c'est vers elles qu'on va pour faire quelque chose.
      */}
      <header className={styles.intro}>
        <div className={styles.introHead}>
          <span className={styles.eyebrow}>Le registre des quêtes</span>
          <span className={styles.introRule} aria-hidden="true" />
          {items.length > 0 ? (
            <span className={styles.compte}>
              {items.length} proposée{items.length > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
        <h1 className={styles.title}>Quêtes</h1>
        <p className={styles.lede}>
          Une quête n’est pas une recommandation. C’est un parcours composé à la main, et votre
          progression s’y lit dans ce que vous avez déjà terminé — il n’y a rien à cocher ici.
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
        <Reveal as="ul" className={styles.list}>
          {items.map((quest) => (
            <Row key={quest.id} quest={quest} />
          ))}
        </Reveal>
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
  const annoncer = useAnnounce()
  const [titre, setTitre] = useState('')

  const creer = useMutation({
    mutationFn: () => createQuest({ title: titre.trim() }),
    onSuccess: (creee) => {
      // La quête naît en brouillon et apparaît plus bas dans la liste : rien à
      // l'écran ne bouge près du champ qu'on vient de quitter.
      annoncer(`Quête « ${creee.quest.title} » créée, en brouillon.`)
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
      <div className={styles.createHead}>
        <h2 className={styles.createTitle}>
          Écrire une <em>quête</em>
        </h2>
        <span className={styles.createNote}>elle naît en brouillon</span>
      </div>
      <label className={styles.createLabel} htmlFor="titre-quete">
        Son titre
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
