import React from 'react';
import styles from './MovieGrid.module.css';
import MovieCard from '../MovieCard/MovieCard';
import { MovieDetails } from '@/lib/tmdb';

interface Props {
  movies: MovieDetails[];
  onRemove?: (id: string) => void;
}

const MovieGrid = ({ movies, onRemove }: Props) => {
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {movies.map((movie, index) => (
          <MovieCard 
            key={`${movie.id}-${index}`} 
            movie={movie} 
            onRemove={onRemove ? () => onRemove(movie.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default MovieGrid;
