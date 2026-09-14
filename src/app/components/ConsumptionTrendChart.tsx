'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useData } from '@/components/DataUI';

const AREA_COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#15803D', '#DC2626'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded shadow-card-md px-3 py-2 text-xs">
        <p className="font-600 text-foreground mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <div key={`tooltip-${p.dataKey}`} className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}:</span>
            <span className="font-600 text-foreground tabular-nums">${Number(p.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ConsumptionTrendChart({ projectId }: { projectId?: string }) {
  const queryParams = new URLSearchParams();
  if (projectId) queryParams.set('project_id', projectId);

  const url = '/api/v1/inventory/stats' + (queryParams.toString() ? '?' + queryParams.toString() : '');
  const statsRes = useData(url);

  const trendData = statsRes.data?.consumption_trend || [];
  const projectConsumption = statsRes.data?.consumption_by_project || [];

  if (statsRes.loading) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Loading live inventory consumption data from database...
      </div>
    );
  }

  if (trendData.length === 0 && projectConsumption.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
        No material issues or consumption records found in database.
      </div>
    );
  }

  // If daily trend records exist, map them; otherwise map by-project consumption
  const chartData = trendData.length > 0 ? trendData : projectConsumption.map((p: any) => ({
    date: p.project,
    value: p.value,
  }));

  const keys = trendData.length > 0
    ? Object.keys(chartData[0] || {}).filter((k) => k !== 'date')
    : ['value'];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          {keys.map((key, idx) => (
            <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1" key={key}>
              <stop offset="5%" stopColor={AREA_COLORS[idx % AREA_COLORS.length]} stopOpacity={0.2} />
              <stop offset="95%" stopColor={AREA_COLORS[idx % AREA_COLORS.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>{value}</span>}
          iconSize={8}
        />
        {keys.map((key, idx) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={key === 'value' ? 'Material Issued Value' : key}
            stroke={AREA_COLORS[idx % AREA_COLORS.length]}
            strokeWidth={2}
            fill={`url(#grad-${key})`}
            dot={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}