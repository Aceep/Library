import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '../api/endpoints'
import type {
  StatDashboard,
  StatPeriod,
  StatQuantities,
  StatQuantity,
  StatTotals,
} from '../api/schema'
import { MEDIA_TYPES, typeLabelPlural } from '../api/schema'
import { queryKeys } from '../api/keys'
import { useSession } from '../session/SessionContext'
import ErrorNotice from '../components/ErrorNotice'
import StatBars from '../components/StatBars'
import StatFigure from '../components/StatFigure'
import StatRanking from '../components/StatRanking'
import styles from './Statistics.module.css'

const PERIODS: { value: StatPeriod; label: string; dans: string }[] = [
  { value: 'week', label: 'Cette semaine', dans: 'la semaine' },
  { value: 'month', label: 'Ce mois-ci', dans: 'le mois' },
  { value: 'year', label: 'Cette année', dans: "l'année" },
  { value: 'all', label: 'Depuis toujours', dans: 'la période' },
]

interface Wording {
  label: string
  /** L'œuvre sur laquelle porte le calcul, au singulier puis au pluriel. */
  counted: [string, string]
  /** Ce qui manque à celles qu'on écarte. */
  missing: string
}

/**
 * Ce que chaque grandeur compte, et ce qui manque quand on l'écarte.
 *
 * `satisfies Record<keyof StatQuantities, …>` fait traverser le contrat à cette
 * table : le jour où le back ajoute une sixième grandeur, la compilation échoue
 * et énumère ce qui manque. C'est le même garde-fou que les libellés de statuts,
 * et pour la même raison — un « pages_read » affiché brut passerait inaperçu
 * longtemps.
 */
const WORDING = {
  pages_read: {
    label: 'Livres',
    counted: ['livre terminé', 'livres terminés'],
    missing: 'sans pagination connue',
  },
  movie_minutes: {
    label: 'Films',
    counted: ['film terminé', 'films terminés'],
    missing: 'sans durée connue',
  },
  tv_minutes: {
    label: 'Séries',
    counted: ['épisode coché', 'épisodes cochés'],
    missing: 'sans durée connue',
  },
  album_minutes: {
    label: 'Musique',
    counted: ['album écouté', 'albums écoutés'],
    missing: 'sans durée connue',
  },
  game_hours: {
    label: 'Jeux',
    counted: ['jeu terminé', 'jeux terminés'],
    missing: 'sans durée de complétion connue',
  },
} satisfies Record<keyof StatQuantities, Wording>

const QUANTITY_KEYS = Object.keys(WORDING) as (keyof StatQuantities)[]

const nombre = (value: number) => new Intl.NumberFormat('fr-FR').format(value)

/**
 * Mettre en forme n'est pas calculer : on ne dérive aucune grandeur nouvelle,
 * on rend lisible celle que l'API a rendue. 3 150 minutes et 52 h 30 sont le
 * même chiffre ; « 3 150 » ne se lit pas.
 */
