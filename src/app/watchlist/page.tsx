"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar/Navbar';
import MovieGrid from '@/components/MovieGrid/MovieGrid';
import { fetchTitlesForAnalytics } from '@/app/actions';
import styles from './watchlist.module.css';

export default function WatchlistPage() {
  const [user, setUser] = useState<any>(null);
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadWatchlist = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }
      setUser(session.user);

      const { data, error } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        // Map data to look like what fetchTitlesForAnalytics expects
        const mappedData = data.map(item => ({
          id: item.movie_id,
          tmdb_id: item.movie_id,
          type: item.type,
          clicks: 0
        }));
        
        const enriched = await fetchTitlesForAnalytics(mappedData);
        // Map it to look like what MovieGrid expects
        const gridData = enriched.map(item => ({
          id: item.tmdb_id,
          title: item.title,
          posterUrl: item.posterUrl || '',
          rating: item.rating || 0,
          year: item.year || '',
          type: item.type
        }));
        setMovies(gridData);
      }
      setLoading(false);
    };

    loadWatchlist();
  }, [router]);

  if (loading) {
    return (
      <main className={styles.main}>
        <Navbar />
        <div className={styles.container}>
          <h2>Loading your watchlist...</h2>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Watchlist</h1>
          <div className={styles.divider}></div>
        </div>
        
        {movies.length > 0 ? (
          <MovieGrid movies={movies} />
        ) : (
          <div className={styles.emptyState}>
            <p>Your watchlist is empty.</p>
            <button onClick={() => router.push('/')} className={styles.browseBtn}>Browse Movies</button>
          </div>
        )}
      </div>
    </main>
  );
}
