/**
 * La couleur d'identité est le seul signal qui distingue les membres à côté
 * d'une œuvre, dans un fil ou sur une barre de progression. L'API la laisse
 * libre et n'impose aucune unicité : deux personnes peuvent choisir la même
 * teinte, et l'application ne saurait plus les séparer d'un coup d'œil.
 *
 * On ne l'interdit pas — ce n'est pas notre rôle, et le back l'accepte — mais
 * on le dit avant de valider.
 */

export const isHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value)

const toRgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
})

/**
 * Distance perceptuelle approchée, pondérée façon « redmean ».
 * Suffisante ici : on ne cherche pas la justesse colorimétrique, seulement à
 * repérer deux teintes qu'un œil confondrait.
 */
export const colorDistance = (a: string, b: string): number => {
  if (!isHexColor(a) || !isHexColor(b)) return Number.POSITIVE_INFINITY
  const c1 = toRgb(a)
  const c2 = toRgb(b)
  const rMean = (c1.r + c2.r) / 2
  const dr = c1.r - c2.r
  const dg = c1.g - c2.g
  const db = c1.b - c2.b
  return Math.sqrt(
    (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db,
  )
}

/** En deçà, deux pastilles côte à côte deviennent difficiles à séparer. */
export const TOO_CLOSE = 60

/**
 * Palette de départ : des teintes franches, éloignées les unes des autres, et
 * lisibles sur le fond papier clair. Rien n'oblige à s'y tenir.
 */
export const SUGGESTED_COLORS = [
  '#E4572E',
  '#3A7CA5',
  '#4F7A52',
  '#B07D2B',
  '#8E44AD',
  '#C2185B',
  '#00796B',
  '#5D4037',
]
