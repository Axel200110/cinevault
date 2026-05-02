import React from 'react';
import Navbar from '@/components/Navbar/Navbar';
import BrowseClient from './BrowseClient';
import { supabase } from '@/lib/supabase';
import { getMovieDetails, MovieDetails } from '@/lib/tmdb';
import styles from './browse.module.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Library | CineVault',
  description: 'Filter and browse our extensive library of movies and TV shows.',
};

export default async function BrowsePage() {
  const { data: sources, error } = await supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Browse Supabase Error:", error);
  }

  // Fetch full details
  const promises = (sources || []).map(s => getMovieDetails(s.tmdb_id, s.type as 'movie' | 'tv'));
  const allDetails = await Promise.all(promises);
  const validDetails = allDetails.filter((m): m is MovieDetails => m !== null);

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Browse the Vault</h1>
          <p className={styles.heroSubtitle}>Discover your next favorite movie or series.</p>
        </div>
      </div>
      <BrowseClient initialMovies={validDetails} />
    </main>
  );
}
