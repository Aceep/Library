import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLibrary, setShowcase } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import { MEDIA_TYPES, typeLabel, typeLabelPlural } from '../api/schema'
import type { MediaSummary, MediaType, Showcase as ShowcaseType, UserDetail } from '../api/schema'
import Cover from './Cover'
import ErrorNotice from './ErrorNotice'
import styles from './Showcase.module.css'

/** Le maximum est celui du contrat : au-delà, le back refuse en 400. */
const MAX = 8

/**
 * Les œuvres qu'un membre met en avant sur son profil.
 *
 * C'est ce qui donne une personnalité à une page, là où trois compteurs ne
 * disent rien. Chacun ne pose que la sienne : l'API n'a aucune route pour celle
 * d'un autre, administrateur compris — d'où l'absence totale de geste ici quand
 * ce n'est pas mon profil.
 */
export default function Showcase({
  userId,
  pseudo,
  showcase,
  isMe,
}: {
  userId: string
  pseudo: string
  showcase: ShowcaseType
  isMe: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return <ShowcaseEditor userId={userId} showcase={showcase} onDone={() => setEditing(false)} />
  }

  if (showcase.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.heading}>Sa vitrine</h2>
        <p className={styles.quiet}>
          {isMe
            ? "Tu n'as encore rien mis en avant."
            : `${pseudo} n'a encore rien mis en avant.`}
        </p>
        {isMe ? (
          <button type="button" className={styles.primary} onClick={() => setEditing(true)}>
            Composer ma vitrine
          </button>
        ) : null}
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{isMe ? 'Ma vitrine' : 'Sa vitrine'}</h2>

      <ul className={styles.strip}>
        {showcase.map((media) => (
          <li key={media.id} className={styles.slot}>
            <Link to={`/media/${media.id}`} className={styles.slotLink}>
              <Cover url={media.cover_url} title={media.title} type={media.type} />
              <span className={styles.slotTitle}>{media.title}</span>
              <span className={styles.slotMeta}>
                {[typeLabel(media.type), media.year ?? null].filter(Boolean).join(' · ')}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {isMe ? (
        <button type="button" className={styles.ghost} onClick={() => setEditing(true)}>
          Modifier ma vitrine
        </button>
      ) : null}
    </section>
  )
}

/**
 * L'éditeur travaille sur un brouillon local et n'envoie qu'à l'enregistrement.
 *
 * Ce n'est pas de la coquetterie : `PUT /me/showcase` remplace la vitrine
 * entière. Écrire à chaque clic voudrait dire huit requêtes pour composer une
 * vitrine, et une vitrine incohérente si l'une échoue au milieu.
 */
function ShowcaseEditor({
  userId,
  showcase,
  onDone,
}: {
  userId: string
  showcase: ShowcaseType
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<MediaSummary[]>(showcase)
  const [pickerType, setPickerType] = useState<MediaType | null>(null)

  const save = useMutation({
    mutationFn: () => setShowcase(draft.map((media) => media.id)),
    onSuccess: (result) => {
      // On range la vitrine renvoyée par le serveur, pas le brouillon : c'est
      // lui qui a le dernier mot sur l'ordre et sur ce qui existe encore.
      queryClient.setQueryData(queryKeys.user(userId), (previous?: UserDetail) =>
        previous ? { ...previous, showcase: result.showcase } : previous,
      )
      onDone()
    },
  })

  const chosen = new Set(draft.map((media) => media.id))
  const full = draft.length >= MAX

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= draft.length) return
    const next = [...draft]
    ;[next[index], next[target]] = [next[target], next[index]]
    setDraft(next)
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Ma vitrine</h2>
      <p className={styles.note}>
        Jusqu'à {MAX} œuvres, tous types confondus, dans l'ordre que tu choisis. Rien n'est
        enregistré tant que tu n'as pas validé.
      </p>

      {draft.length === 0 ? (
        <p className={styles.quiet}>Vitrine vide. Choisis une œuvre ci-dessous.</p>
      ) : (
        <ol className={styles.draft}>
          {draft.map((media, index) => (
            <li key={media.id} className={styles.draftRow}>
              <span className={styles.draftRank}>{index + 1}</span>
              <Cover url={media.cover_url} title={media.title} type={media.type} size="sm" />
              <span className={styles.draftTitle}>
                {media.title}
                <span className={styles.draftMeta}>{typeLabel(media.type)}</span>
              </span>
              <span className={styles.draftActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Remonter ${media.title}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => move(index, 1)}
                  disabled={index === draft.length - 1}
                  aria-label={`Descendre ${media.title}`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => setDraft(draft.filter((entry) => entry.id !== media.id))}
                >
                  Retirer
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {save.error ? <ErrorNotice error={save.error} /> : null}

      <div className={styles.editorActions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          {save.isPending ? 'Enregistrement…' : 'Enregistrer ma vitrine'}
        </button>
        <button type="button" className={styles.ghost} onClick={onDone} disabled={save.isPending}>
          Annuler
        </button>
      </div>

      <Picker
        type={pickerType}
        onType={setPickerType}
        chosen={chosen}
        full={full}
        onAdd={(media) => setDraft([...draft, media])}
      />
    </section>
  )
}

/**
 * De quoi choisir : la bibliothèque commune, filtrable par type.
 *
 * Suivre une œuvre n'est pas nécessaire pour la mettre en vitrine — on liste
 * donc tout, et pas seulement ce que je suis.
 */
function Picker({
  type,
  onType,
  chosen,
  full,
  onAdd,
}: {
  type: MediaType | null
  onType: (type: MediaType | null) => void
  chosen: Set<string>
  full: boolean
  onAdd: (media: MediaSummary) => void
}) {
  const filters = { type: type ?? undefined, sort: 'title' as const }
  const list = useInfiniteQuery({
    queryKey: queryKeys.libraryWith(filters),
    queryFn: ({ pageParam, signal }) => fetchLibrary(filters, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  })

  const items = list.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className={styles.picker}>
      <h3 className={styles.pickerHeading}>Choisir une œuvre</h3>

      <div className={styles.filters} role="group" aria-label="Filtrer par type">
        <button
          type="button"
          className={styles.filter}
          aria-pressed={type === null}
          onClick={() => onType(null)}
        >
          Tout
        </button>
        {MEDIA_TYPES.map((value) => (
          <button
            key={value}
            type="button"
            className={styles.filter}
            aria-pressed={type === value}
            onClick={() => onType(value)}
          >
            {typeLabelPlural(value)}
          </button>
        ))}
      </div>

      {full ? (
        <p className={styles.quiet}>
          Vitrine complète&nbsp;: retire une œuvre pour en ajouter une autre.
        </p>
      ) : null}

      {list.isPending ? (
        <p className={styles.quiet}>Chargement…</p>
      ) : list.error ? (
        <ErrorNotice error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <>
          <ul className={styles.candidates}>
            {items.map((item) => (
              <li key={item.id} className={styles.candidate}>
                <Cover url={item.cover_url} title={item.title} type={item.type} size="sm" />
                <span className={styles.candidateTitle}>
                  {item.title}
                  <span className={styles.draftMeta}>
                    {[typeLabel(item.type), item.year ?? null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <button
                  type="button"
                  className={styles.ghost}
                  onClick={() => onAdd(item)}
                  disabled={chosen.has(item.id) || full}
                >
                  {chosen.has(item.id) ? 'En vitrine' : 'Ajouter'}
                </button>
              </li>
            ))}
          </ul>

          {list.hasNextPage ? (
            <button
              type="button"
              className={styles.ghost}
              onClick={() => void list.fetchNextPage()}
              disabled={list.isFetchingNextPage}
            >
              {list.isFetchingNextPage ? 'Chargement…' : 'Charger la suite'}
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
