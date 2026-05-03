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
  const [uploading, setUploading] = useState(false);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Ensure bucket exists (best effort)
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.find(b => b.name === 'avatars')) {
        await supabase.storage.createBucket('avatars', { public: true });
      }

      // 2. Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      setMessage({ type: 'success', text: 'Image uploaded! Save to apply changes.' });
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: 'Upload failed. Ensure "avatars" bucket is public.' });
    } finally {
      setUploading(false);
    }
  };

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
      
      // Force refresh components
      window.location.reload();
      setTimeout(onClose, 1000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Cinematic Header/Banner Area */}
        <div className={styles.banner}>
          <div className={styles.bannerGlow}></div>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.modalBody}>
          {/* Avatar Area - Overlapping Banner */}
          <div className={styles.profileAvatarSection}>
            <div className={styles.avatarWrapper}>
              <div className={styles.avatarCircle}>
                {avatarUrl && avatarUrl.includes('://') ? (
                  <img src={avatarUrl} alt="Avatar" className={styles.mainAvatarImg} />
                ) : (
                  <span className={styles.mainAvatarEmoji}>{avatarUrl || '👤'}</span>
                )}
                {uploading && <div className={styles.uploadProgress}>...</div>}
                
                <label className={styles.cameraBtn} title="Upload New Image">
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} hidden />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </label>
              </div>
            </div>
            
            <div className={styles.profileInfo}>
              <h2 className={styles.profileName}>{username || 'New Member'}</h2>
              <p className={styles.profileEmail}>{user.email}</p>
            </div>
          </div>

          <form onSubmit={handleUpdate} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Display Name</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className={styles.textInput}
                required
              />
            </div>

            <div className={styles.emojiSection}>
              <label className={styles.fieldLabel}>Cinematic Emojis</label>
              <div className={styles.emojiGrid}>
                {AVATARS.map(emoji => (
                  <button 
                    key={emoji}
                    type="button"
                    className={`${styles.emojiItem} ${avatarUrl === emoji ? styles.emojiActive : ''}`}
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
              {loading ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </form>
        </div>
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
