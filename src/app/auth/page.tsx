"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar/Navbar';
import { useToast } from '@/components/Toast/Toast';
import styles from './auth.module.css';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        const username = data.user?.user_metadata?.username || data.user?.email?.split('@')[0] || 'User';
        showToast('Login Successful', `Welcome back, ${username}! Redirecting to vault...`, 'success');
        
        // Short delay to let toast show
        setTimeout(() => router.push('/'), 1500);
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              username: email.split('@')[0], // Default username
            }
          }
        });
        if (error) throw error;
        showToast('Account Created', 'Registration successful! You can now sign in.', 'success');
        setIsLogin(true);
      }
    } catch (err: any) {
      showToast('Authentication Error', err.message || 'An error occurred.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.title}>{isLogin ? 'Welcome Back' : 'Join CineVault'}</h1>
          <p className={styles.subtitle}>
            {isLogin 
              ? 'Sign in to access your watchlist and leave reviews.' 
              : 'Create an account to save movies and interact with the community.'}
          </p>

          <form onSubmit={handleAuth} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="you@example.com"
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <p className={styles.toggleText}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              className={styles.toggleBtn} 
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
