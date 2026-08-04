import type { MediaDetail } from './schema'

/**
 * Liens vers la source d'origine d'une fiche.
 *
 * Chaque schéma d'URL ci-dessous a été **essayé** avant d'être retenu : une
 * adresse construite au jugé produit un lien mort, ce qui est pire que pas de
 * lien du tout.
 *
 * `igdb` est délibérément absent. L'API renvoie un identifiant numérique, or
 * les fiches IGDB s'adressent par leur slug — aucun schéma fiable ne part d'un
 * nombre. Le champ reste donc inexploité tant que ça n'aura pas changé.
 */

export interface ExternalLink {
  label: string
  url: string
}

const LINKS: Record<string, (id: string) => string> = {
  openlibrary: (id) => `https://openlibrary.org/works/${id}`,
  googlebooks: (id) => `https://books.google.com/books?id=${encodeURIComponent(id)}`,
  anilist: (id) => `https://anilist.co/manga/${id}`,
  mal: (id) => `https://myanimelist.net/manga/${id}`,
}

const LABELS: Record<string, string> = {
  openlibrary: 'Open Library',
  googlebooks: 'Google Books',
  anilist: 'AniList',
  mal: 'MyAnimeList',
}

export const externalLinks = (detail: MediaDetail): ExternalLink[] => {
  // Seuls les livres et les mangas en portent ; les films et séries n'ont pas
  // de champ `external_ids` du tout.
  if (detail.type !== 'book' && detail.type !== 'comic_series') return []

  const ids = detail.metadata.external_ids
  if (!ids) return []

  return Object.entries(ids)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '')
    .filter(([source]) => source in LINKS)
    .map(([source, id]) => ({ label: LABELS[source], url: LINKS[source](id) }))
}
