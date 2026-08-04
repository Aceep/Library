import styles from './About.module.css'

/**
 * D'où viennent les données, et à qui elles doivent d'être là.
 *
 * Cette page n'est pas une politesse. **La mention de TMDB est une condition
 * d'utilisation de leur API** : « This product uses the TMDB API but is not
 * endorsed or certified by TMDB », accompagnée de leur logo. Elle vaut pour
 * tout ce qui vient de chez eux — films, séries, et les jaquettes de la
 * médiathèque entière. La retirer, c'est s'exposer à voir la clé coupée, et
 * avec elle une bonne moitié du catalogue.
 *
 * La mention exigée est en anglais et le reste : elle est reproduite mot pour
 * mot, pas traduite. Le texte français à côté explique, il ne remplace pas.
 *
 * L'attribution à JustWatch, elle, ne vit pas ici : elle doit accompagner
 * **chaque** œuvre dont on affiche les plateformes, et se trouve donc dans le
 * bloc de disponibilité, sur la fiche.
 */
export default function About() {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>À propos</p>
        <h1 className={styles.title}>D'où viennent ces fiches</h1>
        <p className={styles.lede}>
          Rien de ce que tu vois ici n'a été saisi à la main. Les titres, les résumés, les
          jaquettes, les listes d'épisodes et de tomes viennent de catalogues tenus par d'autres.
        </p>
      </header>

      <section className={styles.block}>
        <img src="/tmdb.svg" alt="The Movie Database" className={styles.tmdbLogo} />

        {/* Formulation imposée par TMDB, reproduite telle quelle et non traduite. */}
        <p className={styles.legal}>
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>

        <p className={styles.text}>
          Les films et les séries — leurs fiches, leurs saisons, leurs épisodes, leurs jaquettes —
          viennent de <a href="https://www.themoviedb.org/">The Movie Database</a>. Les plateformes
          de visionnage affichées sur une fiche viennent de{' '}
          <a href="https://www.justwatch.com/">JustWatch</a>, par leur intermédiaire, et le sont
          toujours accompagnées de leur mention.
        </p>
      </section>

      <section className={styles.block}>
        <h2 className={styles.heading}>Les autres catalogues</h2>
        <dl className={styles.sources}>
          <div className={styles.source}>
            <dt>Livres</dt>
            <dd>
              <a href="https://openlibrary.org/">Open Library</a> et{' '}
              <a href="https://books.google.com/">Google Books</a>
            </dd>
          </div>
          <div className={styles.source}>
            <dt>Mangas et BD</dt>
            <dd>
              <a href="https://anilist.co/">AniList</a>
            </dd>
          </div>
          <div className={styles.source}>
            <dt>Jeux vidéo</dt>
            <dd>
              <a href="https://www.igdb.com/">IGDB</a>
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.block}>
        <h2 className={styles.heading}>Ce qui est à nous</h2>
        <p className={styles.text}>
          Les notes, les critiques, les journaux, les vitrines, les épisodes cochés : tout ce que
          les membres écrivent reste ici et n'est renvoyé à personne. Les catalogues ci-dessus sont
          interrogés pour remplir une fiche, jamais pour raconter ce qu'on en fait.
        </p>
      </section>
    </div>
  )
}
