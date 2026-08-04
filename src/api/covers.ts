/**
 * Normalisation des adresses de jaquettes.
 *
 * Le back recompose une URL **absolue** à chaque réponse, à partir de sa
 * variable `STORAGE_PUBLIC_URL`. Cette valeur est celle que le navigateur
 * utilisera — et elle vaut `http://localhost:3000/covers` par défaut. Quand
 * l'API tourne sur une autre machine que le front, `localhost` y désigne celle
 * du navigateur : la jaquette n'arrive jamais.
 *
 * Le front n'a pas besoin de cette base : il proxifie déjà `/covers` vers
 * l'API (`vite.config.ts`, et la réécriture d'hébergement le jour venu). Une
 * adresse relative traverse ce proxy quelle que soit la machine, et survit à
 * un changement d'IP ou de nom de domaine sans qu'on touche à quoi que ce soit.
 *
 * On ne réécrit donc que ce qui vient du stockage de l'API — un chemin sous
 * `/covers/`. Les jaquettes restées distantes (TMDB, IGDB, Open Library)
 * gardent leur adresse : elles ne passent pas par nous.
 */
export const coverSrc = (url: string | null): string | null => {
  if (!url) return null

  // Déjà relative : rien à faire, le proxy s'en charge.
  if (url.startsWith('/')) return url

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    // Adresse inexploitable : `Cover` retombera sur son repli typographique.
    return url
  }

  // `covers.openlibrary.org/b/id/…` n'est pas concerné : c'est le chemin qui
  // décide, pas le nom d'hôte.
  if (parsed.pathname === '/covers' || parsed.pathname.startsWith('/covers/')) {
    return `${parsed.pathname}${parsed.search}`
  }

  return url
}
