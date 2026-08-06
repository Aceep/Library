import styles from './LoadingNotice.module.css'

/**
 * L'attente, dans la langue de la maison : un sourcil en mono, sourd, sur une
 * ligne.
 *
 * **Pas de squelette**, et c'est un choix, pas un raccourci. Un rectangle gris
 * qui prétend être une jaquette est une illustration, et la direction les
 * refuse jusque dans ses états vides. Il faudrait en plus l'animer — or le
 * mouvement n'anime ici que l'opacité et la transformation, jamais une mise en
 * page — et il faudrait le redessiner pour chaque grille, pour qu'il en diverge
 * en silence dès qu'on y touche.
 *
 * Là où une donnée précédente existe, on montre la vraie : `placeholderData`
 * vaut mieux qu'un fantôme, et les listes s'en servent déjà.
 *
 * **Muet exprès.** L'annonce passe par la région polie de la coquille, qui
 * existe *avant* qu'il y ait quelque chose à dire ; un `role="status"` posé en
 * même temps que son texte n'est pas lu de façon fiable.
 */
export default function LoadingNotice({ label = 'Chargement…' }: { label?: string }) {
  return <p className={styles.notice}>{label}</p>
}
