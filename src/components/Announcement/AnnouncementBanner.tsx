"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './AnnouncementBanner.module.css';

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'global_announcement')
          .single();

        if (data && data.value && data.value.enabled && data.value.text) {
          setAnnouncement(data.value.text);
          setIsVisible(true);
        }
      } catch (err) {
        // Silent fail if table/key doesn't exist yet
      }
    };

    fetchAnnouncement();
  }, []);

  if (!isVisible) return null;

  return (
    <div className={styles.bannerWrapper}>
      <div className={styles.banner}>
        <span className={styles.icon}>📢</span>
        <p className={styles.text}>{announcement}</p>
        <button className={styles.closeBtn} onClick={() => setIsVisible(false)}>✕</button>
      </div>
    </div>
  );
}