function formatQuantity(quantity: StatQuantity): { value: string; unit?: string } {
  if (quantity.unit === 'pages') return { value: nombre(quantity.value), unit: 'pages' }
  if (quantity.unit === 'hours') return { value: nombre(quantity.value), unit: 'heures' }

  const minutes = Math.round(quantity.value)
  if (minutes < 60) return { value: nombre(minutes), unit: 'minutes' }
  return { value: `${nombre(Math.floor(minutes / 60))} h ${String(minutes % 60).padStart(2, '0')}` }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const formatMonth = (mois: string) => {
  // `AAAA-MM` — le jour 1 évite qu'un fuseau ne fasse reculer d'un mois.
  const [annee, m] = mois.split('-')
  const date = new Date(Number(annee), Number(m) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export default function Statistics() {
  const { user } = useSession()
  const [params] = useSearchParams()
  // Tout est public : on peut regarder le tableau de bord d'un autre membre.
  // La comparaison côte à côte, elle, viendra plus tard.
  const membre = params.get('membre')
  const isMe = membre === null || membre === user.id

  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.stats(membre),
    queryFn: ({ signal }) => fetchStats(membre ?? undefined, signal),
  })

  const [period, setPeriod] = useState<StatPeriod>('year')

  if (isPending) return <p className={styles.loading}>Chargement…</p>
  if (error) return <ErrorNotice error={error} onRetry={() => void refetch()} />

  const { dashboard } = data
  const totals = dashboard.periods[period]
  const periode = PERIODS.find((p) => p.value === period) ?? PERIODS[3]

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Statistiques</p>
        <h1 className={styles.title}>
          {isMe ? 'Ce que tu as lu, vu, joué et écouté' : `Ce que ${dashboard.scope.user.pseudo} a lu, vu, joué et écouté`}
        </h1>
        <p className={styles.lede}>
          Chaque chiffre calculé dit <strong>sur combien d’œuvres</strong> il porte et combien ont
          été écartées faute de donnée. Un total qui les tairait ne serait pas approximatif, il
          serait faux.
        </p>
      </header>

      <div className={styles.filters} role="group" aria-label="Période">
        {PERIODS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            className={styles.chip}
            aria-pressed={period === entry.value}
            onClick={() => setPeriod(entry.value)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <p className={styles.range}>
        {totals.from
          ? `Du ${formatDate(totals.from)} au ${formatDate(totals.to)}.`
          : `Tout ce qui est enregistré, jusqu’au ${formatDate(totals.to)}.`}
      </p>

      <Terminees totals={totals} periodLabel={periode?.dans ?? 'la période'} isAll={period === 'all'} />

      <Grandeurs totals={totals} />

      <Palmares highlights={dashboard.highlights} />

      <Conditions scope={dashboard.scope} />
    </div>
  )
}

/**
 * Les décomptes — ce qui se compte sans trou possible, parce que ce sont des
 * événements et non des grandeurs. Ils n'ont donc pas de couverture, et n'en
 * ont pas besoin.
 *
 * Une exception : les tomes. Leur **date** a pu être devinée lors de la reprise
 * §14, et une date devinée place le tome dans une semaine plutôt qu'une autre.
 * Le décompte reste exact, sa répartition dans le temps ne l'est pas — c'est le
 * même défaut que la couverture, sous une autre forme, et il se dit de la même
 * façon. Sur « depuis toujours », la date ne décide de rien : on se tait.
 */
function Terminees({
  totals,
  periodLabel,
  isAll,
}: {
  totals: StatTotals
  periodLabel: string
  isAll: boolean
}) {
  const { counts } = totals
  const estimees = counts.volumes_with_estimated_date

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Terminé</h2>

      <p className={styles.headline}>
        <span className={styles.headlineNumber}>{nombre(counts.finished)}</span>
        <span className={styles.headlineUnit}>
          {counts.finished > 1 ? 'œuvres terminées' : 'œuvre terminée'}
        </span>
      </p>
      <p className={styles.headlineNote}>
        Une œuvre reprise compte pour une de plus.
        {counts.rereads > 0
          ? ` ${nombre(counts.rereads)} ${counts.rereads > 1 ? 'en étaient' : 'en était'} une.`
          : ' Aucune reprise ici.'}
      </p>

      <StatBars
        legend="terminées"
        rows={MEDIA_TYPES.map((type) => ({
          label: typeLabelPlural(type),
          count: counts.finished_by_type[type],
        }))}
      />

      <ul className={styles.tallies}>
        <Tally label="Épisodes cochés" value={counts.episodes_watched} />
        <Tally
          label="Tomes lus"
          value={counts.volumes_read}
          note={
            !isAll && counts.volumes_read > 0 && estimees > 0
              ? `dont ${nombre(estimees)} à date estimée — leur place dans ${periodLabel} est approximative`
              : null
          }
        />
        <Tally label="Albums écoutés" value={counts.albums_listened} />
      </ul>
    </section>
  )
}

function Tally({ label, value, note }: { label: string; value: number; note?: string | null }) {
  return (
    <li className={styles.tally}>
      <span className={styles.tallyValue}>{nombre(value)}</span>
      <span className={styles.tallyLabel}>{label}</span>
      {note ? <span className={styles.tallyNote}>{note}</span> : null}
    </li>
  )
}

/**
 * Les grandeurs, mesurées d'un côté, estimées de l'autre.
 *
 * Le partage vient de `basis` dans la réponse, jamais d'une liste écrite ici :
 * le jour où une deuxième estimation apparaît, elle se rangera toute seule du
 * bon côté. Et rien n'est additionné d'un bloc à l'autre — une estimation
 * d'IGDB n'est pas du temps passé.
 */
function Grandeurs({ totals }: { totals: StatTotals }) {
  const entries = QUANTITY_KEYS.map((key) => ({
    key,
    quantity: totals.quantities[key],
    wording: WORDING[key] as Wording,
  }))

  const mesurees = entries.filter((entry) => entry.quantity.basis === 'measured')
  const estimees = entries.filter((entry) => entry.quantity.basis === 'estimated')

  const rendre = ({ key, quantity, wording }: (typeof entries)[number]) => {
    const { value, unit } = formatQuantity(quantity)
    return (
      <StatFigure
        key={key}
        label={wording.label}
        value={value}
        unit={unit}
        coverage={quantity.coverage}
        counted={wording.counted}
        missing={wording.missing}
        basis={quantity.basis}
        note={quantity.note}
      />
    )
  }

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mesuré</h2>
        <div className={styles.figures}>{mesurees.map(rendre)}</div>
      </section>

      {estimees.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Estimé</h2>
          <p className={styles.sectionNote}>
            Ces chiffres viennent d’ailleurs et ne décrivent pas ce que tu as fait. Ils ne
            s’additionnent à rien.
          </p>
          <div className={styles.figures}>{estimees.map(rendre)}</div>
        </section>
      ) : null}
    </>
  )
}

