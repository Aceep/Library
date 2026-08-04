import { MediaMetadata } from 'mediatheque-front'

const frame: React.CSSProperties = {
  padding: 'var(--space-4)',
  maxWidth: '46rem',
}

/**
 * `MediaDetail` est une union discriminée sur `type` : chaque type porte ses
 * propres métadonnées. Les objets ci-dessous n'en gardent que ce que le
 * composant lit — le reste de la fiche ne le concerne pas.
 */
const base = {
  id: '00000000-0000-4000-8000-000000000010',
  external_id: '1',
  original_title: null,
  cover_url: null,
  release_date: null,
  refreshed_at: null,
}

/** Un film : réalisation, distribution, durée, et la bande-annonce en lien. */
export const Film = () => (
  <div style={frame}>
    <MediaMetadata
      detail={
        {
          ...base,
          type: 'movie',
          source: 'tmdb',
          title: 'Les Sept Samouraïs',
          year: 1954,
          metadata: {
            director: 'Akira Kurosawa',
            // `cast` porte le rôle tenu quand la source le connaît : ce sont
            // des objets, pas des chaînes — `castList` lit `name`/`character`.
            cast: [
              { name: 'Toshirō Mifune', character: 'Kikuchiyo' },
              { name: 'Takashi Shimura', character: 'Kambei Shimada' },
              { name: 'Keiko Tsushima', character: 'Shino' },
              { name: 'Yoshio Inaba', character: null },
            ],
            runtime_min: 207,
            genres: ['Aventure', 'Drame'],
            countries: ['Japon'],
            vote_average: 8.5,
            trailer_url: 'https://www.themoviedb.org/video/play?key=exemple',
          },
        } as never
      }
    />
  </div>
)

/** Un livre : l'ISBN et les liens vers la source d'origine. */
export const Livre = () => (
  <div style={frame}>
    <MediaMetadata
      detail={
        {
          ...base,
          type: 'book',
          source: 'openlibrary',
          title: "L'Anomalie",
          year: 2020,
          metadata: {
            authors: ['Hervé Le Tellier'],
            publisher: 'Gallimard',
            page_count: 336,
            language: 'Français',
            series: null,
            genres: ['Roman', 'Science-fiction'],
            isbn13: '9782072895098',
            isbn10: null,
            external_ids: { openlibrary: 'OL28281045W' },
          },
        } as never
      }
    />
  </div>
)

/** Un manga : statut de parution, prépublication, volume. */
export const Manga = () => (
  <div style={frame}>
    <MediaMetadata
      detail={
        {
          ...base,
          type: 'comic_series',
          source: 'anilist',
          title: 'Vinland Saga',
          year: 2005,
          metadata: {
            authors: ['Makoto Yukimura'],
            publisher_fr: 'Kurokawa',
            status: 'En cours',
            serialization: 'Monthly Afternoon',
            volume_count: 29,
            chapter_count: 216,
            genres: ['Aventure', 'Historique', 'Drame'],
            vote_average: 8.9,
            external_ids: { anilist: '30642', mal: '642' },
          },
        } as never
      }
    />
  </div>
)

/**
 * Un jeu : « Pour en voir le bout » est l'intitulé retenu pour la durée de
 * complétion — plus parlant qu'un nombre d'heures brut.
 */
export const Jeu = () => (
  <div style={frame}>
    <MediaMetadata
      detail={
        {
          ...base,
          type: 'game',
          source: 'igdb',
          title: 'Outer Wilds',
          year: 2019,
          metadata: {
            developer: 'Mobius Digital',
            publisher: 'Annapurna Interactive',
            platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Switch'],
            genres: ['Aventure', 'Exploration'],
            completion_hours: 22,
            vote_average: 9.1,
            screenshots: [],
          },
        } as never
      }
    />
  </div>
)

/**
 * Les champs nuls s'effacent : une fiche à peine renseignée ne montre pas
 * d'intitulés vides, elle montre moins de lignes.
 */
export const FicheIncomplete = () => (
  <div style={frame}>
    <MediaMetadata
      detail={
        {
          ...base,
          type: 'movie',
          source: 'tmdb',
          title: 'Fiche à peine renseignée',
          year: null,
          metadata: {
            director: null,
            cast: [],
            runtime_min: 96,
            genres: ['Drame'],
            countries: [],
            vote_average: null,
            trailer_url: null,
          },
        } as never
      }
    />
  </div>
)
