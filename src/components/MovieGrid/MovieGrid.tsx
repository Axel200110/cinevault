import React from 'react';
import styles from './MovieGrid.module.css';
import MovieCard from '../MovieCard/MovieCard';
import { MovieDetails } from '@/lib/tmdb';

interface Props {
  movies: MovieDetails[];
}

const MovieGrid = ({ movies }: Props) => {
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {movies.map((movie, index) => (
          <MovieCard key={`${movie.id}-${index}`} movie={movie} />
        ))}
      </div>
    </div>
  );
};

export default MovieGrid;
