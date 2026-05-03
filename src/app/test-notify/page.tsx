"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar/Navbar';
import { supabase } from '@/lib/supabase';
import { createNotification } from '@/app/actions';

export default function TestNotify() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const sendTestNotification = async () => {
    if (!user) {
      setMessage('Error: You must be logged in to send a notification to yourself.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      console.log('--- STARTING CLIENT-SIDE TEST ---');
      console.log('Current User ID:', user.id);
      
      // Try to insert directly from the client (Client-side test)
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'test',
          message: '🚨 CLIENT TEST: If you see this, your browser can talk to Supabase!',
          link: '/',
          poster_url: 'https://image.tmdb.org/t/p/w200/iu85Vp6NnE8F6l0ZisPj6U9Sg2v.jpg'
        }])
        .select();

      if (error) {
        console.error('Client-side insert FAILED:', error);
        throw error;
      }

      console.log('Client-side insert SUCCESS!', data);
      setMessage('Success! Check your notification bell 🔔 (Check console for logs)');
    } catch (error: any) {
      console.error('Test Error:', error);
      setMessage(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white' }}>
      <Navbar />
      
      <div style={{ 
        padding: '120px 20px', 
        maxWidth: '600px', 
        margin: '0 auto', 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '30px',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(to right, #00d2ff, #3a7bd5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Notification Tester
        </h1>
        
        <p style={{ color: '#888', lineHeight: '1.6' }}>
          This page allows you to manually trigger a test notification to verify that the real-time system is working.
        </p>

        {user ? (
          <div style={{ background: '#151515', padding: '30px', borderRadius: '15px', border: '1px solid #333', width: '100%' }}>
            <p style={{ marginBottom: '20px' }}>Logged in as: <strong>{user.email}</strong></p>
            <button 
              onClick={sendTestNotification}
              disabled={loading}
              style={{
                background: 'linear-gradient(to right, #00d2ff, #3a7bd5)',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: '0.3s'
              }}
            >
              {loading ? 'Sending...' : '🚀 Send Test Notification'}
            </button>
            {message && (
              <p style={{ 
                marginTop: '20px', 
                color: message.startsWith('Error') ? '#ff4d4d' : '#00ff88',
                fontWeight: '500'
              }}>
                {message}
              </p>
            )}
          </div>
        ) : (
          <div style={{ background: '#151515', padding: '30px', borderRadius: '15px', border: '1px solid #333', width: '100%' }}>
            <p style={{ color: '#ff4d4d' }}>You are not logged in.</p>
            <a href="/auth" style={{ 
              display: 'inline-block', 
              marginTop: '15px', 
              color: '#00d2ff', 
              textDecoration: 'none',
              fontWeight: '600'
            }}>
              Go to Login Page →
            </a>
          </div>
        )}

        <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(58, 123, 213, 0.1)', borderRadius: '10px', borderLeft: '4px solid #3a7bd5' }}>
          <p style={{ fontSize: '0.9rem', textAlign: 'left', color: '#aaa' }}>
            <strong>How it works:</strong> Clicking the button calls the <code>createNotification</code> action. 
            The <code>NotificationBell</code> component in your Navbar is listening to your specific user ID 
            channel via Supabase and should update instantly!
          </p>
        </div>
      </div>
    </main>
  );
}
