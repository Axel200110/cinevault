"use client";

import React, { useState, useEffect } from 'react';
import styles from './admin.module.css';
import { supabase } from '@/lib/supabase';
import { searchMultiAction, fetchTvDetails } from '@/app/actions';

interface MoviePreview {
  id: string;
  title: string;
  posterUrl: string;
  year: string;
  type: string;
}

interface Episode {
  s: string;
  e: string;
  link: string;
}

interface ProductionWizardProps {
  onSuccess: () => void;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export default function ProductionWizard({ onSuccess, showToast }: ProductionWizardProps) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MoviePreview[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MoviePreview | null>(null);
  
  const [contentType, setContentType] = useState<'movie' | 'tv'>('movie');
  const [tmdbId, setTmdbId] = useState('');
  const [teraboxLink, setTeraboxLink] = useState('');
  const [tvEpisodes, setTvEpisodes] = useState<Episode[]>([{ s: '1', e: '1', link: '' }]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [populateSeason, setPopulateSeason] = useState(1);

  // Search logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        try {
          const data = await searchMultiAction(searchQuery);
          
          if (!data.results) {
            setSearchResults([]);
            return;
          }

          const results = data.results
            .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
            .map((item: any) => ({
              id: item.id.toString(),
              title: item.title || item.name,
              posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
              year: (item.release_date || item.first_air_date || '').split('-')[0],
              type: item.media_type
            }));
          setSearchResults(results);
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectMovie = (movie: MoviePreview) => {
    setSelectedMovie(movie);
    setTmdbId(movie.id);
    setContentType(movie.type as 'movie' | 'tv');
    setStep(2);
  };

  const handleAutoPopulate = async () => {
    if (!tmdbId) return;
    setIsAutoPopulating(true);
    try {
      const data = await fetchTvDetails(tmdbId, populateSeason);
      if (data && data.requestedEpisodes && data.requestedEpisodes.length > 0) {
        setTvEpisodes(prev => {
          // If the list is empty or only has the placeholder, replace it.
          // Otherwise, append the new season episodes.
          if (prev.length === 1 && prev[0].e === '1' && !prev[0].link) {
            return data.requestedEpisodes;
          }
          return [...prev, ...data.requestedEpisodes];
        });
        showToast('Mission Intelligence', `Detected ${data.episodesCount} episodes. Added Season ${populateSeason} to production.`, 'success');
      } else {
        showToast('Intel Failed', `Could not fetch data for Season ${populateSeason}.`, 'error');
      }
    } catch (error) {
      showToast('API Error', 'Failed to connect to TMDB intelligence.', 'error');
    } finally {
      setIsAutoPopulating(false);
    }
  };

  const addEpisodeRow = () => {
    const lastEp = tvEpisodes[tvEpisodes.length - 1] || { s: '1', e: '0' };
    setTvEpisodes([...tvEpisodes, { s: lastEp.s, e: (parseInt(lastEp.e) + 1).toString(), link: '' }]);
  };

  const updateEpisode = (index: number, field: keyof Episode, value: string) => {
    const newEps = [...tvEpisodes];
    newEps[index][field] = value;
    setTvEpisodes(newEps);
  };

  const handleFinalize = async () => {
    setIsUploading(true);
    let finalLink = teraboxLink;
    
    if (contentType === 'tv') {
      if (tvEpisodes.every(ep => !ep.link)) {
        showToast('Missing Links', 'Please provide at least one episode link.', 'error');
        setIsUploading(false);
        return;
      }
      finalLink = JSON.stringify(tvEpisodes.filter(ep => ep.link));
    }

    const { error } = await supabase.from('movies').insert([{ 
      tmdb_id: tmdbId, 
      terabox_link: finalLink, 
      type: contentType 
    }]);

    if (error) {
      showToast('Production Failed', error.message, 'error');
    } else {
      showToast('Mission Accomplished', `${selectedMovie?.title} is now live!`, 'success');
      resetWizard();
      onSuccess();
    }
    setIsUploading(false);
  };

  const resetWizard = () => {
    setStep(1);
    setSearchQuery('');
    setSelectedMovie(null);
    setTeraboxLink('');
    setTvEpisodes([{ s: '1', e: '1', link: '' }]);
  };

  return (
    <div className={styles.wizardContainer}>
      {/* Progress Bar */}
      <div className={styles.wizardProgress}>
        <div className={`${styles.progressStep} ${step >= 1 ? styles.active : ''}`}>
          <span className={styles.stepNum}>1</span>
          <span className={styles.stepLabel}>Identify</span>
        </div>
        <div className={styles.progressLine}><div className={styles.lineFill} style={{ width: step > 1 ? '100%' : '0%' }} /></div>
        <div className={`${styles.progressStep} ${step >= 2 ? styles.active : ''}`}>
          <span className={styles.stepNum}>2</span>
          <span className={styles.stepLabel}>Setup</span>
        </div>
        <div className={styles.progressLine}><div className={styles.lineFill} style={{ width: step > 2 ? '100%' : '0%' }} /></div>
        <div className={`${styles.progressStep} ${step >= 3 ? styles.active : ''}`}>
          <span className={styles.stepNum}>3</span>
          <span className={styles.stepLabel}>Release</span>
        </div>
      </div>

      <div className={styles.wizardContent}>
        {/* STEP 1: IDENTIFY */}
        {step === 1 && (
          <div className={styles.stepIdentify}>
            <h2 className={styles.wizardTitle}>What are we releasing today?</h2>
            <div className={styles.searchBigWrapper}>
              <input 
                type="text" 
                className={styles.searchBig} 
                placeholder="Search by title (e.g. Inception)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {isSearching && <div className={styles.searchSpinner}>Searching TMDB...</div>}
            </div>

            <div className={styles.wizardSearchResults}>
              {searchResults.map((movie) => (
                <div key={movie.id} className={styles.wizardResultItem} onClick={() => handleSelectMovie(movie)}>
                  {movie.posterUrl ? (
                    <img src={movie.posterUrl} alt={movie.title} className={styles.wizardTinyPoster} />
                  ) : (
                    <div className={styles.wizardTinyPosterPlaceholder}>🎬</div>
                  )}
                  <div className={styles.wizardResultInfo}>
                    <p className={styles.wizardResultTitle}>{movie.title}</p>
                    <p className={styles.wizardResultMeta}>{movie.type.toUpperCase()} • {movie.year}</p>
                  </div>
                  <div className={styles.selectArrow}>→</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: SETUP */}
        {step === 2 && selectedMovie && (
          <div className={styles.stepSetup}>
            <div className={styles.setupHeader}>
              <button className={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
              <h2 className={styles.wizardTitle}>Production Setup</h2>
            </div>
            
            <div className={styles.setupGrid}>
              <div className={styles.setupPosterArea}>
                {selectedMovie.posterUrl ? (
                  <img src={selectedMovie.posterUrl} alt="Poster" className={styles.setupPoster} />
                ) : (
                  <div className={styles.setupPosterPlaceholder}>No Poster Available</div>
                )}
                <div className={styles.setupInfo}>
                  <h3>{selectedMovie.title}</h3>
                  <p>{selectedMovie.year} • {selectedMovie.type.toUpperCase()}</p>
                </div>
              </div>

              <div className={styles.setupOptions}>
                <div className={styles.optionGroup}>
                  <label className={styles.label}>Content Classification</label>
                  <div className={styles.typeToggle}>
                    <button 
                      className={`${styles.toggleBtn} ${contentType === 'movie' ? styles.active : ''}`}
                      onClick={() => setContentType('movie')}
                    >
                      Feature Film
                    </button>
                    <button 
                      className={`${styles.toggleBtn} ${contentType === 'tv' ? styles.active : ''}`}
                      onClick={() => setContentType('tv')}
                    >
                      TV Series
                    </button>
                  </div>
                </div>

                {contentType === 'movie' ? (
                  <div className={styles.optionGroup}>
                    <label className={styles.label}>TMDb Identifier</label>
                    <input className={styles.input} value={tmdbId} readOnly disabled />
                    <p className={styles.fieldNote}>Automatically matched. Proceed to release.</p>
                  </div>
                 ) : (
                  <div className={styles.miniEpManager}>
                     <label className={styles.label}>Episodes Intelligence</label>
                     <p className={styles.fieldNote}>Automatically fetch episode structure from TMDB.</p>
                     <div className={styles.autoPopulateGroup}>
                       <div className={styles.seasonInputGroup}>
                         <span>Season</span>
                         <input 
                           type="number" 
                           min="1" 
                           value={populateSeason} 
                           onChange={(e) => setPopulateSeason(parseInt(e.target.value) || 1)}
                           className={styles.miniInput}
                         />
                       </div>
                       <button 
                          className={styles.autoPopulateBtn} 
                          onClick={handleAutoPopulate}
                          disabled={isAutoPopulating}
                       >
                          {isAutoPopulating ? 'SCANNING...' : `POPULATE S${populateSeason}`}
                       </button>
                     </div>
                  </div>
                )}

                <button className={styles.nextBtn} onClick={() => setStep(3)}>Continue to Release →</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: RELEASE */}
        {step === 3 && selectedMovie && (
          <div className={styles.stepRelease}>
            <div className={styles.setupHeaderCentered}>
              <button className={styles.backBtnAbsolute} onClick={() => setStep(2)}>← Back</button>
              <h2 className={styles.wizardTitle}>Final Mission: Release Links</h2>
            </div>

            <div className={styles.releaseContainer}>
              {contentType === 'movie' ? (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Terabox Direct Link</label>
                  <input 
                    type="url" 
                    className={styles.searchBig} 
                    placeholder="https://terabox.com/s/..." 
                    value={teraboxLink}
                    onChange={(e) => setTeraboxLink(e.target.value)}
                    required
                    autoFocus
                  />
                  <p className={styles.fieldNote}>Paste the high-speed direct link here.</p>
                </div>
              ) : (
                <div className={styles.wizardEpisodeManager}>
                   <div className={styles.wizardEpisodeList}>
                      {tvEpisodes.map((ep, idx) => (
                        <div key={idx} className={styles.wizardEpRow}>
                          <div className={styles.epInputPair}>
                            <div className={styles.epInputSub}>
                              <span>S</span>
                              <input 
                                type="number" 
                                value={ep.s} 
                                onChange={(e) => updateEpisode(idx, 's', e.target.value)}
                              />
                            </div>
                            <div className={styles.epInputSub}>
                              <span>E</span>
                              <input 
                                type="number" 
                                value={ep.e} 
                                onChange={(e) => updateEpisode(idx, 'e', e.target.value)}
                              />
                            </div>
                          </div>
                          <input 
                            type="url" 
                            className={styles.searchBig}
                            placeholder="Episode Link..."
                            value={ep.link}
                            onChange={(e) => updateEpisode(idx, 'link', e.target.value)}
                          />
                          <button 
                            className={styles.removeEpBtnSmall} 
                            onClick={() => setTvEpisodes(tvEpisodes.filter((_, i) => i !== idx))}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                   </div>
                   <button className={styles.addEpBtn} onClick={addEpisodeRow}>+ Add Next Episode</button>
                </div>
              )}

              <button 
                className={styles.finalizeBtnCentered} 
                onClick={handleFinalize}
                disabled={isUploading}
              >
                {isUploading ? 'COMMENCING UPLOAD...' : `UPLOAD TO VAULT`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
