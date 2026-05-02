"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import MaintenanceScreen from './MaintenanceScreen';

export default function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      // 0. Check for Preview Query Param
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('preview_maintenance') === 'true') {
          setIsMaintenance(true);
          setLoading(false);
          return;
        }
      }

      // 1. Check if user is Admin (bypass maintenance)
      const adminSession = typeof window !== 'undefined' ? localStorage.getItem('admin_session') : null;
      if (adminSession === 'true') {
        setIsAdmin(true);
      }

      // 2. Check Maintenance Mode from DB
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single();
        
        if (data) {
          setIsMaintenance(data.value === true || data.value === 'true');
        } else {
          // Fallback to localStorage if table doesn't exist or no data
          const localMaintenance = localStorage.getItem('maintenance_mode');
          if (localMaintenance === 'true') setIsMaintenance(true);
        }
      } catch (err) {
        // Fallback on error (like table missing)
        const localMaintenance = localStorage.getItem('maintenance_mode');
        if (localMaintenance === 'true') setIsMaintenance(true);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  if (loading) return <>{children}</>; // Allow children to load while checking

  if (isMaintenance && !isAdmin) {
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
}
