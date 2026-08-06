import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applySeries } from '../api/cache'
import { queryKeys } from '../api/keys'
import {
  addVolume,
  deleteVolume,
  fetchVolumes,
  fetchVolumeTrackers,
  updateVolumeTracking,
} from '../api/endpoints'
import type { VolumeTracking } from '../api/endpoints'
import type { Account, MediaDetail, Page, SeriesAggregate, VolumeDetail } from '../api/schema'
import ErrorNotice from './ErrorNotice'
import PeopleDisclosure from './PeopleDisclosure'
import LoadingNotice from './LoadingNotice'
import styles from './VolumeGrid.module.css'

type VolumePages = { pages: Page<VolumeDetail>[]; pageParams: unknown[] }

export default function VolumeGrid({
  mediaId,
  user,
  range,
}: {
  mediaId: string
  user: Account
  /** Bornes connues de la série, si le back les annonce. */
  range?: { first: number; last: number } | null
}) {
  const mediaQueryKey = queryKeys.media(mediaId)
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)

  const volumes = useInfiniteQuery({
    queryKey: queryKeys.volumes(mediaId),
    queryFn: ({ pageParam, signal }) => fetchVolumes(mediaId, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  })

  const items = volumes.data?.pages.flatMap((page) => page.items) ?? []

  /** L'agrégat de série revient de toutes les écritures : on le range, sans le recalculer. */
  const absorbSeries = (series: SeriesAggregate) => {
    queryClient.setQueryData(mediaQueryKey, (detail?: MediaDetail) =>
      detail ? applySeries(detail, series) : detail,
    )
    void queryClient.invalidateQueries({ queryKey: mediaQueryKey })
    void queryClient.invalidateQueries({ queryKey: queryKeys.home })
    void queryClient.invalidateQueries({ queryKey: queryKeys.library })
  }

  const patch = useMutation({
    mutationFn: (variables: { volumeId: string; patch: Partial<VolumeTracking> }) =>
      updateVolumeTracking(variables.volumeId, variables.patch),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.volumes(mediaId) })
      const previous = queryClient.getQueryData(queryKeys.volumes(mediaId))

      queryClient.setQueryData(queryKeys.volumes(mediaId), (data?: VolumePages) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.map((volume) =>
                  volume.id === variables.volumeId && volume.tracking.me
                    ? {
                        ...volume,
                        tracking: {
                          ...volume.tracking,
                          me: { ...volume.tracking.me, ...variables.patch },
                        },
                      }
                    : volume,
                ),
              })),
            }
          : data,
      )

      return { previous }
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.volumes(mediaId), context.previous)
    },

    onSuccess: (result) => absorbSeries(result.series),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.volumes(mediaId) })
    },
  })

  const create = useMutation({
    mutationFn: (volume: { number: number; title: string | null; isbn13: string | null }) =>
      addVolume(mediaId, volume),
    onSuccess: (result) => {
      setAdding(false)
      absorbSeries(result.series)
      void queryClient.invalidateQueries({ queryKey: queryKeys.volumes(mediaId) })
    },
  })

  const remove = useMutation({
    mutationFn: (volumeId: string) => deleteVolume(volumeId),
    onSuccess: (result) => {
      absorbSeries(result.series)
      void queryClient.invalidateQueries({ queryKey: queryKeys.volumes(mediaId) })
    },
  })

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>
          Tomes
          {/* « Tomes 1 à 40 » dit mieux qu'un total ce qu'on a devant soi :
              une série peut commencer ailleurs qu'à 1. */}
          {range ? (
            <span className={styles.range}>
              {range.first} à {range.last}
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          className={styles.addToggle}
          onClick={() => setAdding((value) => !value)}
        >
          {adding ? 'Annuler' : 'Ajouter un tome'}
        </button>
      </div>

      {adding ? (
        <AddVolumeForm
          nextNumber={nextFreeNumber(items)}
          onSubmit={(volume) => create.mutate(volume)}
          isSaving={create.isPending}
          error={create.error}
        />
      ) : null}

      {volumes.isPending ? (
        <LoadingNotice label="Chargement des tomes…" />
      ) : volumes.error ? (
        <ErrorNotice error={volumes.error} onRetry={() => void volumes.refetch()} />
      ) : items.length === 0 ? (
        <p className={styles.quiet}>Aucun tome connu pour cette série.</p>
      ) : (
        <>
          <ul className={styles.grid}>
            {items.map((volume) => (
              <VolumeTile
                key={volume.id}
                volume={volume}
                user={user}
                disabled={patch.isPending || remove.isPending}
                onToggleRead={(read) =>
                  patch.mutate({ volumeId: volume.id, patch: { status: read ? 'done' : 'todo' } })
                }
                onToggleOwned={(owned) => patch.mutate({ volumeId: volume.id, patch: { owned } })}
                onDelete={() => remove.mutate(volume.id)}
              />
            ))}
          </ul>

          {volumes.hasNextPage ? (
            <button
              type="button"
              className={styles.moreButton}
              onClick={() => void volumes.fetchNextPage()}
              disabled={volumes.isFetchingNextPage}
            >
              {volumes.isFetchingNextPage ? 'Chargement…' : 'Voir les tomes suivants'}
            </button>
          ) : null}
        </>
      )}

      {patch.error ? <ErrorNotice error={patch.error} /> : null}
      {remove.error ? <ErrorNotice error={remove.error} /> : null}
    </section>
  )
}

