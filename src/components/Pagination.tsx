import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { PageInfo } from '../api/schema'
import styles from './Pagination.module.css'

/**
 * Les pages numérotées d'un rayon.
 *
 * ---------------------------------------------------------------------------
 * Ce que c'est, en termes de lecteur d'écran
 * ---------------------------------------------------------------------------
 *
 * Une **navigation**, pas une liste de boutons. `<nav aria-label>` la rend
 * atteignable directement par le raccourci « navigations » de NVDA ou VoiceOver,
 * ce qui compte sur un écran qui a déjà une barre principale et des filtres :
 * sans étiquette, on entend « navigation » deux fois sans savoir laquelle mène
 * où.
 *
 * Les entrées sont des **liens**, pas des boutons, parce qu'elles mènent à une
 * adresse. Cela vient gratuitement avec ce qu'on veut : ouvrir la page 7 dans
 * un onglet, la mettre en favori, la donner à quelqu'un. Un `<button>` aurait
 * demandé de réimplémenter les trois, mal.
 *
 * La page courante porte `aria-current="page"` — la valeur exacte, pas `true` :
 * c'est ce qui fait annoncer « page courante » plutôt que « sélectionné ».
 *
 * ---------------------------------------------------------------------------
 * Le clavier
 * ---------------------------------------------------------------------------
 *
 * La tabulation traverse les liens, comme partout ailleurs — on ne détourne
 * pas `Tab`, et il n'y a pas de « piège à focus » : ce n'est pas un menu, on
 * doit pouvoir en sortir sans rien fermer.
 *
 * S'y ajoutent, **quand le focus est dans la navigation** :
 *
 *   ←  →       page précédente, page suivante
 *   Origine    première page
 *   Fin        dernière page
 *
 * Les flèches naviguent réellement plutôt que de déplacer le focus d'un lien à
 * l'autre : sur une pagination à ellipses, « le lien suivant » n'est pas
 * toujours « la page suivante », et une flèche qui saute de la page 3 à la
 * page 12 parce qu'il y a un trou entre les deux serait un piège.
 *
 * Après une navigation au clavier, le focus est **rendu à la page devenue
 * courante**. Sans cela il retomberait sur `<body>` au remontage et la
 * tabulation repartirait du haut du document — ce qui, sur un rayon, veut dire
 * retraverser tous les filtres.
 */

export interface PaginationProps {
  info: PageInfo
  /** Fabrique l'adresse d'une page — la navigation reste au ressort de l'écran. */
  hrefOf: (page: number) => string
  onNavigate: (page: number) => void
  /** Étiquette de la navigation, pour distinguer deux paginations d'un même écran. */
  label?: string
  /**
   * Ce qu'il faut ramener sous les yeux après un changement de page **à la
   * souris**.
   *
   * Changer de page ne change pas l'adresse d'écran, donc rien ne remontait :
   * on se retrouvait en bas de la page 2, devant sa pagination, sans avoir vu
   * son début. C'est la *liste* qu'on ramène, pas le document — remonter tout
   * en haut ferait retraverser l'en-tête du rayon à chaque page.
   *
   * Au clavier, rien : le focus rendu au numéro courant emmène déjà le regard,
   * et y ajouter un défilement ferait deux mouvements pour un geste.
   */
  ancre?: RefObject<HTMLElement>
}

/**
 * Les numéros à dessiner, ellipses comprises.
 *
 * La règle : toujours la première et la dernière, toujours une fenêtre autour
 * de la courante, et un trou explicite entre les deux. C'est ce qui garde la
 * largeur bornée — une pagination de trois cents pages ne doit pas déborder de
 * l'écran, et personne ne clique sur la page 147 en la cherchant à l'œil.
 *
 * Les trous ne sont pas des liens : ce sont des marques typographiques, et un
 * lecteur d'écran ne doit pas les proposer.
 */
export function pagesAAfficher(courante: number, total: number, fenetre = 1): (number | 'trou')[] {
  if (total <= 1) return total === 1 ? [1] : []

  const gardees = new Set<number>([1, total])
  for (let p = courante - fenetre; p <= courante + fenetre; p++) {
    if (p >= 1 && p <= total) gardees.add(p)
  }

  const triees = [...gardees].sort((a, b) => a - b)
  const sortie: (number | 'trou')[] = []

  for (const [index, page] of triees.entries()) {
    const precedente = triees[index - 1]
    // Un trou d'exactement une page se remplit plutôt que de s'élider : « 1 …
    // 3 » est plus long à lire que « 1 2 3 » et cache un numéro cliquable pour
    // rien.
    if (precedente !== undefined && page - precedente === 2) sortie.push(page - 1)
    else if (precedente !== undefined && page - precedente > 2) sortie.push('trou')
    sortie.push(page)
  }

  return sortie
}

