import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addQuestItem,
  deleteQuest,
  fetchQuest,
  removeQuestItem,
  searchExternal,
  updateQuest,
} from '../api/endpoints'
import type { MediaType, Quest as QuestShape, QuestItem, QuestStanding } from '../api/schema'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import { queryKeys } from '../api/keys'
import { useSession } from '../session/SessionContext'
import Cover from '../components/Cover'
import BadgeMedal from '../components/BadgeMedal'
import ErrorNotice from '../components/ErrorNotice'
import IdentityDot from '../components/IdentityDot'
import QuestProgress from '../components/QuestProgress'
import { useDocumentTitle } from '../components/useDocumentTitle'
import styles from './Quest.module.css'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export default function Quest() {
  const { id } = useParams()
  if (!id) return <Navigate to="/quetes" replace />
  return <QuestDetail key={id} id={id} />
}

function QuestDetail({ id }: { id: string }) {
  const { isAdmin } = useSession()
  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.quest(id),
    queryFn: ({ signal }) => fetchQuest(id, signal),
  })

  useDocumentTitle(data?.quest.title ?? null)

  if (isPending) return <p className={styles.loading}>Chargement…</p>
  if (error) return <ErrorNotice error={error} onRetry={() => void refetch()} />

  const { quest } = data

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>
          <Link to="/quetes" className={styles.back}>
            Quêtes
          </Link>
          {quest.status === 'draft' ? <span className={styles.draft}>brouillon</span> : null}
        </p>
        <h1 className={styles.title}>{quest.title}</h1>
        {quest.description ? <p className={styles.summary}>{quest.description}</p> : null}

        <QuestProgress progress={quest.progress} className={styles.progress} />

        {quest.progress.completed_at ? (
          <p className={styles.completed}>Achevée le {formatDate(quest.progress.completed_at)}.</p>
        ) : null}

        {quest.due_at ? (
          <p className={styles.due}>
            À viser pour le {formatDate(quest.due_at)}. <strong>Rien ne se ferme</strong> — une
            quête reste achevable après son échéance.
          </p>
        ) : null}

        {/* Montré avant l'achèvement aussi : savoir ce qu'on gagne fait partie
            de la proposition. */}
        <BadgeMedal
          badge={quest.badge}
          obtenu={quest.progress.completed}
          className={styles.badge}
        />
      </header>

      {isAdmin ? <PanneauAdmin quest={quest} /> : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Les œuvres</h2>
        <ol className={styles.items}>
          {quest.items.map((item) => (
            <ItemRow key={item.media.id} item={item} questId={id} isAdmin={isAdmin} />
          ))}
        </ol>
        {quest.items.length === 0 ? (
          <p className={styles.emptyItems}>
            Aucune œuvre pour l’instant. Une quête vide ne peut pas être publiée.
          </p>
        ) : null}
      </section>

      {quest.standings.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Où en sont les autres</h2>
          <ul className={styles.standings}>
            {quest.standings.map((standing) => (
              <StandingRow key={standing.user.id} standing={standing} required={quest.progress.required} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function ItemRow({
  item,
  questId,
  isAdmin,
}: {
  item: QuestItem
  questId: string
  isAdmin: boolean
}) {
  const queryClient = useQueryClient()
  const retirer = useMutation({
    mutationFn: () => removeQuestItem(questId, item.media.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.quests }),
  })

  return (
    <li className={item.done ? `${styles.item} ${styles.itemDone}` : styles.item}>
      <span className={styles.itemCover}>
        <Cover url={item.media.cover_url} title={item.media.title} type={item.media.type} />
      </span>
      <Link to={`/media/${item.media.id}`} className={styles.itemLink}>
        <span className={styles.itemTitle}>{item.media.title}</span>
        {item.media.year ? <span className={styles.itemYear}>{item.media.year}</span> : null}
      </Link>
      {/* « Terminée » et non « vue » : c'est le mot du contrat de la quête, et
          il vaut pour les six types. */}
      <span className={styles.itemState}>{item.done ? 'terminée' : '—'}</span>
      {isAdmin ? (
        <button
          type="button"
          className={styles.itemRemove}
          onClick={() => retirer.mutate()}
          disabled={retirer.isPending}
          aria-label={`Retirer ${item.media.title}`}
        >
          {retirer.isPending ? '…' : 'Retirer'}
        </button>
      ) : null}
      {retirer.error ? <ErrorNotice error={retirer.error} /> : null}
    </li>
  )
}

function StandingRow({ standing, required }: { standing: QuestStanding; required: number }) {
  return (
    <li className={styles.standing}>
      <Link to={`/membres/${standing.user.id}`} className={styles.standingUser}>
        <IdentityDot account={standing.user} withName />
      </Link>
      <span className={styles.standingCount}>
        {standing.done} sur {required}
      </span>
      {standing.completed ? <span className={styles.standingDone}>achevée</span> : null}
    </li>
  )
}

/**
 * Ce qu'un administrateur peut faire, rassemblé plutôt que dispersé dans la
 * page : publier, régler le seuil et l'échéance, ajouter des œuvres, supprimer.
 */
function PanneauAdmin({ quest }: { quest: QuestShape }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [description, setDescription] = useState(quest.description ?? '')
  const [seuil, setSeuil] = useState(quest.threshold === null ? '' : String(quest.threshold))
  const [echeance, setEcheance] = useState(quest.due_at ? quest.due_at.slice(0, 10) : '')

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: queryKeys.quests })

  const enregistrer = useMutation({
    mutationFn: () =>
      updateQuest(quest.id, {
        description: description.trim() === '' ? null : description.trim(),
        threshold: seuil.trim() === '' ? null : Number(seuil),
        due_at: echeance === '' ? null : new Date(`${echeance}T12:00:00Z`).toISOString(),
      }),
    onSuccess: rafraichir,
  })

  const publier = useMutation({
    mutationFn: () => updateQuest(quest.id, { status: 'published' }),
    onSuccess: rafraichir,
  })

  const supprimer = useMutation({
    mutationFn: () => deleteQuest(quest.id),
    onSuccess: () => {
      void rafraichir()
      navigate('/quetes')
    },
  })

  return (
    <section className={styles.admin}>
      <h2 className={styles.sectionTitle}>Administration</h2>

      <div className={styles.adminGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Pourquoi ces œuvres</span>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={4000}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Seuil</span>
          <input
            className={styles.input}
            type="number"
            min={1}
            max={quest.items.length || 1}
            value={seuil}
            onChange={(event) => setSeuil(event.target.value)}
            placeholder={`${quest.items.length} (toutes)`}
          />
          <span className={styles.fieldHint}>
            Vide : il faut tout terminer. Sinon « sept sur dix ».
          </span>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Échéance</span>
          <input
            className={styles.input}
            type="date"
            value={echeance}
            onChange={(event) => setEcheance(event.target.value)}
          />
          <span className={styles.fieldHint}>Indicative — rien ne se ferme.</span>
        </label>
      </div>

      <div className={styles.adminActions}>
        <button
          type="button"
          className={styles.button}
          onClick={() => enregistrer.mutate()}
          disabled={enregistrer.isPending}
        >
          {enregistrer.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>

        {quest.status === 'draft' ? (
          <button
            type="button"
            className={`${styles.button} ${styles.buttonStrong}`}
            onClick={() => publier.mutate()}
            disabled={publier.isPending || quest.items.length === 0}
          >
            {publier.isPending ? 'Publication…' : 'Publier'}
          </button>
        ) : null}

        <button
          type="button"
          className={`${styles.button} ${styles.buttonDanger}`}
          onClick={() => supprimer.mutate()}
          disabled={supprimer.isPending}
        >
          {supprimer.isPending ? 'Suppression…' : 'Supprimer la quête'}
        </button>
      </div>

      {/* Publier notifie tous les membres et ne se défait pas : le dire avant,
          pas après. */}
      {quest.status === 'draft' ? (
        <p className={styles.adminNote}>
          Publier prévient tous les membres et <strong>ne se défait pas</strong> — une quête
          publiée ne redevient jamais brouillon. La progression de chacun se calcule aussitôt sur
          ce qu’il a déjà terminé.
        </p>
      ) : null}

      {enregistrer.error ? <ErrorNotice error={enregistrer.error} /> : null}
      {publier.error ? <ErrorNotice error={publier.error} /> : null}
      {supprimer.error ? <ErrorNotice error={supprimer.error} /> : null}

      <AjoutOeuvre questId={quest.id} />
    </section>
  )
}

/**
 * Ajouter une œuvre, **y compris absente de la médiathèque**.
 *
 * C'est le point qui empêche une quête de n'être qu'un résumé du passé : sans
 * la recherche chez les sources, un administrateur ne pourrait proposer que ce
 * que quelqu'un a déjà ajouté. L'œuvre trouvée entre dans la bibliothèque
 * commune au passage, exactement comme un ajout ordinaire.
 */
function AjoutOeuvre({ questId }: { questId: string }) {
  const queryClient = useQueryClient()
  const [type, setType] = useState<MediaType>('movie')
  const [brouillon, setBrouillon] = useState('')
  const [requete, setRequete] = useState('')

  const recherche = useQuery({
    queryKey: ['recherche-quete', type, requete],
    queryFn: ({ signal }) => searchExternal({ type, q: requete }, null, signal),
    enabled: requete.trim() !== '',
  })

  const ajouter = useMutation({
    mutationFn: (item: { source: string; external_id: string }) =>
      addQuestItem(questId, {
        source: item.source as never,
        external_id: item.external_id,
        type,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.quests }),
  })

  return (
    <div className={styles.search}>
      <h3 className={styles.searchTitle}>Ajouter une œuvre</h3>
      <p className={styles.searchNote}>
        Cherchée chez la source, même si personne ne l’a encore ajoutée — elle entre alors dans la
        médiathèque.
      </p>

      <div className={styles.searchTypes} role="group" aria-label="Type d’œuvre">
        {MEDIA_TYPES.map((candidat) => (
          <button
            key={candidat}
            type="button"
            className={styles.chip}
            aria-pressed={type === candidat}
            onClick={() => setType(candidat)}
          >
            {typeLabelPlural(candidat)}
          </button>
        ))}
      </div>

      <form
        className={styles.searchRow}
        onSubmit={(event) => {
          event.preventDefault()
          setRequete(brouillon)
        }}
      >
        <input
          className={styles.input}
          type="search"
          value={brouillon}
          onChange={(event) => setBrouillon(event.target.value)}
          placeholder="Titre…"
          aria-label="Chercher une œuvre"
        />
        <button type="submit" className={styles.button} disabled={brouillon.trim() === ''}>
          Chercher
        </button>
      </form>

      {recherche.isFetching ? <p className={styles.loading}>Interrogation de la source…</p> : null}
      {recherche.error ? <ErrorNotice error={recherche.error} /> : null}
      {ajouter.error ? <ErrorNotice error={ajouter.error} /> : null}

      {recherche.data ? (
        <ul className={styles.results}>
          {recherche.data.items.slice(0, 8).map((result) => (
            <li key={`${result.source}-${result.external_id}`} className={styles.result}>
              <span className={styles.resultCover}>
                <Cover url={result.cover_url} title={result.title} type={type} />
              </span>
              <span className={styles.resultBody}>
                <span className={styles.resultTitle}>{result.title}</span>
                <span className={styles.resultMeta}>
                  {[result.year, result.source].filter(Boolean).join(' · ')}
                </span>
              </span>
              <button
                type="button"
                className={styles.button}
                onClick={() =>
                  ajouter.mutate({ source: result.source, external_id: result.external_id })
                }
                disabled={ajouter.isPending}
              >
                {ajouter.isPending ? '…' : 'Ajouter'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
