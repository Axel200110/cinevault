"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar/Navbar';
import MovieGrid from '@/components/MovieGrid/MovieGrid';
import { fetchTitlesForAnalytics, removeFromWatchlist } from '@/app/actions';
import styles from './watchlist.module.css';
import Modal from '@/components/Modal/Modal';

export default function WatchlistPage() {
  const [user, setUser] = useState<any>(null);
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Modal State
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemTitle?: string;
    posterUrl?: string;
    type: 'confirm' | 'danger';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    itemTitle: '',
    posterUrl: '',
    type: 'confirm',
    onConfirm: () => {},
  });

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

  const handleRemove = async (movieId: string) => {
    if (!user) return;
    const movie = movies.find(m => m.id === movieId);
    setModal({
      isOpen: true,
      title: 'Remove from Watchlist',
      message: 'Are you sure you want to remove this title?',
      itemTitle: movie?.title,
      posterUrl: movie?.posterUrl,
      type: 'danger',
      onConfirm: async () => {
        const result = await removeFromWatchlist(user.id, movieId);
        if (result.success) {
          setMovies(prev => prev.filter(m => m.id !== movieId));
        }
      }
    });
  };

  const handleClearAll = async () => {
    if (!user) return;
    setModal({
      isOpen: true,
      title: 'Clear Entire Watchlist',
      message: 'This will remove ALL movies from your watchlist. This action cannot be undone. Are you sure?',
      type: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('watchlists').delete().eq('user_id', user.id);
        if (!error) {
          setMovies([]);
        }
      }
    });
  };

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
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>My Watchlist</h1>
            <div className={styles.divider}></div>
          </div>
          {movies.length > 0 && (
            <button onClick={handleClearAll} className={styles.clearBtn}>Clear All</button>
          )}
        </div>
        
        {movies.length > 0 ? (
          <MovieGrid movies={movies} onRemove={handleRemove} />
        ) : (
          <div className={styles.emptyState}>
            <p>Your watchlist is empty.</p>
            <button onClick={() => router.push('/')} className={styles.browseBtn}>Browse Movies</button>
          </div>
        )}
      </div>

      <Modal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        itemTitle={modal.itemTitle}
        posterUrl={modal.posterUrl}
        type={modal.type}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modal.onConfirm}
      />
    </main>
  );
}
