import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applyTrackingUpdate } from '../api/cache'
import { queryKeys } from '../api/keys'
import {
  deleteMedia,
  deleteTracking,
  fetchMediaDetail,
  refreshMedia,
  updateTracking,
} from '../api/endpoints'
import type { TrackingPatch } from '../api/endpoints'
import { typeLabel } from '../api/schema'
import type { Account, MediaDetail as MediaDetailType, RefreshResponse } from '../api/schema'
import { RAYONNAGES } from '../rayons'
import Availability from '../components/Availability'
import Cover from '../components/Cover'
import ErrorNotice from '../components/ErrorNotice'
import MediaLog from '../components/MediaLog'
import MemberChip from '../components/MemberChip'
import MediaMetadata from '../components/MediaMetadata'
import ProgressBar from '../components/ProgressBar'
import Screenshots from '../components/Screenshots'
import SagaList from '../components/SagaList'
import WatchToggle from '../components/WatchToggle'
import SeasonList from '../components/SeasonList'
import TrackingPanel, { FollowedTrackings } from '../components/TrackingPanel'
import VolumeGrid from '../components/VolumeGrid'
import { useSession } from '../session/SessionContext'
import styles from './MediaDetail.module.css'

export default function MediaDetail() {
  const { id } = useParams()
  if (!id) return null
  return <Detail key={id} id={id} />
}

