import React from 'react';
import Link from 'next/link';
import styles from './MovieCard.module.css';
import { MovieDetails } from '@/lib/tmdb';

interface Props {
  movie: MovieDetails;
  onRemove?: () => void;
}

const MovieCard = ({ movie, onRemove }: Props) => {
  return (
    <div className={styles.card}>
      <div className={styles.posterContainer}>
        <img src={movie.posterUrl || undefined} alt={movie.title} className={styles.poster} />
        
        <div className={styles.overlay}>
          <p className={styles.genre}>{movie.genre?.join(', ') || 'Genre'}</p>
          <Link 
            href={`/title/${movie.type}/${movie.id}`}
            className={styles.downloadBtn}
          >
            View Details
          </Link>
          {onRemove && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className={styles.removeBtn}
              title="Remove from Watchlist"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.info}>
        <h3 className={styles.title}>{movie.title}</h3>
        <div className={styles.meta}>
          <span>{movie.year}</span>
          <div className={styles.rating}>
            <span>★</span> {movie.rating}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
