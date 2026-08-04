import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAvailability } from '../api/endpoints'
import { queryKeys } from '../api/keys'
import type { Availability as AvailabilityType, WatchProvider } from '../api/schema'
import ErrorNotice from './ErrorNotice'
import styles from './Availability.module.css'

/**
 * Les cinq offres, dans l'ordre où on les cherche. `free` et `ads` restent
 * distincts : gratuit et gratuit-avec-publicité ne sont pas la même promesse,
 * et les réunir ferait passer l'un pour l'autre.
 */
const GROUPS: Array<{ key: keyof AvailabilityType & string; label: string }> = [
  { key: 'subscription', label: "Compris dans l'abonnement" },
  { key: 'free', label: 'Gratuit' },
  { key: 'ads', label: 'Gratuit avec publicité' },
  { key: 'rent', label: 'En location' },
  { key: 'buy', label: "À l'achat" },
]

/**
 * Où regarder un film ou une série.
 *
 * **Le protocole est en deux temps, et ce n'est pas un détail d'optimisation.**
 * La fiche ne passe jamais d'appel sortant : elle sert ce bloc depuis le cache
 * seul, pour qu'une panne de TMDB ne puisse ni la ralentir ni l'empêcher de
 * s'afficher. Sur cache froid elle rend `null` — et c'est alors à nous d'aller
 * chercher, par la route dédiée, qui réchauffe le cache au passage.
 *
 * **`null` n'est jamais une erreur** : cache froid, aucune plateforme dans ce
 * pays, ou source injoignable. Les trois répondent `200` et se disent pareil à
 * l'écran. Un écran qui affiche une erreur ici serait faux.
 */
export default function Availability({
  mediaId,
  initial,
}: {
  mediaId: string
  initial: AvailabilityType | null
}) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.availability(mediaId),
    queryFn: ({ signal }) => fetchAvailability(mediaId, false, signal).then((r) => r.availability),
    // Le bloc de la fiche vaut réponse : on ne redemande que s'il manque.
    initialData: initial ?? undefined,
    enabled: initial === null,
  })

  const refresh = useMutation({
    mutationFn: () => fetchAvailability(mediaId, true),
    onSuccess: (result) =>
      queryClient.setQueryData(queryKeys.availability(mediaId), result.availability),
  })

  const availability = query.data ?? null

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Où regarder</h2>
        {/* `refresh` va rechercher chez TMDB : c'est un geste, jamais un effet
            de bord d'affichage. Ces données changent d'un jour à l'autre. */}
        <button
          type="button"
          className={styles.refresh}
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending || query.isFetching}
        >
          {refresh.isPending ? 'Recherche…' : 'Actualiser'}
        </button>
      </div>

      {query.isFetching && !availability ? (
        <p className={styles.quiet}>Recherche des plateformes…</p>
      ) : availability ? (
        <Offers availability={availability} />
      ) : (
        // Ni erreur, ni promesse : on ne sait pas plus que ça.
        <p className={styles.quiet}>Nulle part pour l'instant, du moins d'après la source.</p>
      )}

      {/* Une erreur de chargement ne s'affiche pas : le bloc est secondaire et
          la route répond 200 dans tous les cas normaux. Un échec d'actualisation
          se dit, en revanche — c'est une demande explicite. */}
      {refresh.error ? <ErrorNotice error={refresh.error} /> : null}
    </section>
  )
}

function Offers({ availability }: { availability: AvailabilityType }) {
  const filled = GROUPS.filter((group) => {
    const list = availability[group.key]
    return Array.isArray(list) && list.length > 0
  })

  return (
    <>
      {filled.length === 0 ? (
        <p className={styles.quiet}>
          Aucune plateforme en {regionName(availability.region)} pour l'instant.
        </p>
      ) : (
        <div className={styles.groups}>
          {filled.map((group) => (
            <div key={group.key} className={styles.group}>
              <h3 className={styles.groupLabel}>{group.label}</h3>
              <ul className={styles.providers}>
                {(availability[group.key] as WatchProvider[]).map((provider) => (
                  <li key={provider.id} className={styles.provider}>
                    {provider.logo_url ? (
                      <img
                        src={provider.logo_url}
                        alt=""
                        className={styles.logo}
                        loading="lazy"
                      />
                    ) : null}
                    <span className={styles.providerName}>{provider.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className={styles.region}>
        Offres en {regionName(availability.region)}
        {availability.link ? (
          <>
            {' · '}
            {/* Repli quand une plateforme manque à l'appel : c'est leur liste,
                tenue à jour par eux. */}
            <a href={availability.link} target="_blank" rel="noreferrer">
              la liste complète sur TMDB
            </a>
          </>
        ) : null}
      </p>

      {/*
        L'attribution à JustWatch est **obligatoire** dès que ces plateformes
        sont affichées, et sur chaque œuvre : c'est une condition d'utilisation
        de l'API TMDB, pas un usage. Un manquement leur donne le droit de couper
        la clé — c'est-à-dire les films, les séries et les jaquettes de toute
        l'application.

        Elle est donc à côté du bloc, visible sans interaction, et rendue depuis
        la donnée elle-même. Elle n'apparaît jamais quand il n'y a rien à
        attribuer : `availability` nul, pas de mention.
      */}
      <p className={styles.attribution}>
        <a href={availability.attribution.url} target="_blank" rel="noreferrer">
          {availability.attribution.text}
        </a>
      </p>
    </>
  )
}

/** Le pays est celui de l'instance, pas celui du membre — autant le nommer. */
const regionName = (region: string) => {
  const names = new Intl.DisplayNames(['fr'], { type: 'region' })
  return names.of(region) ?? region
}
