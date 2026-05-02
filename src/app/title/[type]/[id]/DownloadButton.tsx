"use client";

import React from 'react';
import { incrementClickCount } from '@/app/actions';
import styles from './page.module.css';

interface Props {
  teraboxLink: string;
  tmdbId: string;
}

export default function DownloadButton({ teraboxLink, tmdbId }: Props) {
  const handleClick = () => {
    incrementClickCount(tmdbId).catch(console.error);
  };

  return (
    <a 
      href={teraboxLink} 
      target="_blank" 
      rel="noopener noreferrer"
      className={styles.downloadBtn}
      onClick={handleClick}
    >
      Download via Terabox
    </a>
  );
}
