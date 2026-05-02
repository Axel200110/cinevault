'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './ProfileModal.module.css';
import { supabase } from '@/lib/supabase';
import { updateProfile } from '@/app/actions';

const AVATARS = ['🎬', '🎥', '🍿', '🎟️', '📽️', '🎭', '🌟', '💎', '🔥', '🕶️', '🛸', '🧟', '🕵️', '🧛'];

interface Props {
  user: any;
  onClose: () => void;
}

const ProfileModal = ({ user, onClose }: Props) => {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (user?.user_metadata) {
      setUsername(user.user_metadata.username || '');
      setAvatarUrl(user.user_metadata.avatar_url || '');
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          username, 
          avatar_url: avatarUrl 
        }
      });

      if (error) throw error;

      // Sync with profiles table
      await updateProfile(user.id, username, avatarUrl);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(onClose, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Edit Profile</h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleUpdate} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email (Permanent)</label>
            <input type="text" value={user.email} disabled className={styles.disabledInput} />
          </div>

          <div className={styles.inputGroup}>
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Select Avatar</label>
            <div className={styles.avatarGrid}>
              {AVATARS.map(emoji => (
                <button 
                  key={emoji}
                  type="button"
                  className={`${styles.avatarItem} ${avatarUrl === emoji ? styles.avatarActive : ''}`}
                  onClick={() => setAvatarUrl(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {message.text && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );

  if (!mounted) return null;

  return createPortal(
    modalContent,
    document.body
  );
};

export default ProfileModal;
