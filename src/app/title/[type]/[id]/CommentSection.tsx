"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface Comment {
  id: string;
  content: string;
  rating: number | null;
  created_at: string;
  user_email?: string;
}

interface Props {
  tmdbId: string;
}

export default function CommentSection({ tmdbId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    fetchComments();

    // Listen for new comments
    const channel = supabase
      .channel('public:comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `movie_id=eq.${tmdbId}` }, payload => {
        fetchComments();
      })
      .subscribe();

    return () => { 
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [tmdbId]);

  const fetchComments = async () => {
    try {
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('*')
        .eq('movie_id', String(tmdbId))
        .order('created_at', { ascending: false });

      if (commentError) throw commentError;
      if (!commentData) return;

      // Fetch profiles for these users
      const userIds = [...new Set(commentData.map(c => c.user_id))];
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profileError) throw profileError;

      // Map profiles to comments
      const profilesMap = (profileData || []).reduce((acc: any, p) => {
        acc[p.id] = p;
        return acc;
      }, {});

      const mergedComments = commentData.map(c => ({
        ...c,
        profiles: profilesMap[c.user_id] || null
      }));

      setComments(mergedComments);
    } catch (error) {
      console.error("Error fetching comments/profiles:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    
    setLoading(true);

    // Ensure profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      await supabase.from('profiles').insert([
        { id: user.id, username: user.email?.split('@')[0] || 'Member' }
      ]);
    }

    const { error } = await supabase.from('comments').insert([
      { movie_id: tmdbId, user_id: user.id, content: newComment, rating: rating > 0 ? rating : null }
    ]);
    
    if (error) {
      console.error("Comment submission error:", error);
      alert("Failed to post review. Please try again.");
    } else {
      setNewComment('');
      setRating(0);
      fetchComments();
    }
    
    setLoading(false);
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Community Reviews</h2>
      <div className={styles.divider}></div>
      
      <div className={styles.commentContainer}>
        {user ? (
          <form onSubmit={handleSubmit} className={styles.commentForm}>
            <div className={styles.ratingSelect}>
              <span>Your Rating: </span>
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  type="button" 
                  key={star} 
                  onClick={() => setRating(star)}
                  className={rating >= star ? styles.starActive : styles.starInactive}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea 
              value={newComment} 
              onChange={e => setNewComment(e.target.value)}
              placeholder="What did you think about this?"
              className={styles.commentInput}
              rows={3}
              required
            />
            <button type="submit" className={styles.commentSubmitBtn} disabled={loading || !newComment.trim()}>
              {loading ? 'Posting...' : 'Post Review'}
            </button>
          </form>
        ) : (
          <div className={styles.loginPrompt}>
            <p>Please log in to leave a review.</p>
            <a href="/auth" className={styles.promptLoginBtn}>Log In</a>
          </div>
        )}

        <div className={styles.commentList}>
          {comments.length > 0 ? comments.map(comment => (
            <div key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <div className={styles.commentAvatar}>
                  {(comment as any).profiles?.avatar_url && (comment as any).profiles.avatar_url.includes('://') ? (
                    <img src={(comment as any).profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    (comment as any).profiles?.avatar_url || (comment as any).profiles?.username?.[0]?.toUpperCase() || '🎬'
                  )}
                </div>
                <div>
                  <div className={styles.commentMeta}>
                    <span className={styles.commentAuthor}>
                      {(comment as any).profiles?.username || 'Member'}
                    </span>
                    <span className={styles.commentDate}>{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  {comment.rating && (
                    <div className={styles.commentRating}>
                      {'★'.repeat(comment.rating)}{'☆'.repeat(5 - comment.rating)}
                    </div>
                  )}
                </div>
              </div>
              <p className={styles.commentContent}>{comment.content}</p>
            </div>
          )) : (
            <p className={styles.noComments}>No reviews yet. Be the first to share your thoughts!</p>
          )}
        </div>
      </div>
    </section>
  );
}
