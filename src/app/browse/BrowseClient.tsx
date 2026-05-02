"use client";

import React, { useState, useMemo } from 'react';
import MovieGrid from '@/components/MovieGrid/MovieGrid';
import { MovieDetails } from '@/lib/tmdb';
import styles from './browse.module.css';

interface Props {
  initialMovies: MovieDetails[];
}

export default function BrowseClient({ initialMovies }: Props) {
  const [activeGenre, setActiveGenre] = useState<string>('All');
  const [activeType, setActiveType] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('popularity');

  // Extract all unique genres from the loaded movies
  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    initialMovies.forEach(m => m.genre?.forEach(g => genres.add(g)));
    return ['All', ...Array.from(genres).sort()];
  }, [initialMovies]);

  const filteredAndSorted = useMemo(() => {
    let result = [...initialMovies];

    if (activeType !== 'All') {
      result = result.filter(m => m.type === activeType);
    }

    if (activeGenre !== 'All') {
      result = result.filter(m => m.genre?.includes(activeGenre));
    }

    result.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'year') {
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        return yearB - yearA;
      }
      return 0; // Default order (from Supabase/TMDb popularity if any)
    });

    return result;
  }, [initialMovies, activeGenre, activeType, sortBy]);

  return (
    <div className={styles.container}>
      <div className={styles.filterSection}>
        
        <div className={styles.filterGroup}>
          <label>Type</label>
          <div className={styles.pillContainer}>
            {['All', 'movie', 'tv'].map(t => (
              <button 
                key={t}
                className={`${styles.pill} ${activeType === t ? styles.pillActive : ''}`}
                onClick={() => setActiveType(t)}
              >
                {t === 'movie' ? 'Movies' : t === 'tv' ? 'Series' : 'Everything'}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label>Sort By</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={styles.select}>
            <option value="popularity">Default / Popularity</option>
            <option value="rating">Highest Rated</option>
            <option value="year">Newest Release</option>
          </select>
        </div>

      </div>

      <div className={styles.filterGroup} style={{ marginBottom: '40px' }}>
        <label>Genres</label>
        <div className={styles.genreScroll}>
          {allGenres.map(g => (
            <button 
              key={g}
              className={`${styles.genreBtn} ${activeGenre === g ? styles.genreBtnActive : ''}`}
              onClick={() => setActiveGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.resultsHeader}>
        <h2>{filteredAndSorted.length} Results Found</h2>
        <div className={styles.divider}></div>
      </div>

      {filteredAndSorted.length > 0 ? (
        <MovieGrid movies={filteredAndSorted} />
      ) : (
        <div className={styles.emptyState}>
          <p>No content matches your selected filters.</p>
          <button onClick={() => {setActiveGenre('All'); setActiveType('All'); setSortBy('popularity');}} className={styles.clearBtn}>
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