export default function Pagination({
  info,
  hrefOf,
  onNavigate,
  label = 'Pages du rayon',
  ancre,
}: PaginationProps) {
  const nav = useRef<HTMLElement>(null)
  const courant = useRef<HTMLAnchorElement>(null)
  // Ne rendre le focus qu'après une navigation **au clavier** : le faire à
  // chaque rendu volerait le focus à qui est en train de lire ailleurs.
  const rendreLeFocus = useRef(false)
  // Au montage, on *arrive* : la page 1 n'est pas un changement de page, et
  // ramener la liste sous les yeux sauterait l'en-tête du rayon à l'arrivée.
  const premier = useRef(true)

  useEffect(() => {
    if (premier.current) {
      premier.current = false
      return
    }
    if (rendreLeFocus.current) {
      rendreLeFocus.current = false
      courant.current?.focus()
      return
    }
    // `?.()` : jsdom n'implémente pas `scrollIntoView`, et les tests de
    // pagination cliquent « Page 2 ». Même garde que `Reveal` sur
    // `IntersectionObserver`, et pour la même raison.
    ancre?.current?.scrollIntoView?.({ block: 'start' })
  }, [info.page, ancre])

  // Une seule page ne se pagine pas. Zéro non plus : la liste est vide, et
  // l'écran a déjà un état vide qui le dit mieux qu'une pagination à une case.
  if (info.pages <= 1) return null

  const aller = (page: number, parClavier: boolean) => {
    const borne = Math.min(Math.max(page, 1), info.pages)
    if (borne === info.page) return
    rendreLeFocus.current = parClavier
    onNavigate(borne)
  }

  const auClavier = (event: React.KeyboardEvent<HTMLElement>) => {
    const sauts: Record<string, number | undefined> = {
      ArrowLeft: info.page - 1,
      ArrowRight: info.page + 1,
      Home: 1,
      End: info.pages,
    }
    const cible = sauts[event.key]
    if (cible === undefined) return

    // Une flèche dans un champ de saisie appartient au champ. La pagination
    // n'en contient pas aujourd'hui, mais elle en contiendra peut-être un
    // « aller à la page ».
    if (event.target instanceof HTMLInputElement) return

    event.preventDefault()
    aller(cible, true)
  }

  const entrees = pagesAAfficher(info.page, info.pages)

  return (
    <nav className={styles.nav} aria-label={label} ref={nav} onKeyDown={auClavier}>
      {/*
        Le décompte est lu **avant** les numéros, et il est poli : il ne coupe
        pas la lecture en cours, il attend. C'est ce qui fait qu'une navigation
        au clavier s'entend — sans lui, changer de page ne produirait aucune
        annonce, le contenu ayant changé hors du champ du lecteur.
      */}
      <p className={styles.compte} aria-live="polite">
        Page {info.page} sur {info.pages}
        <span className={styles.total}> · {info.total} œuvres</span>
      </p>

      <ul className={styles.liste}>
        <li>
          <Lien
            page={info.page - 1}
            desactive={info.page <= 1}
            hrefOf={hrefOf}
            onNavigate={aller}
            className={styles.bord}
          >
            <span aria-hidden="true">‹</span>
            <span className={styles.motBord}>Précédente</span>
          </Lien>
        </li>

        {entrees.map((entree, index) =>
          entree === 'trou' ? (
            // `aria-hidden` : l'ellipse est une marque de mise en page. Annoncée,
            // elle ferait entendre « points de suspension » entre deux numéros.
            <li key={`trou-${index}`} className={styles.trou} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={entree}>
              <a
                href={hrefOf(entree)}
                ref={entree === info.page ? courant : undefined}
                aria-current={entree === info.page ? 'page' : undefined}
                /*
                  `aria-label` plutôt qu'un mot caché dans un `<span>` : le
                  calcul du nom accessible recolle les nœuds voisins sans
                  séparateur, si bien que « Page » suivi de « 4 » donnait
                  « Page4 » — annoncé comme un mot, pas comme un numéro. Le
                  chiffre nu reste visible, et « 4 » est bien contenu dans
                  « Page 4 » : la règle « l'étiquette visible fait partie du
                  nom » est respectée.
                */
                aria-label={`Page ${entree}`}
                className={entree === info.page ? styles.courante : styles.page}
                onClick={(event) => {
                  // Un clic milieu, ou avec une touche de modification, doit
                  // garder son sens de navigateur : nouvel onglet, nouvelle
                  // fenêtre, téléchargement. On n'intercepte que le clic nu.
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                  event.preventDefault()
                  aller(entree, false)
                }}
              >
                {entree}
              </a>
            </li>
          ),
        )}

        <li>
          <Lien
            page={info.page + 1}
            desactive={info.page >= info.pages}
            hrefOf={hrefOf}
            onNavigate={aller}
            className={styles.bord}
          >
            <span className={styles.motBord}>Suivante</span>
            <span aria-hidden="true">›</span>
          </Lien>
        </li>
      </ul>
    </nav>
  )
}

/**
 * « Précédente » et « Suivante » aux extrémités.
 *
 * Aux bords, l'entrée devient un `<span>` et **sort de l'ordre de tabulation**
 * plutôt que de rester un lien inerte. Un lien qu'on atteint et qui ne fait
 * rien est une impasse ; `aria-disabled` sur un `<a>` l'annoncerait comme
 * désactivé tout en restant focalisable, ce qui est le pire des deux.
 */
function Lien({
  page,
  desactive,
  hrefOf,
  onNavigate,
  className,
  children,
}: {
  page: number
  desactive: boolean
  hrefOf: (page: number) => string
  onNavigate: (page: number, parClavier: boolean) => void
  className: string
  children: React.ReactNode
}) {
  if (desactive) {
    return (
      <span className={`${className} ${styles.inerte}`} aria-hidden="true">
        {children}
      </span>
    )
  }

  return (
    <a
      href={hrefOf(page)}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onNavigate(page, false)
      }}
    >
      {children}
    </a>
  )
}