function VolumeTile({
  volume,
  user,
  disabled,
  onToggleRead,
  onToggleOwned,
  onDelete,
}: {
  volume: VolumeDetail
  user: Account
  disabled: boolean
  onToggleRead: (read: boolean) => void
  onToggleOwned: (owned: boolean) => void
  onDelete: () => void
}) {
  const mine = volume.tracking.me
  const read = mine?.status === 'done'

  return (
    <li className={styles.tile} data-read={read}>
      <div className={styles.tileHeader}>
        <span className={styles.number}>{volume.number}</span>
        {/* Seuls les tomes ajoutés à la main sont supprimables : ceux qui
            viennent de la source reviendraient au prochain rafraîchissement. */}
        {volume.manual ? (
          <button
            type="button"
            className={styles.deleteVolume}
            onClick={onDelete}
            disabled={disabled}
            title="Supprimer ce tome ajouté à la main"
            aria-label={`Supprimer le tome ${volume.number}`}
          >
            ×
          </button>
        ) : null}
      </div>

      {volume.title && volume.title !== `Tome ${volume.number}` ? (
        <p className={styles.tileTitle}>{volume.title}</p>
      ) : null}

      <label className={styles.tileCheck}>
        <input
          type="checkbox"
          checked={read}
          onChange={(event) => onToggleRead(event.target.checked)}
          disabled={disabled}
        />
        Lu
      </label>

      {/* La possession est un axe distinct de la lecture : on peut avoir lu un
          tome emprunté, ou posséder un tome pas encore ouvert. */}
      <label className={styles.tileCheck}>
        <input
          type="checkbox"
          checked={mine?.owned ?? false}
          onChange={(event) => onToggleOwned(event.target.checked)}
          disabled={disabled}
        />
        Possédé
      </label>

      <div className={styles.identities}>
        <span
          className={styles.identity}
          style={{ background: read ? user.identity_color : 'transparent' }}
          title={`${user.pseudo}${read ? ' l’a lu' : ' ne l’a pas lu'}`}
        />
        {/* Tome par tome, l'API ne donne qu'un nombre — les noms se
            demandent au clic, jamais pour toute la grille d'un coup. */}
        <PeopleDisclosure
          count={volume.tracking.others}
          label={['le suit', 'le suivent']}
          panelTitle="Tous ceux qui suivent ce tome" 
          size="sm"
          queryKey={queryKeys.volumeTrackers(volume.id)}
          fetcher={(signal) =>
            fetchVolumeTrackers(volume.id, null, signal).then((page) => ({
              ...page,
              items: page.items.map((entry) => ({
                user: entry.user,
                note: entry.tracking.status === 'done' ? 'lu' : null,
              })),
            }))
          }
        />
      </div>
    </li>
  )
}

function AddVolumeForm({
  nextNumber,
  onSubmit,
  isSaving,
  error,
}: {
  nextNumber: number
  onSubmit: (volume: { number: number; title: string | null; isbn13: string | null }) => void
  isSaving: boolean
  error: unknown
}) {
  const [number, setNumber] = useState(String(nextNumber))
  const [title, setTitle] = useState('')
  const [isbn, setIsbn] = useState('')

  const parsed = Number(number)
  const valid = Number.isInteger(parsed) && parsed >= 0

  return (
    <form
      className={styles.addForm}
      onSubmit={(event) => {
        event.preventDefault()
        if (!valid) return
        onSubmit({
          number: parsed,
          title: title.trim() === '' ? null : title.trim(),
          // Le back veut treize chiffres exactement, ou rien.
          isbn13: /^\d{13}$/.test(isbn.trim()) ? isbn.trim() : null,
        })
      }}
    >
      <label className={styles.addField}>
        <span>Numéro</span>
        <input
          type="number"
          min={0}
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          required
        />
      </label>
      <label className={styles.addField}>
        <span>Titre (facultatif)</span>
        <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className={styles.addField}>
        <span>ISBN-13 (facultatif)</span>
        <input
          type="text"
          inputMode="numeric"
          value={isbn}
          onChange={(event) => setIsbn(event.target.value)}
          placeholder="13 chiffres"
        />
      </label>
      <button type="submit" className={styles.addSubmit} disabled={!valid || isSaving}>
        {isSaving ? 'Ajout…' : 'Ajouter'}
      </button>
      {error ? <ErrorNotice error={error} /> : null}
    </form>
  )
}

/** Proposition de numéro : le suivant après le dernier tome chargé. */
const nextFreeNumber = (volumes: VolumeDetail[]) =>
  volumes.length === 0 ? 1 : Math.max(...volumes.map((volume) => volume.number)) + 1
