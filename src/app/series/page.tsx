import React from 'react';
import Navbar from '@/components/Navbar/Navbar';
import MovieGrid from '@/components/MovieGrid/MovieGrid';
import Pagination from '@/components/Pagination/Pagination';
import { supabase } from '@/lib/supabase';
import { getMovieDetails, MovieDetails } from '@/lib/tmdb';
import styles from "../page.module.css";

const ITEMS_PER_PAGE = 20;

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.page || '1');
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Fetch TV series from Supabase
  const { data: seriesSources, count, error } = await supabase
    .from('movies')
    .select('*', { count: 'exact' })
    .eq('type', 'tv')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) console.error('Error fetching series:', error);
  
  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

  const seriesPromises = (seriesSources || []).map(source => 
    getMovieDetails(source.tmdb_id, source.terabox_link, 'tv')
  );
  
  const allSeriesDetails = await Promise.all(seriesPromises);
  const series = allSeriesDetails.filter((m): m is MovieDetails => m !== null);

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className={`${styles.pageContent} ${styles.revealContent} ${styles.standalonePage}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>TV Series</h2>
          <div className={styles.divider}></div>
        </div>
        
        {series.length > 0 ? (
          <>
            <MovieGrid movies={series} />
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              baseUrl="/series" 
            />
          </>
        ) : (
          <div style={{ padding: '5%', color: 'var(--foreground-muted)' }}>
            <p>No series available yet. Add some in your Supabase dashboard!</p>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} CineVault. Powered by Supabase & TMDb.</p>
      </footer>
    </main>
  );
}
