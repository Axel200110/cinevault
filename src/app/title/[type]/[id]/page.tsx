import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { getExtendedMovieDetails } from '@/lib/tmdb';
import Navbar from '@/components/Navbar/Navbar';
import MovieGrid from '@/components/MovieGrid/MovieGrid';
import DownloadButton from './DownloadButton';
import ReportButton from './ReportButton';
import WatchlistButton from './WatchlistButton';
import CommentSection from './CommentSection';
import EpisodePicker from './EpisodePicker';
import PlayButton from './PlayButton';
import styles from './page.module.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { type, id } = resolvedParams;
  
  const movie = await getExtendedMovieDetails(id, type as 'movie' | 'tv');
  if (!movie) return { title: 'Not Found | CineVault' };
  
  return {
    title: `${movie.title} | CineVault`,
    description: movie.description,
    openGraph: {
      title: `${movie.title} | CineVault`,
      description: movie.description,
      images: [movie.backdropUrl || movie.posterUrl],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: movie.title,
      description: movie.description,
      images: [movie.backdropUrl || movie.posterUrl],
    }
  };
}

export default async function TitlePage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const resolvedParams = await params;
  const { type, id } = resolvedParams;

  // Ensure type is valid
  if (type !== 'movie' && type !== 'tv') {
    return <div className={styles.error}>Invalid content type</div>;
  }

  // 1. Check if it's in our vault to get the terabox link
  const { data: dbItem } = await supabase
    .from('movies')
    .select('*')
    .eq('tmdb_id', id)
    .eq('type', type)
    .single();

  const teraboxLink = dbItem ? dbItem.terabox_link : '#';
  const isInVault = !!dbItem;

  // 2. Fetch extended TMDb details
  const movie = await getExtendedMovieDetails(id, type, teraboxLink);

  if (movie) {
    console.log(`[Trailer Debug] Title: ${movie.title}, ID: ${id}, Key: ${movie.trailerKey}`);
  }

  if (!movie) {
    return (
      <main className={styles.main}>
        <Navbar />
        <div className={styles.error}>
          <h2>Content Not Found</h2>
          <p>We couldn't retrieve information for this title.</p>
        </div>
      </main>
    );
  }

  const backdropStyle = movie.backdropUrl 
    ? { backgroundImage: `url(${movie.backdropUrl})` }
    : { background: 'var(--background)' };

  return (
    <main className={styles.main}>
      <Navbar />
      
      {/* Hero Section */}
      <section className={styles.hero} style={backdropStyle}>
        <div className={styles.heroOverlay}></div>
        
        <div className={styles.heroContent}>
          <div className={styles.heroMain}>
            <div className={styles.posterWrapper}>
              <img src={movie.posterUrl || undefined} alt={movie.title} className={styles.heroPoster} />
            </div>
            
            <div className={styles.heroInfo}>
              <div className={styles.heroHeader}>
                <h1>{movie.title}</h1>
                <span className={styles.heroYear}>{movie.year}</span>
              </div>
              
              <div className={styles.heroMeta}>
                <div className={styles.ratingBadge}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
                  </svg>
                  {movie.rating}
                </div>
                <div className={styles.metaDivider}></div>
                <div className={styles.heroGenres}>
                  {movie.genre.map(g => (
                    <span key={g} className={styles.genreTag}>{g}</span>
                  ))}
                </div>
              </div>

              <p className={styles.heroDescription}>{movie.description}</p>

              <div className={styles.heroActions}>
                {isInVault ? (
                  type === 'tv' ? (
                    <EpisodePicker episodesJson={movie.teraboxLink} tmdbId={id} />
                  ) : (
                    <PlayButton teraboxLink={movie.teraboxLink} tmdbId={id} />
                  )
                ) : (
                  <div className={styles.notInVaultBtn}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Not in Vault
                  </div>
                )}
                <div className={styles.secondaryActions}>
                  <WatchlistButton tmdbId={movie.id} type={type} />
                  <ReportButton tmdbId={movie.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* Content Section */}
        <div className={styles.content}>
          {/* Trailer Section */}
          {movie.trailerKey && (
            <section className={`${styles.section} ${styles.reveal}`} style={{ animationDelay: '0.2s' }}>
              <h2 className={styles.sectionTitle}>Official Trailer</h2>
              <div className={styles.divider}></div>
              <div className={styles.trailerContainer}>
                <iframe
                  src={`https://www.youtube.com/embed/${movie.trailerKey}`}
                  title="Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={styles.trailerIframe}
                ></iframe>
              </div>
            </section>
          )}

          {/* Cast Section */}
          <section className={`${styles.section} ${styles.reveal}`} style={{ animationDelay: '0.4s' }}>
            <h2 className={styles.sectionTitle}>Cast</h2>
            <div className={styles.castGrid}>
              {movie.cast.map(actor => (
                <div key={actor.id} className={styles.castCard}>
                  <div className={styles.castImgWrapper}>
                    <img src={actor.profileUrl || undefined} alt={actor.name} className={styles.castImg} />
                  </div>
                  <p className={styles.castName}>{actor.name}</p>
                  <p className={styles.castRole}>{actor.character}</p>
                </div>
              ))}
            </div>
          </section>



          {/* Similar Recommendations */}
          {movie.similar && movie.similar.length > 0 && (
            <section className={styles.section} style={{ animationDelay: '0.6s' }}>
              <h2 className={styles.sectionTitle}>You Might Also Like</h2>
              <div className={styles.divider}></div>
              <MovieGrid movies={movie.similar} />
            </section>
          )}

          {/* Comment Section */}
          <div style={{ animationDelay: '0.8s' }} className={styles.section}>
            <CommentSection tmdbId={movie.id} />
          </div>
        </div>
      </main>
    );
}
