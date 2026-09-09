'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const DATA = [
  { date: 'Aug 10', alpha: 4200, bravo: 2800, delta: 800 },
  { date: 'Aug 13', alpha: 3800, bravo: 3100, delta: 1100 },
  { date: 'Aug 16', alpha: 5100, bravo: 2600, delta: 900 },
  { date: 'Aug 19', alpha: 4700, bravo: 3400, delta: 1300 },
  { date: 'Aug 22', alpha: 6200, bravo: 2900, delta: 1100 },
  { date: 'Aug 25', alpha: 5800, bravo: 3200, delta: 1600 },
  { date: 'Aug 28', alpha: 4300, bravo: 2700, delta: 2100 },
  { date: 'Aug 31', alpha: 5500, bravo: 3600, delta: 1800 },
  { date: 'Sep 3', alpha: 6800, bravo: 3100, delta: 1400 },
  { date: 'Sep 6', alpha: 5200, bravo: 2800, delta: 2300 },
  { date: 'Sep 9', alpha: 4900, bravo: 3300, delta: 1900 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded shadow-card-md px-3 py-2.5 text-xs">
        <p className="font-600 text-foreground mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <div key={`tooltip-${p.dataKey}`} className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}:</span>
            <span className="font-600 text-foreground tabular-nums">{p.value.toLocaleString()} L</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ConsumptionTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradAlpha" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradBravo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradDelta" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D97706" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>{value}</span>}
          iconSize={8}
        />
        <Area type="monotone" dataKey="alpha" name="Alpha" stroke="var(--primary)" strokeWidth={2} fill="url(#gradAlpha)" dot={false} />
        <Area type="monotone" dataKey="bravo" name="Bravo" stroke="#7C3AED" strokeWidth={2} fill="url(#gradBravo)" dot={false} />
        <Area type="monotone" dataKey="delta" name="Delta" stroke="#D97706" strokeWidth={2} fill="url(#gradDelta)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}