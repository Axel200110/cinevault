"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';
import { useToast } from '@/components/Toast/Toast';

interface Props {
  tmdbId: string;
  type: string;
}

export default function WatchlistButton({ tmdbId, type }: Props) {
  const [user, setUser] = useState<any>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setUser(session.user);

      const { data } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('movie_id', tmdbId)
        .single();
        
      if (data) setInWatchlist(true);
      setLoading(false);
    };
    checkStatus();
  }, [tmdbId]);

  const { showToast } = useToast();

  const toggleWatchlist = async () => {
    if (!user) {
      showToast('Authentication Required', 'Please log in to manage your watchlist.', 'info');
      return;
    }

    setLoading(true);
    if (inWatchlist) {
      await supabase
        .from('watchlists')
        .delete()
        .eq('user_id', user.id)
        .eq('movie_id', tmdbId);
      setInWatchlist(false);
      showToast('Removed from Watchlist', 'Title has been removed from your collection.', 'info');
    } else {
      await supabase
        .from('watchlists')
        .insert([{ user_id: user.id, movie_id: tmdbId, type }]);
      setInWatchlist(true);
      showToast('Added to Watchlist', 'Title has been saved to your collection.', 'success');
    }
    setLoading(false);
  };

  // Always show button, toggleWatchlist handles login check

  return (
    <button 
      onClick={toggleWatchlist}
      disabled={loading}
      className={`${styles.watchlistBtn} ${inWatchlist ? styles.inWatchlist : ''}`}
    >
      <div className={styles.itemIcon}>
        {inWatchlist ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        )}
      </div>
      {loading ? '...' : inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
    </button>
  );
}
