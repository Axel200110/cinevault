import React from 'react';
import Navbar from '@/components/Navbar/Navbar';
import MovieCard from '@/components/MovieCard/MovieCard';
import { supabase } from '@/lib/supabase';
import { getMovieDetails, MovieDetails } from '@/lib/tmdb';
import styles from '../page.module.css';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';
  
  let results: MovieDetails[] = [];
  let loading = false;

  if (query) {
    // 1. Get all items from Supabase
    const { data: dbItems } = await supabase.from('movies').select('*');
    
    if (dbItems) {
      // 2. Fetch TMDb details for all in parallel
      const detailedItems = await Promise.all(
        dbItems.map(async (item) => {
          const details = await getMovieDetails(item.tmdb_id, item.terabox_link, item.type as 'movie' | 'tv');
          return details;
        })
      );

      // 3. Filter based on query
      results = detailedItems.filter((item): item is MovieDetails => 
        item !== null && (
          (item.title || '').toLowerCase().includes(query.toLowerCase()) ||
          (item.description || '').toLowerCase().includes(query.toLowerCase())
        )
      );
    }
  }

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={`${styles.pageContent} ${styles.revealContent}`} style={{ paddingTop: '120px' }}>
        <div className={styles.sectionHeader}>
          <h1 className={styles.sectionTitle}>
            Results for "{query}"
          </h1>
          <div className={styles.divider}></div>
        </div>

        {results.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(130px, 20vw, 200px), 1fr))', 
            gap: 'clamp(15px, 3vw, 30px)', 
            padding: '0 5%' 
          }}>
            {results.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div style={{ padding: '0 5%', color: 'var(--foreground-muted)' }}>
            {query ? 'No movies or series found matching your search.' : 'Enter a search term to find movies and series.'}
          </div>
        )}
      </div>
    </main>
  );
}
