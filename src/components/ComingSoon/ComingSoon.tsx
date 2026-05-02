"use client";

import React from 'react';
import Link from 'next/link';
import { MovieDetails } from '@/lib/tmdb';
import { useToast } from '@/components/Toast/Toast';
import styles from './ComingSoon.module.css';

interface Props {
  movies: MovieDetails[];
}

export default function ComingSoon({ movies }: Props) {
  const { showToast } = useToast();

  const handleSubscribe = (e: React.MouseEvent, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    showToast('Subscribed', `We'll notify you when ${title} is available.`, 'success');
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div className={styles.horizontalScroll}>
      {movies.map((movie) => {
        // Format the date
        const dateObj = movie.fullReleaseDate ? new Date(movie.fullReleaseDate) : new Date();
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });

        return (
          <Link href={`/title/${movie.type}/${movie.id}`} key={movie.id} className={styles.comingSoonCard}>
            <div className={styles.posterWrapper}>
              <img src={movie.posterUrl} alt={movie.title} className={styles.poster} />
              <div className={styles.overlay}>
                <button 
                  className={styles.remindBtn} 
                  onClick={(e) => handleSubscribe(e, movie.title)}
                >
                  🔔 Remind Me
                </button>
              </div>
            </div>
            <div className={styles.info}>
              <h3 className={styles.title} title={movie.title}>{movie.title}</h3>
              <p className={styles.date}>{formattedDate}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