function Detail({ id }: { id: string }) {
  const { user, isAdmin } = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [refreshResult, setRefreshResult] = useState<RefreshResponse | null>(null)

  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.media(id),
    queryFn: ({ signal }) => fetchMediaDetail(id, signal),
  })

  /** Les listes dépendent du suivi : elles redeviennent fausses à chaque écriture. */
  const invalidateLists = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.home })
    void queryClient.invalidateQueries({ queryKey: queryKeys.library })
    void queryClient.invalidateQueries({ queryKey: queryKeys.compare })
    // Passer l'œuvre à « terminé » crée une entrée de journal côté serveur :
    // sans ça le panneau afficherait un compte à jour et une liste d'avant.
    void queryClient.invalidateQueries({ queryKey: queryKeys.log(id, null) })
  }

  const patch = useMutation({
    mutationFn: (body: TrackingPatch) => updateTracking(id, body),
    onSuccess: (update) => {
      // On prend l'agrégat renvoyé par le serveur tel quel : rien n'est
      // recalculé côté client, statut et progression compris.
      queryClient.setQueryData(queryKeys.media(id), (previous?: MediaDetailType) =>
        previous ? applyTrackingUpdate(previous, update) : previous,
      )
      invalidateLists()
    },
  })

  const removeTracking = useMutation({
    mutationFn: () => deleteTracking(id),
    onSuccess: () => {
      void refetch()
      invalidateLists()
    },
  })

  const removeMedia = useMutation({
    mutationFn: () => deleteMedia(id),
    onSuccess: () => {
      invalidateLists()
      navigate('/', { replace: true })
    },
  })

  const refresh = useMutation({
    mutationFn: () => refreshMedia(id),
    onSuccess: (result) => {
      setRefreshResult(result)
      void refetch()
    },
  })

  if (isPending) return <p className={styles.loading}>Chargement…</p>
  if (error) return <ErrorNotice error={error} onRetry={() => void refetch()} />

  const detail = data

  const rayon = RAYONNAGES[detail.type]

  return (
    <article className={styles.page} data-media-type={detail.type}>
      {/*
        L'en-tête de la fiche reprend celui de la superposition des maquettes :
        l'étiquette de médium en aplat de gel, la méta en mono, puis le titre en
        grand avec l'année en italique sourde. Le rayon reste atteignable d'un
        clic — la maquette ferme une superposition, un écran a besoin d'un
        chemin de retour.
      */}
      <header className={styles.header}>
        <div className={styles.headerMarks}>
          <Link to={`/bibliotheque/${detail.type}`} className={styles.medium}>
            {typeLabel(detail.type)}
          </Link>
          <span className={styles.headerMeta}>
            {[detail.original_title !== detail.title ? detail.original_title : null, detail.source]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        {/*
          `aria-label` alors que le texte est déjà visible, et ce n'est pas une
          redondance : le nom accessible se calcule en **découpant par nœud puis
          en élaguant chacun**, si bien qu'un espace posé au bord d'un élément
          disparaît. Titre et année dans deux nœuds donnent « Matrix1999 », que
          l'espace soit écrit dans le balisage ou dessiné par `margin-left`.
          L'étiquette dit mot pour mot ce que l'écran montre.
        */}
        <h1
          className={styles.title}
          aria-label={detail.year ? `${detail.title} ${detail.year}` : detail.title}
        >
          {detail.title}
          {detail.year ? <span className={styles.titleYear}> {detail.year}</span> : null}
        </h1>
      </header>

      <div className={styles.body}>
        <div className={styles.aside}>
          <div className={styles.asideArt}>
            <Cover
              url={detail.cover_url}
              title={detail.title}
              type={detail.type}
              size="full"
              ratio={rayon.ratio}
            />
          </div>

          <AuFonds detail={detail} me={user} />
        </div>

        <div className={styles.main}>
          {/* Le repli de la maquette, mot pour mot : une fiche sans résumé est
              une place laissée à qui en écrira un, pas un vide à masquer. */}
          <p className={styles.summary}>
            {detail.summary ??
              "Cette fiche n’a pas encore de résumé — la première personne du cercle qui en écrit un le laisse ici pour les autres."}
          </p>

          {/* L'API ne renvoie plus que ma progression sur la fiche : celle des
              autres se lit œuvre par œuvre dans leurs suivis, plus bas.

              La condition est ici et pas seulement dans `ProgressLine` : un
              conteneur vide occupe quand même sa gouttière dans la colonne, et
              laissait une bande blanche sous le résumé de tout ce qui n'a rien
              à cocher — un film, un album. */}
          {detail.progress.me ? (
            <div className={styles.progressPair}>
              <ProgressLine
                label={user.pseudo}
                color={user.identity_color}
                progress={detail.progress.me}
              />
            </div>
          ) : null}

          <MediaMetadata detail={detail} />

          <div className={styles.sourceRow}>
            <span className={styles.source}>
              Source&nbsp;: {detail.source}
              {detail.refreshed_at
                ? ` · mise à jour le ${formatDate(detail.refreshed_at)}`
                : ' · jamais rafraîchie'}
            </span>
            {/* Rafraîchir est un geste, jamais un effet de bord : le back
                interroge la source externe, ça prend du temps et ça peut
                échouer sans que ce soit une panne de l'application. */}
            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
            >
              {refresh.isPending ? 'Recherche en cours…' : 'Chercher les nouveautés'}
            </button>
          </div>

          {refresh.error ? <ErrorNotice error={refresh.error} /> : null}
          {refreshResult && !refresh.isPending ? (
            <RefreshReport result={refreshResult} onDismiss={() => setRefreshResult(null)} />
          ) : null}

      <div className={styles.panels}>
        <TrackingPanel
          tracking={detail.tracking.me}
          type={detail.type}
          account={user}
          onPatch={(body) => patch.mutate(body)}
          onRemove={() => removeTracking.mutate()}
          isSaving={patch.isPending || removeTracking.isPending}
          error={patch.error ?? removeTracking.error}
        />

        <FollowedTrackings
          mediaId={id}
          following={detail.tracking.following}
          others={detail.tracking.others}
          type={detail.type}
        />
      </div>

      {/* Les sagas auxquelles l'œuvre appartient. La section s'efface d'elle-même
          quand il n'y en a aucune, ce qui est le cas le plus fréquent. */}
      <SagaList sagas={detail.sagas ?? []} />

      {/* Où regarder : films et séries seulement — le champ n'existe pas sur
          les autres types, et la route y répond 400. */}
      {detail.type === 'movie' || detail.type === 'tv' ? (
        <Availability mediaId={id} initial={detail.availability} />
      ) : null}

      {/* Le journal est à côté du suivi, pas dedans : le suivi dit ce que j'en
          pense maintenant, le journal ce que j'en ai pensé chaque fois. */}
      <MediaLog
        mediaId={id}
        type={detail.type}
        tracking={detail.tracking.me}
        onTracking={(tracking) => {
          queryClient.setQueryData(queryKeys.media(id), (previous?: MediaDetailType) =>
            previous ? applyTrackingUpdate(previous, { tracking, series: null }) : previous,
          )
        }}
      />

      {/* La veille ne concerne que ce qui peut **gagner** du contenu : une
          série, un manga. Un film ne sortira pas une deuxième fois — c'est sa
          saga qu'on surveille, et elle a son propre bouton.

          Volontairement hors du panneau de suivi : surveiller n'a rien à voir
          avec suivre. On surveille une série qu'on n'a pas commencée, et on
          peut avoir tout lu d'un manga sans vouloir la suite. */}
      {detail.type === 'tv' || detail.type === 'comic_series' ? (
        <section className={styles.watchSection}>
          <h2 className={styles.watchTitle}>Veille</h2>
          <div className={styles.watchRow}>
            <p className={styles.watchNote}>
              {detail.watched
                ? 'Tu seras prévenu quand du nouveau paraîtra. Lever la veille n’efface pas les nouveautés déjà annoncées.'
                : 'Être prévenu quand un nouvel épisode ou un nouveau tome paraît. Sans rapport avec ton suivi.'}
            </p>
            <WatchToggle target="media" id={id} watched={detail.watched} />
          </div>
        </section>
      ) : null}

      {/* Saisons, épisodes et tomes : chargés à la demande, jamais avec la
          fiche — `GET /media/:id` n'en contient qu'un résumé. */}
      {detail.type === 'tv' ? (
        <SeasonList mediaId={id} seasons={detail.seasons} user={user} />
      ) : null}

      {detail.type === 'game' && detail.metadata.screenshots.length > 0 ? (
        <Screenshots urls={detail.metadata.screenshots} title={detail.title} />
      ) : null}

      {detail.type === 'comic_series' ? (
        <VolumeGrid
          mediaId={id}
          user={user}
          // Les deux bornes sont nullables : une plage à moitié connue ne dit
          // rien, on n'affiche donc que si les deux sont là.
          range={
            detail.volumes?.first_number !== null &&
            detail.volumes?.first_number !== undefined &&
            detail.volumes?.last_number !== null &&
            detail.volumes?.last_number !== undefined
              ? { first: detail.volumes.first_number, last: detail.volumes.last_number }
              : null
          }
        />
      ) : null}

      {/* Supprimer pour tout le monde est passé aux administrateurs seuls :
          l'afficher aux autres reviendrait à promettre un geste que le back
          refusera en 403. */}
      {isAdmin ? (
        <DangerZone
          title={detail.title}
          onDelete={() => removeMedia.mutate()}
          isDeleting={removeMedia.isPending}
          error={removeMedia.error}
        />
      ) : null}
        </div>
      </div>
    </article>
  )
}

