import React from 'react';
import Navbar from '@/components/Navbar/Navbar';
import MovieGrid from '@/components/MovieGrid/MovieGrid';
import Pagination from '@/components/Pagination/Pagination';
import { supabase } from '@/lib/supabase';
import { getMovieDetails, MovieDetails } from '@/lib/tmdb';
import styles from './page.module.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Movies | CineVault',
  description: 'Browse all movies available in the CineVault library.',
};

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 20;

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const currentPage = parseInt(searchParams.page || '1');
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Fetch count and paginated data
  const { data: sources, count, error } = await supabase
    .from('movies')
    .select('*', { count: 'exact' })
    .eq('type', 'movie')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Supabase Error:", error);
  }

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

  // Fetch details only for the paginated items
  const promises = (sources || []).map(s => getMovieDetails(s.tmdb_id, 'movie'));
  const allDetails = await Promise.all(promises);
  const validDetails = allDetails.filter((m): m is MovieDetails => m !== null);

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>All Movies</h1>
          <p className={styles.heroSubtitle}>Explore our entire collection of cinematic blockbusters.</p>
        </div>
      </div>
      <section className={styles.content}>
        <MovieGrid movies={validDetails} />
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          baseUrl="/movies" 
        />
      </section>
    </main>
  );
}
