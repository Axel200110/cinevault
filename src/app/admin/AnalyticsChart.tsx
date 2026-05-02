"use client";

import React, { useEffect, useState } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { fetchTrafficLogs } from '@/app/actions';

export default function AnalyticsChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const logs = await fetchTrafficLogs();
      // Format date for display
      const formatted = logs.map(item => ({
        ...item,
        displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));
      setData(formatted);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Intelligence...</div>;
  if (data.length === 0) return <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>No traffic intelligence available yet.</div>;

  return (
    <div style={{ width: '100%', height: 350, marginTop: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="displayDate" 
            stroke="rgba(255,255,255,0.4)" 
            fontSize={11} 
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.4)" 
            fontSize={11} 
            tickLine={false}
            axisLine={false}
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f0f19', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '12px',
              color: '#fff',
              fontSize: '12px',
              padding: '12px'
            }}
            itemStyle={{ color: '#e11d48', fontWeight: 'bold' }}
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
          />
          <Area 
            type="monotone" 
            dataKey="total_clicks" 
            name="Platform Traffic"
            stroke="#e11d48" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorClicks)" 
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
