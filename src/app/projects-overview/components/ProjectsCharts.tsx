'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { apiFetch } from '@/lib/api';

interface DashboardSummary {
  by_status?: Record<string, number>;
  by_month?: { month: string; metres: number | null; drill_holes: number | null }[];
  [key: string]: unknown;
}

// ── Colour palettes ───────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'var(--primary)',
  MOBILIZING: '#D97706',
  PLANNING: '#6B7280',
  PAUSED: '#0891B2',
  COMPLETED: '#15803D',
  CLOSED: '#4B5563',
  CANCELLED: '#DC2626',
};
const FALLBACK_COLOR = '#9CA3AF';

// ── Custom tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border shadow-card-md px-3 py-2 text-xs">
        <p className="font-600 text-foreground">{label}</p>
        <p className="text-muted-foreground mt-0.5">
          <span className="font-600 text-foreground">{payload[0].value?.toLocaleString()}</span>{' '}
          {payload[0].name}
        </p>
      </div>
    );
  }
  return null;
};

// ── Projects by Status chart ──────────────────────────────────────────────────
function ProjectsByStatusChart({ byStatus }: { byStatus: Record<string, number> }) {
  const data = Object.entries(byStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ status, count }));

  if (!data.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
        No project data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="status"
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => v.charAt(0) + v.slice(1).toLowerCase()}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="count" name="projects" radius={[3, 3, 0, 0]}>
          {data.map(entry => (
            <Cell
              key={`status-cell-${entry.status}`}
              fill={STATUS_COLORS[entry.status] ?? FALLBACK_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Monthly Drilling Performance chart ───────────────────────────────────────
const MONTH_COLORS = ['var(--primary)', '#7C3AED'];

function MonthlyDrillingChart({
  byMonth,
}: {
  byMonth: { month: string; metres: number | null; drill_holes: number | null }[];
}) {
  const data = byMonth.map(r => ({
    month: r.month ? new Date(r.month).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) : '',
    metres: r.metres ?? 0,
    drill_holes: r.drill_holes ?? 0,
  }));

  if (!data.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
        No drilling reports yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={16} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="metres" name="metres" radius={[3, 3, 0, 0]} fill={MONTH_COLORS[0]} />
        <Bar dataKey="drill_holes" name="holes" radius={[3, 3, 0, 0]} fill={MONTH_COLORS[1]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Combined export ───────────────────────────────────────────────────────────
export default function ProjectsCharts() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<DashboardSummary>('/api/v1/projects/dashboard-summary')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="card p-5">
            <div className="h-4 bg-muted animate-pulse rounded w-1/3 mb-2" />
            <div className="h-3 bg-muted animate-pulse rounded w-1/2 mb-6" />
            <div className="h-[220px] bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="card p-5">
        <div className="mb-4">
          <p className="text-sm font-700 text-foreground">Projects by Status</p>
          <p className="text-xs text-muted-foreground">Current distribution across all statuses</p>
        </div>
        <ProjectsByStatusChart byStatus={data?.by_status ?? {}} />
      </div>
      <div className="card p-5">
        <div className="mb-4">
          <p className="text-sm font-700 text-foreground">Monthly Drilling Performance</p>
          <p className="text-xs text-muted-foreground">Metres drilled and holes completed per month</p>
        </div>
        <MonthlyDrillingChart byMonth={data?.by_month ?? []} />
      </div>
    </div>
  );
}
