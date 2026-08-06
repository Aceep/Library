import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchSaga } from '../api/endpoints'
import type { SagaPart } from '../api/schema'
import { queryKeys } from '../api/keys'
import { useReference } from '../reference/ReferenceContext'
import WatchToggle from '../components/WatchToggle'
import Cover from '../components/Cover'
import ErrorNotice from '../components/ErrorNotice'
import { useDocumentTitle } from '../components/useDocumentTitle'
import LoadingNotice from '../components/LoadingNotice'
import styles from './Saga.module.css'

export default function Saga() {
  const { id } = useParams()
  if (!id) return <Navigate to="/" replace />
  return <SagaDetail key={id} id={id} />
}

function SagaDetail({ id }: { id: string }) {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.saga(id),
    queryFn: ({ signal }) => fetchSaga(id, signal),
  })

  useDocumentTitle(data?.saga.title ?? null)

  /*
    Le cadre ne dépend d'aucune requête : il est là dès la première peinture.
    Sur une fiche il est mince — un `<h1>` ne s'invente pas, et un titre de
    remplacement mentirait — mais ce qu'on gagne compte quand même : la page
    n'est plus détruite puis reconstruite à chaque arrivée, donc plus de saut
    de défilement, et le repère de contenu reste en place.
  */
  if (isPending || error) {
    return (
      <div className={styles.page}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Saga</p>
        </header>
        {isPending ? (
          <LoadingNotice />
        ) : (
          <ErrorNotice error={error} onRetry={() => void refetch()} />
        )}
      </div>
    )
  }

  const { saga } = data
  const absentes = saga.part_count - saga.in_library_count

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Saga</p>
        <h1 className={styles.title}>{saga.title}</h1>
        {saga.summary ? <p className={styles.summary}>{saga.summary}</p> : null}

        <div className={styles.progress}>
          <p className={styles.progressLine}>
            <strong>
              {saga.progress.checked} sur {saga.progress.total}
            </strong>{' '}
            {saga.progress.checked > 1 ? 'terminées' : 'terminée'}
          </p>

          {/*
            Le point qu'on ne peut pas laisser ambigu. Le dénominateur compte
            **toutes** les parties connues de la source, y compris celles qui
            n'ont pas de fiche chez nous — c'est le sens même d'une saga
            surveillée. Sans cette phrase, « 1 sur 3 » se lit comme « il m'en
            reste deux à voir », alors que deux d'entre elles ne sont même pas
            là.
          */}
          {absentes > 0 ? (
            <p className={styles.progressNote}>
              Sur ces {saga.part_count} parties, <strong>{absentes}</strong>{' '}
              {absentes > 1 ? 'ne sont pas' : "n'est pas"} dans la médiathèque.{' '}
              {absentes > 1 ? 'Elles comptent' : 'Elle compte'} quand même dans le total — c'est
              ce que la veille surveille.
            </p>
          ) : null}
        </div>

        <div className={styles.actions}>
          <WatchToggle target="saga" id={saga.id} watched={saga.watched} />
        </div>
      </header>

      <ol className={styles.parts}>
        {saga.parts.map((part) => (
          <Part key={part.id} part={part} />
        ))}
      </ol>
    </div>
  )
}

function Part({ part }: { part: SagaPart }) {
  const { statusLabel } = useReference()
  const annee = part.release_date ? part.release_date.slice(0, 4) : null

  const corps = (
    <>
      <span className={styles.partPosition} aria-hidden="true">
        {part.position}
      </span>
      <span className={styles.partCover}>
        <Cover
          url={part.media?.cover_url ?? null}
          title={part.title}
          type={part.media?.type ?? 'movie'}
        />
      </span>
      <span className={styles.partBody}>
        <span className={styles.partTitle}>{part.title}</span>
        {annee ? <span className={styles.partYear}>{annee}</span> : null}
      </span>
    </>
  )

  return (
    <li className={part.in_library ? styles.part : `${styles.part} ${styles.partAbsent}`}>
      {part.media ? (
        <Link to={`/media/${part.media.id}`} className={styles.partLink}>
          {corps}
        </Link>
      ) : (
        <div className={styles.partLink}>{corps}</div>
      )}

      <span className={styles.partStatus}>
        {part.media && part.my_status ? (
          statusLabel(part.media.type, part.my_status)
        ) : part.in_library ? (
          <span className={styles.partUntracked}>pas dans ta bibliothèque</span>
        ) : (
          /* Dit en toutes lettres, et non par une absence de badge : une ligne
             sans rien se lit comme un oubli d'affichage. */
          <span className={styles.partMissing}>absente de la médiathèque</span>
        )}
      </span>
    </li>
  )
}
