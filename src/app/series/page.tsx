import Navbar from "@/components/Navbar/Navbar";
import MovieGrid from "@/components/MovieGrid/MovieGrid";
import { supabase } from "@/lib/supabase";
import { getMovieDetails, MovieDetails } from "@/lib/tmdb";
import styles from "../page.module.css";

export default async function SeriesPage() {
  // Fetch TV series from Supabase
  const { data: seriesSources, error } = await supabase
    .from('movies')
    .select('*')
    .eq('type', 'tv')
    .order('created_at', { ascending: false });

  if (error) console.error('Error fetching series:', error);
  
  const seriesPromises = (seriesSources || []).map(source => 
    getMovieDetails(source.tmdb_id, source.terabox_link, 'tv')
  );
  
  const allSeriesDetails = await Promise.all(seriesPromises);
  const series = allSeriesDetails.filter((m): m is MovieDetails => m !== null);

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className={`${styles.pageContent} ${styles.revealContent}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>TV Series</h2>
          <div className={styles.divider}></div>
        </div>
        
        {series.length > 0 ? (
          <MovieGrid movies={series} />
        ) : (
          <div style={{ padding: '5%', color: 'var(--foreground-muted)' }}>
            <p>No series available yet. Add some in your Supabase dashboard!</p>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <p>&copy; 2024 CineVault. Powered by Supabase & TMDb.</p>
      </footer>
    </main>
  );
}
