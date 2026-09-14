'use client';

import React, { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getOperationsSummary, type OperationsSummary } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  Operating: 'var(--primary)',
  Available: '#15803D',
  Maintenance: '#D97706',
  Breakdown: '#DC2626',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded shadow-card-md px-3 py-2 text-xs">
        <p className="font-600 text-foreground">{payload[0].name}</p>
        <p className="text-muted-foreground mt-0.5">
          <span className="font-600 text-foreground tabular-nums">{payload[0].value}</span> assets
        </p>
      </div>
    );
  }
  return null;
};

export default function AssetStatusChart() {
  const [data, setData] = useState<OperationsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOperationsSummary()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const chartData = [
    { name: 'Operating', value: data?.assets?.operating ?? data?.operating_assets ?? 0 },
    { name: 'Available', value: data?.assets?.available ?? data?.available_assets ?? 0 },
    { name: 'Maintenance', value: data?.assets?.maintenance ?? 0 },
    { name: 'Breakdown', value: data?.assets?.breakdown ?? data?.breakdowns ?? 0 },
  ].filter((d) => d.value > 0);

  if (loading) {
    return <div className="h-[200px] bg-muted animate-pulse rounded" />;
  }

  if (!chartData.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
        No asset data recorded yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry) => (
            <Cell key={`asset-cell-${entry.name}`} fill={STATUS_COLORS[entry.name] || '#9CA3AF'} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{value}</span>
          )}
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
