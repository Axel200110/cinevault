import React from 'react';
import Navbar from '@/components/Navbar/Navbar';
import MovieGrid from '@/components/MovieGrid/MovieGrid';
import Pagination from '@/components/Pagination/Pagination';
import { supabase } from '@/lib/supabase';
import { getMovieDetails, MovieDetails } from '@/lib/tmdb';
import styles from '../movies/page.module.css'; // Reuse styles from movies page
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Most Popular | CineVault',
  description: 'Discover the most popular movies and shows trending right now.',
};

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 20;

export default async function PopularPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const currentPage = parseInt(searchParams.page || '1');
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const { data: sources, count, error } = await supabase
    .from('movies')
    .select('*', { count: 'exact' })
    .order('clicks', { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Supabase Error:", error);
  }

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

  // Fetch full details
  const promises = (sources || []).map(s => getMovieDetails(s.tmdb_id, s.type as 'movie' | 'tv'));
  const allDetails = await Promise.all(promises);
  const validDetails = allDetails.filter((m): m is MovieDetails => m !== null);

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Most Popular</h1>
          <p className={styles.heroSubtitle}>The hottest titles everyone is watching right now.</p>
        </div>
      </div>
      <section className={styles.content}>
        <MovieGrid movies={validDetails} />
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          baseUrl="/popular" 
        />
      </section>
    </main>
  );
}
