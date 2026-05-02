"use client";

import React, { useState } from 'react';
import styles from './page.module.css';
import { incrementClickCount } from '@/app/actions';

interface Episode {
  s: string;
  e: string;
  link: string;
}

interface Props {
  episodesJson: string;
  tmdbId: string;
}

export default function EpisodePicker({ episodesJson, tmdbId }: Props) {
  let episodes: Episode[] = [];
  try {
    episodes = JSON.parse(episodesJson);
  } catch (e) {
    return (
      <a 
        href={episodesJson} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={styles.playBtn}
        onClick={() => incrementClickCount(tmdbId)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"></path>
        </svg>
        Watch Now
      </a>
    );
  }

  // Get unique seasons
  const seasons = Array.from(new Set(episodes.map(ep => ep.s))).sort((a, b) => parseInt(a) - parseInt(b));
  
  const [selectedSeason, setSelectedSeason] = useState(seasons[0] || '1');
  
  const filteredEpisodes = episodes
    .filter(ep => ep.s === selectedSeason)
    .sort((a, b) => parseInt(a.e) - parseInt(b.e));

  return (
    <div className={styles.episodePickerContainer}>
      <div className={styles.pickerHeader}>
        <h3 className={styles.pickerTitle}>Select Episode</h3>
        <select 
          className={styles.seasonSelect}
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
        >
          {seasons.map(s => (
            <option key={s} value={s}>Season {s}</option>
          ))}
        </select>
      </div>

      <div className={styles.episodeGrid}>
        {filteredEpisodes.map((ep, idx) => (
          <a 
            key={idx} 
            href={ep.link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.episodeCard}
            onClick={() => incrementClickCount(tmdbId)}
          >
            <div className={styles.epNumber}>EP {ep.e}</div>
            <div className={styles.epPlayIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"></path>
              </svg>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
