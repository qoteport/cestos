'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const DATA = [
  { project: 'Alpha', value: 48200 },
  { project: 'Bravo', value: 31400 },
  { project: 'Delta', value: 18900 },
  { project: 'Yard', value: 7200 },
  { project: 'Office', value: 3100 },
];

const COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#6B7280'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded shadow-card-md px-3 py-2 text-xs">
        <p className="font-600 text-foreground">{label}</p>
        <p className="text-muted-foreground mt-0.5">
          <span className="font-600 text-foreground">${payload[0].value.toLocaleString()}</span> consumed
        </p>
      </div>
    );
  }
  return null;
};

export default function ConsumptionByProjectChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={32}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="project" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {DATA.map((entry, index) => (
            <Cell key={`cbp-cell-${entry.project}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}