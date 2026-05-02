"use client";

import React from 'react';
import { incrementClickCount } from '@/app/actions';
import styles from './page.module.css';

interface Props {
  teraboxLink: string;
  tmdbId: string;
}

export default function PlayButton({ teraboxLink, tmdbId }: Props) {
  const handleClick = () => {
    incrementClickCount(tmdbId).catch(console.error);
  };

  return (
    <a 
      href={teraboxLink} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={styles.playBtn}
      onClick={handleClick}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"></path>
      </svg>
      Watch Now
    </a>
  );
}
