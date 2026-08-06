import type { MediaType } from './api/schema'

/**
 * Ce qui distingue un rayon d'un autre, et **rien de plus**.
 *
 * Les rayons filtrent un fonds unique : ils partagent leur squelette, leur
 * chrome et leur code. Ce qui change d'un médium à l'autre, c'est le **rythme
 * du rangement** — le ratio d'une jaquette, la largeur d'une colonne, les mots
 * qu'on emploie pour dire « en cours ». Tout cela tient ici, en un endroit,
 * plutôt que dans six écrans qui divergeraient au premier correctif.
 *
 * `numero` suit la numérotation des maquettes (Livres Nº 01 … Musique Nº 06),
 * qui n'est pas l'ordre de `MEDIA_TYPES` : c'est un ordre de rayonnage, celui
 * dans lequel on longe les étagères, et il ne se déduit d'aucune donnée.
 *
 * Hors de `src/api/` volontairement : rien ici ne vient du contrat. Ce sont des
 * choix de présentation, et les mêmes doivent valoir sur le rayon et sur la
 * fiche — une œuvre ne change pas de ratio selon l'écran qui la montre.
 */
export interface Rayonnage {
  numero: string
  /** Ratio de la jaquette. Livres, Films et Manga en 2:3 ; Séries et Jeux en 16:9 ; Musique carré. */
  ratio: '2/3' | '16/9' | '1/1'
  colonnes: number
  hauteurRangee: string
  /** Le titre de la section des suivis commencés, accordé au médium. */
  enCours: string
  /** L'appel de la tuile en tireté qui ferme le rayonnage. */
  verser: string
  /** La légende du rythme, à droite du titre « Le rayonnage ». */
  rythme: string
  presentation: string
  citation: string
  /**
   * Le motif de la mosaïque : combien de colonnes prend la n-ième tuile.
   *
   * Les maquettes écrivent ces largeurs **à la main**, œuvre par œuvre, et rien
   * dans l'API ne les porte. On les remplace par un motif qui se répète selon
   * le rang dans la page : le rythme irrégulier survit, il est stable d'un
   * rendu à l'autre, et il ne prétend pas que la taille d'une tuile dit quelque
   * chose de l'œuvre qu'elle montre.
   *
   * Chaque motif **somme à un multiple du nombre de colonnes** — sans quoi
   * chaque cycle laisserait un trou en fin de rangée.
   */
  motif: number[]
}

export const RAYONNAGES: Record<MediaType, Rayonnage> = {
  book: {
    numero: 'Nº 01',
    ratio: '2/3',
    colonnes: 12,
    hauteurRangee: '300px',
    enCours: 'En lecture',
    verser: 'Verser un livre',
    rythme: 'rythme bibliothèque — tranches serrées, quelques-uns de face',
    presentation:
      "Le rayon le plus lent et le plus prêté. Un livre du fonds passe par plusieurs mains avant de revenir, et revient rarement dans le même état — quelqu'un a corné, quelqu'un a écrit dans la marge, quelqu'un l'a laissé de côté page cent douze.",
    citation: "On ne prête pas un livre, on prête le temps qu'on a passé dedans.",
    // Cas propre : les trois premières de face, le reste en tranche. Traité
    // dans `Rayonnage` plus bas, ce motif n'est pas lu pour les livres.
    motif: [1],
  },
  movie: {
    numero: 'Nº 02',
    // 2:3, comme un livre : c'est le ratio d'une **affiche**. La tuile du
    // rayonnage est en 16:9, mais c'est la forme de la boîte, pas celle de
    // l'artwork qu'on y pose — les deux ne se confondent pas.
    ratio: '2/3',
    colonnes: 6,
    hauteurRangee: '168px',
    enCours: 'En projection',
    verser: 'Verser un film',
    rythme: 'rythme cinéma — 16:9, rangement éditorial',
    presentation:
      "Le seul rayon qui se regarde dans le noir. On y range aussi bien les sept heures d'un film-fleuve que les quatre-vingt-dix minutes qu'on a mises deux ans à finir — le fonds ne trie pas par mérite, seulement par ce que quelqu'un a traversé.",
    citation:
      "Un film qu'on regarde seul et un film qu'on regarde à cinq ne sont pas le même film. Ici les deux sont écrits.",
    motif: [3, 2, 1, 2, 2, 2],
  },
  tv: {
    numero: 'Nº 03',
    ratio: '16/9',
    colonnes: 6,
    hauteurRangee: '168px',
    enCours: 'En cours de saison',
    verser: 'Verser une série',
    rythme: 'rythme feuilleton — une bande par série',
    presentation:
      "Le rayon qui se compte en saisons et se vit en mois. Une série n'est pas plus longue qu'un film : elle occupe une autre place dans une vie — celle des dimanches, des semaines difficiles, des soirs où on n'avait rien décidé.",
    citation: "On ne se souvient pas d'une série, on se souvient de l'année où on l'a regardée.",
    motif: [3, 3, 2, 2, 2],
  },
  comic_series: {
    numero: 'Nº 04',
    ratio: '2/3',
    colonnes: 8,
    hauteurRangee: '250px',
    enCours: 'En cours de série',
    verser: 'Verser un manga',
    rythme: 'rythme librairie — séries entières, tomes numérotés',
    presentation:
      "Le rayon qui se compte en volumes, et qui se prête volume par volume. Une série de trente-sept tomes n'entre jamais entièrement dans une seule maison : elle circule, elle se sépare, et il manque toujours le douze chez quelqu'un.",
    citation: "On a fini le dernier volume à deux heures du matin et personne n'a voulu dire un mot.",
    motif: [2, 2, 1, 1, 2],
  },
  game: {
    numero: 'Nº 05',
    ratio: '16/9',
    colonnes: 6,
    hauteurRangee: '232px',
    enCours: 'En partie',
    verser: 'Verser un jeu',
    rythme: 'rythme paysage — key art large, heures plutôt que pages',
    presentation:
      "Le seul rayon où « fini » ne veut pas dire grand-chose. On y compte en heures, pas en pages, et beaucoup de ce qui est ici a été posé quelque part — ce qui n'est pas un échec, seulement une durée qui ne s'est pas terminée.",
    citation: "Vingt-deux minutes, et recommence. C'est tout le jeu, et c'est aussi tout le reste.",
    motif: [3, 3, 2, 2, 2],
  },
  music: {
    numero: 'Nº 06',
    ratio: '1/1',
    colonnes: 5,
    hauteurRangee: '268px',
    enCours: 'En écoute',
    verser: 'Verser un disque',
    rythme: 'rythme pochette — carré, écoutes plutôt que fins',
    presentation:
      "Le seul rayon qu'on ne finit jamais. Ici on ne compte pas les fins mais les retours : un disque écouté quarante fois est plus présent dans une vie qu'un roman lu une seule.",
    citation:
      "C'était la bande-son de deux hivers du cercle. On l'a mise en boucle sans jamais le décider.",
    motif: [2, 1, 1, 1],
  },
}
