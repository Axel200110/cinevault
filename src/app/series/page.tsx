import React from 'react';
import Navbar from '@/components/Navbar/Navbar';
import MovieGrid from '@/components/MovieGrid/MovieGrid';
import Pagination from '@/components/Pagination/Pagination';
import { supabase } from '@/lib/supabase';
import { getMovieDetails, MovieDetails } from '@/lib/tmdb';
import styles from './page.module.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TV Series | CineVault',
  description: 'Browse all TV series available in the CineVault library.',
};

export const dynamic = 'force-dynamic';

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

  if (error) {
    console.error('Error fetching series:', error);
  }
  
  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

  const seriesPromises = (seriesSources || []).map(source => 
    getMovieDetails(source.tmdb_id, source.terabox_link, 'tv')
  );
  
  const allSeriesDetails = await Promise.all(seriesPromises);
  const series = allSeriesDetails.filter((m): m is MovieDetails => m !== null);

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>TV Series</h1>
          <p className={styles.heroSubtitle}>Binge-watch the most acclaimed and trending television shows.</p>
        </div>
      </div>

      <section className={styles.content}>
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
          <div style={{ padding: '5%', color: 'var(--foreground-muted)', textAlign: 'center' }}>
            <p>No series available yet. Check back later!</p>
          </div>
        )}
      </section>
    </main>
  );
}

