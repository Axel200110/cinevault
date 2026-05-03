import Navbar from "@/components/Navbar/Navbar";
import MovieGrid from "@/components/MovieGrid/MovieGrid";
import { supabase } from "@/lib/supabase";
import { getMovieDetails, MovieDetails, getTrending, getUpcoming } from "@/lib/tmdb";
import styles from "./page.module.css";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch movie IDs and links from Supabase
  let { data: movieSources, error } = await supabase
    .from('movies')
    .select('*')
    .order('clicks', { ascending: false });

  // Fallback if 'clicks' column doesn't exist yet
  if (error) {
    console.warn('Click analytics column not found, falling back to date sort.');
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });

    movieSources = fallbackData;
    if (fallbackError) console.error('Error fetching from Supabase:', fallbackError);
  }

  // Fetch all movie details from TMDb in parallel
  const moviePromises = (movieSources || []).map(source =>
    getMovieDetails(source.tmdb_id, source.terabox_link, source.type as 'movie' | 'tv')
  );

  const allMovieDetails = await Promise.all(moviePromises);
  const allContent = allMovieDetails.filter((m): m is MovieDetails => m !== null);

  // Categorize content
  const movies = allContent.filter(c => c.type === 'movie');
  const series = allContent.filter(c => c.type === 'tv');
  const trending = await getTrending();
  const upcoming = await getUpcoming();

  // Get top rated for the lists
  const topMovies = [...movies].sort((a, b) => b.rating - a.rating).slice(0, 10);
  const topTV = [...series].sort((a, b) => b.rating - a.rating).slice(0, 10);

  // Most Popular
  const popular = allContent.slice(0, 7);
  const movieShowcase = movies.slice(0, 14);
  const tvShowcase = series.slice(0, 7);

  // Professional Static Hero Backdrop (Migration 2023)
  const heroBackdrop = "https://image.tmdb.org/t/p/original/gklkxY0veMajdCiGe6ggsh07VG2.jpg";
  const heroMovie = trending[0]; 

  return (
    <main className={styles.main}>
      <Navbar />

      {/* Cinematic Background Glows */}
      <div className={styles.globalGlow}></div>

      {/* Hero Section with Backdrop Cover */}
      <section
        className={styles.hero}
        style={{ backgroundImage: `url(${heroBackdrop})` }}
      >
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Unlimited Movies, <br />
            <span>Digital Vault.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Experience the latest blockbusters and all-time classics in stunning quality.
            All movies are enriched with TMDb data and hosted on high-speed Terabox servers.
          </p>
          <div className={styles.heroActions}>
            <a href="#library" className={styles.primaryBtn}>Explore Library</a>
            <a href="#trending" className={styles.secondaryBtn}>Trending Now</a>
          </div>
        </div>
      </section>

      <div className={styles.revealContent}>
        {/* 1. Trending Now Horizontal Section */}
        <section id="trending" className={styles.horizontalSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Trending Now</h2>
            <div className={styles.divider}></div>
          </div>
          <div className={styles.horizontalScroll}>
            {trending.map((item, index) => (
              <Link href={`/title/${item.type}/${item.id}`} key={`${item.id}-${index}`} className={styles.trendingCard}>
                <span className={styles.rankNumber}>{index + 1}</span>
                <img
                  src={item.posterUrl}
                  alt={item.title}
                  className={styles.trendingPoster}
                />
              </Link>
            ))}
          </div>
        </section>

        {/* 1.2 Coming Soon Section (Trending-Style) */}
        {upcoming.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>🗓️ Coming Soon</h2>
              <div className={styles.divider}></div>
            </div>
            
            <div className={styles.horizontalScroll}>
              {upcoming.map((item, index) => (
                <div key={`${item.id}-${index}`} className={styles.trendingCard}>
                  <div className={styles.dateBadge}>
                    {item.fullReleaseDate ? new Date(item.fullReleaseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Soon'}
                  </div>
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className={styles.trendingPoster}
                  />
                  <div className={styles.cardOverlay}>
                    <p className={styles.cardTitle}>{item.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 1.5 Most Popular (Analytics-Driven) */}
        {popular.length > 0 && (
          <section className={styles.pageContent}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderTop}>
                <h2 className={styles.sectionTitle}>🔥 Most Popular</h2>
                <Link href="/popular" className={styles.viewAllBtn}>
                  View All 
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </Link>
              </div>
              <div className={styles.divider}></div>
            </div>
            <MovieGrid movies={popular} />
          </section>
        )}

        {/* 2. All Movies Grid */}
        <section id="library" className={styles.pageContent}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderTop}>
              <h2 className={styles.sectionTitle}>All Movies</h2>
              <Link href="/movies" className={styles.viewAllBtn}>
                View All Movies
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </Link>
            </div>
            <div className={styles.divider}></div>
          </div>
          <MovieGrid movies={movieShowcase} />
        </section>

        {/* 3. TV Shows Grid */}
        <section className={styles.pageContent}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderTop}>
              <h2 className={styles.sectionTitle}>TV Shows</h2>
              <Link href="/series" className={styles.viewAllBtn}>
                View All Shows
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </Link>
            </div>
            <div className={styles.divider}></div>
          </div>
          <MovieGrid movies={tvShowcase} />
        </section>

        <section className={styles.topListsContainer}>
          <div className={styles.topList}>
            <h2 className={styles.sectionTitle}>Top Movies</h2>
            <div className={styles.divider}></div>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {topMovies.map((movie, index) => (
                <Link href={`/title/movie/${movie.id}`} key={`${movie.id}-${index}`} className={styles.topItem}>
                  <span className={styles.topRank}>{index + 1}</span>
                  <img src={movie.posterUrl} alt={movie.title} className={styles.topPoster} />
                  <div className={styles.topInfo}>
                    <p className={styles.topTitle}>{movie.title}</p>
                    <p className={styles.topRating}>⭐ {movie.rating}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.topList}>
            <h2 className={styles.sectionTitle}>Top TV Shows</h2>
            <div className={styles.divider}></div>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {topTV.map((show, index) => (
                <Link href={`/title/tv/${show.id}`} key={`${show.id}-${index}`} className={styles.topItem}>
                  <span className={styles.topRank}>{index + 1}</span>
                  <img src={show.posterUrl} alt={show.title} className={styles.topPoster} />
                  <div className={styles.topInfo}>
                    <p className={styles.topTitle}>{show.title}</p>
                    <p className={styles.topRating}>⭐ {show.rating}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <p>© {new Date().getFullYear()} CineVault Digital. All content is for demonstration purposes. TMDb API & Terabox Hosting.</p>
        </footer>
      </div>
    </main>
  );
}