/**
 * Les palmarès portent sur **toute** l'histoire du membre, jamais sur la
 * période choisie — les calculer quatre fois multiplierait le travail par
 * quatre pour un écran qui n'en montre qu'un. Le dire évite qu'on lise
 * « auteur le plus lu cette semaine ».
 */
function Palmares({ highlights }: { highlights: StatDashboard['highlights'] }) {
  const { ratings } = highlights

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Sur toute l’histoire</h2>
      <p className={styles.sectionNote}>
        Ces palmarès ne suivent pas la période choisie plus haut : ils portent sur tout.
      </p>

      <div className={styles.rankings}>
        <Palmares1 title="Auteurs" tallies={highlights.top_authors} noun={['livre', 'livres']} />
        <Palmares1 title="Réalisateurs" tallies={highlights.top_directors} noun={['film', 'films']} />
        <Palmares1 title="Créateurs de séries" tallies={highlights.top_creators} noun={['série', 'séries']} />
        <Palmares1 title="Genres" tallies={highlights.top_genres} noun={['œuvre', 'œuvres']} />
      </div>

      {highlights.busiest_month ? (
        <p className={styles.busiest}>
          Le mois le plus chargé : <strong>{formatMonth(highlights.busiest_month.month)}</strong>,{' '}
          {nombre(highlights.busiest_month.count)}{' '}
          {highlights.busiest_month.count > 1 ? 'œuvres terminées' : 'œuvre terminée'}.
        </p>
      ) : null}

      <div className={styles.ratings}>
        <h3 className={styles.subTitle}>Les notes</h3>
        {ratings.average === null ? (
          <p className={styles.quiet}>Aucune note posée pour l’instant.</p>
        ) : (
          <>
            <StatFigure
              label="Note moyenne"
              value={ratings.average.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
              unit="sur 10"
              coverage={ratings.coverage}
              counted={['entrée notée', 'entrées notées']}
              missing="sans note"
            />
            <div className={styles.distribution}>
              <StatBars
                legend="fois"
                rows={ratings.distribution.map((entry) => ({
                  label: `${entry.rating} sur 10`,
                  count: entry.count,
                }))}
              />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function Palmares1({
  title,
  tallies,
  noun,
}: {
  title: string
  tallies: StatDashboard['highlights']['top_genres']
  noun: [string, string]
}) {
  return (
    <div className={styles.ranking}>
      <h3 className={styles.subTitle}>{title}</h3>
      <StatRanking tallies={tallies} noun={noun} />
    </div>
  )
}

/**
 * Dans quelles conditions ces chiffres ont été calculés. Discret, en bas, et
 * une fois — c'est le genre de chose qui ne compte que le jour où un nombre
 * surprend.
 */
function Conditions({ scope }: { scope: StatDashboard['scope'] }) {
  return (
    <p className={styles.scope}>
      Semaines du lundi, découpage calendaire dans le fuseau {scope.timezone}. Calculé le{' '}
      {formatDate(scope.generated_at)}. <Link to="/quetes">Les quêtes</Link> comptent les mêmes
      œuvres terminées.
    </p>
  )
}
