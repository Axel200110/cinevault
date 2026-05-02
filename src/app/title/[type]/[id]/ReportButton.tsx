"use client";

import React, { useState } from 'react';
import { reportBrokenLink } from '@/app/actions';
import styles from './page.module.css';
import { useToast } from '@/components/Toast/Toast';
import { supabase } from '@/lib/supabase';

interface Props {
  tmdbId: string;
}

export default function ReportButton({ tmdbId }: Props) {
  const [reported, setReported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { showToast } = useToast();

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleReport = async () => {
    if (reported) return;
    setLoading(true);
    const { success } = await reportBrokenLink(tmdbId, user?.id);
    if (success) {
      setReported(true);
      showToast('Report Sent', 'Administrators have been notified.', 'success');
    } else {
      showToast('Report Failed', 'Please try again later.', 'error');
    }
    setLoading(false);
  };

  return (
    <button 
      onClick={handleReport}
      disabled={reported || loading}
      className={`${styles.reportBtn} ${reported ? styles.reportedState : ''}`}
      title="Click here if the download link is broken or file is missing"
    >
      <div className={styles.itemIcon}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      {loading ? 'Reporting...' : reported ? 'Reported' : 'Report Broken'}
    </button>
  );
}