/**
 * Qui a un exemplaire de l'œuvre au fonds.
 *
 * La maquette appelle ce bloc « Registre des prêts » et lui fait porter des
 * dates de prêt et de retour. **Nous ne suivons aucun prêt** : le contrat ne
 * connaît qu'un booléen `owned` sur un suivi. Garder le mot « prêt » ferait
 * promettre à l'écran une information que personne n'a saisie — le bloc dit
 * donc ce qu'il sait, et rien de plus.
 *
 * Les possesseurs se lisent sur la fiche déjà chargée : moi, puis les comptes
 * auxquels je suis abonné. `others` reste un nombre et ne se filtre pas sur la
 * possession — on ne l'additionne donc pas ici, ce serait compter des gens dont
 * on ignore s'ils possèdent quoi que ce soit.
 */
function AuFonds({ detail, me }: { detail: MediaDetailType; me: Account }) {
  const proprietaires = [
    ...(detail.tracking.me?.owned ? [me] : []),
    ...detail.tracking.following.filter((e) => e.tracking?.owned).map((e) => e.user),
  ]

  return (
    <div className={styles.auFonds}>
      <p className={styles.asideLabel}>Qui l’a au fonds</p>
      {proprietaires.length === 0 ? (
        <p className={styles.auFondsVide}>
          Personne parmi ceux que tu suis n’en a d’exemplaire.
        </p>
      ) : (
        <ul className={styles.auFondsListe}>
          {proprietaires.map((account) => (
            <li key={account.id} className={styles.auFondsLigne}>
              <MemberChip account={account} size="sm" />
              <span className={styles.auFondsNom}>{account.pseudo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProgressLine({
  label,
  color,
  progress,
}: {
  label: string
  color: string
  progress: { checked: number; total: number } | null
}) {
  if (!progress) return null
  return (
    <div className={styles.progressLine}>
      <span className={styles.progressName}>
        <span className={styles.progressDot} style={{ background: color }} aria-hidden="true" />
        {label}
      </span>
      <ProgressBar progress={progress} color={color} label={`Progression de ${label}`} />
    </div>
  )
}

/**
 * Deux suppressions très différentes, et l'ordre le dit : retirer de sa propre
 * bibliothèque est le geste courant (dans le panneau de suivi), supprimer pour
 * tout le monde est un geste rare, confirmé, et que le back peut refuser.
 */
function DangerZone({
  title,
  onDelete,
  isDeleting,
  error,
}: {
  title: string
  onDelete: () => void
  isDeleting: boolean
  error: unknown
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <section className={styles.danger}>
      {!confirming ? (
        <button type="button" className={styles.dangerLink} onClick={() => setConfirming(true)}>
          Supprimer pour tout le monde
        </button>
      ) : (
        <div className={styles.dangerConfirm}>
          <p className={styles.dangerText}>
            Supprimer « {title} » retire l'œuvre de la médiathèque entière, avec les suivis de
            chacun. Retirer l'œuvre de ta seule bibliothèque suffit dans presque tous les cas.
          </p>
          <div className={styles.dangerActions}>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setConfirming(false)}
              disabled={isDeleting}
            >
              Annuler
            </button>
          </div>

          {error ? (
            <div className={styles.dangerError}>
              <ErrorNotice error={error} />
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

/**
 * Compte rendu d'un rafraîchissement.
 *
 * Deux choses à dire, et la seconde est la moins évidente : **un
 * rafraîchissement ne supprime jamais rien**. Un épisode retiré du catalogue de
 * la source, ou renuméroté, reste en base — quelqu'un l'a peut-être marqué vu.
 * Le back le signale dans `divergences`, avec un `label` fait pour être affiché.
 * Le taire laisserait croire à une fiche parfaitement alignée sur sa source.
 */
function RefreshReport({
  result,
  onDismiss,
}: {
  result: RefreshResponse
  onDismiss: () => void
}) {
  const { divergences } = result

  return (
    <div className={styles.refreshReport}>
      <p className={styles.refreshResult}>{describeChanges(result)}</p>

      {divergences.length > 0 ? (
        <div className={styles.divergences}>
          <p className={styles.divergencesTitle}>
            {divergences.length}&nbsp;
            {divergences.length > 1 ? 'éléments ne sont plus annoncés' : 'élément n’est plus annoncé'}{' '}
            par la source
          </p>
          <p className={styles.divergencesNote}>
            Ils restent ici : quelqu’un les a peut-être déjà cochés. Rien n’a été supprimé.
          </p>
          <ul className={styles.divergencesList}>
            {divergences.map((entry) => (
              <li key={entry.id} className={styles.divergence}>
                <span className={styles.divergenceKind}>{DIVERGENCE_KIND[entry.kind]}</span>
                <span className={styles.divergenceLabel}>{entry.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button type="button" className={styles.refreshDismiss} onClick={onDismiss}>
        Masquer ce compte rendu
      </button>
    </div>
  )
}

const DIVERGENCE_KIND: Record<RefreshResponse['divergences'][number]['kind'], string> = {
  season: 'Saison',
  episode: 'Épisode',
  volume: 'Tome',
}

const describeChanges = (result: RefreshResponse) => {
  const { changes } = result
  const parts: string[] = []
  if (changes.seasons_added > 0) parts.push(`${changes.seasons_added} saison(s) ajoutée(s)`)
  if (changes.episodes_added > 0) parts.push(`${changes.episodes_added} épisode(s) ajouté(s)`)
  if (changes.episodes_updated > 0) parts.push(`${changes.episodes_updated} épisode(s) mis à jour`)
  if (changes.volumes_added > 0) parts.push(`${changes.volumes_added} tome(s) ajouté(s)`)
  if (changes.metadata_updated) parts.push('fiche mise à jour')
  if (changes.cover_refreshed) parts.push('nouvelle jaquette en cours de récupération')

  if (parts.length === 0) return 'Rien de neuf du côté de la source.'
  return `${parts.join(', ')}.`
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
