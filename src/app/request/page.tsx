"use client";

import React, { useState } from 'react';
import Navbar from '@/components/Navbar/Navbar';
import { searchMultiAction } from '@/app/actions';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast/Toast';
import styles from './request.module.css';

export default function RequestPage() {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const data = await searchMultiAction(query);
      // Filter out people and results without posters for better UI
      setResults(data.results.filter((item: any) => 
        (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path
      ));
    } catch (err) {
      showToast('Search Error', 'Failed to connect to search service.', 'error');
    }
    setLoading(false);
  };

  const handleRequest = async (item: any) => {
    setSubmitting(item.id.toString());
    
    const payload: any = {
      tmdb_id: item.id.toString(),
      title: item.title || item.name,
      type: item.media_type,
      poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      status: 'pending'
    };
    if (user?.id) payload.user_id = user.id;

    const { error } = await supabase.from('user_requests').insert([payload]);

    if (!error) {
      showToast('Request Submitted', `You've successfully requested ${item.title || item.name}. We'll try to add it soon!`, 'success');
      // Optionally remove it from the list so they don't click it again
      setResults(prev => prev.filter(r => r.id !== item.id));
    } else {
      showToast('Submission Failed', 'There was an error saving your request. Please ensure the database table exists.', 'error');
    }
    
    setSubmitting(null);
  };

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Can't Find Something?</h1>
          <p>Search our database and request movies or TV shows to be added to the vault.</p>
        </div>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input 
            type="text" 
            placeholder="Search for a title to request..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className={styles.resultsGrid}>
          {results.map((item) => (
            <div key={item.id} className={styles.resultCard}>
              <img 
                src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster'} 
                alt={item.title || item.name} 
                className={styles.poster}
              />
              <div className={styles.info}>
                <h3>{item.title || item.name}</h3>
                <p>{new Date(item.release_date || item.first_air_date || Date.now()).getFullYear()} • {item.media_type === 'movie' ? 'Movie' : 'TV Show'}</p>
                <button 
                  className={styles.requestBtn}
                  onClick={() => handleRequest(item)}
                  disabled={submitting === item.id.toString()}
                >
                  {submitting === item.id.toString() ? 'Sending...' : 'Request Title'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
