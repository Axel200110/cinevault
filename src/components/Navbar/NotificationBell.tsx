"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './Navbar.module.css';
import { supabase } from '@/lib/supabase';
import { fetchNotifications, markNotificationAsRead } from '@/app/actions';
import Link from 'next/link';

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      console.log('Fetching notifications for:', userId);
      const data = await fetchNotifications(userId);
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    };

    loadNotifications();

    // Real-time notifications
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadNotifications();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <div className={styles.bellContainer} ref={bellRef}>
      <button className={styles.bellBtn} onClick={() => setIsOpen(!isOpen)} title="Intelligence Reports">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && <span className={styles.bellBadge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.bellDropdown}>
          <div className={styles.bellHeader}>
            <span>Intelligence Briefing</span>
          </div>
          <div className={styles.bellList}>
            {notifications.length > 0 ? notifications.map((n) => (
              <div 
                key={n.id} 
                className={`${styles.bellItem} ${!n.is_read ? styles.bellUnread : ''}`}
                onClick={() => handleRead(n.id)}
              >
                <div className={styles.bellVisual}>
                  {n.poster_url ? (
                    <img src={n.poster_url} alt="" className={styles.bellPoster} />
                  ) : (
                    <div className={styles.bellIconFallback}>
                      {n.type === 'link_fixed' ? '✅' : '📺'}
                    </div>
                  )}
                </div>
                <div className={styles.bellContent}>
                  <div className={styles.bellItemHeader}>
                    <span className={styles.bellStatus}>{n.type === 'link_fixed' ? 'FIXED' : 'READY'}</span>
                    <span className={styles.bellTime}>{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className={styles.bellMsg}>{n.message}</p>
                  {n.link && (
                    <Link href={n.link} className={styles.bellLink} onClick={() => setIsOpen(false)}>
                      View Details →
                    </Link>
                  )}
                </div>
              </div>
            )) : (
              <div className={styles.bellEmpty}>No new intelligence reports.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
