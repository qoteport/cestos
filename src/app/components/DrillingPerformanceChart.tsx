'use client';

import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { apiFetch } from '@/lib/api';

interface MonthlyMetric {
  month: string;
  metres: number | null;
  drill_holes: number | null;
}

interface DashboardSummary {
  by_month?: MonthlyMetric[];
  metres?: number;
  drill_holes?: number;
  [key: string]: unknown;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded shadow-card-md px-3 py-2 text-xs">
        <p className="font-600 text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={`tooltip-${p.dataKey}`} className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}:</span>
            <span className="font-600 text-foreground tabular-nums">
              {p.value?.toLocaleString()} {p.dataKey === 'metres' ? 'm' : 'holes'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DrillingPerformanceChart({ projectId }: { projectId?: string }) {
  const [data, setData] = useState<MonthlyMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = projectId
      ? `/api/v1/projects/${projectId}/report-metrics`
      : `/api/v1/projects/dashboard-summary`;

    apiFetch<DashboardSummary>(url)
      .then((res) => {
        const months = res?.by_month || [];
        setData(months);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  const chartData = data.map((r) => ({
    month: r.month ? new Date(r.month).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) : '',
    metres: r.metres ?? 0,
    holes: r.drill_holes ?? 0,
  }));

  if (loading) {
    return <div className="h-[200px] bg-muted animate-pulse rounded" />;
  }

  if (!chartData.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
        No drilling data recorded for this selection.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradMetres" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradHoles" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>
              {value}
            </span>
          )}
          iconSize={8}
        />
        <Area type="monotone" dataKey="metres" name="Metres Drilled" stroke="var(--primary)" strokeWidth={2} fill="url(#gradMetres)" dot={false} />
        <Area type="monotone" dataKey="holes" name="Completed Holes" stroke="#7C3AED" strokeWidth={2} fill="url(#gradHoles)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
