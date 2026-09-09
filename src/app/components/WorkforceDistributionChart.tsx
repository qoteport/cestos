'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const DATA = [
  { project: 'Alpha', employees: 42 },
  { project: 'Bravo', employees: 31 },
  { project: 'Delta', employees: 18 },
  { project: 'Yard', employees: 12 },
  { project: 'Office', employees: 9 },
  { project: 'Leave', employees: 8 },
  { project: 'Training', employees: 5 },
];

const COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#6B7280', '#0891B2', '#15803D'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded shadow-card-md px-3 py-2 text-xs">
        <p className="font-600 text-foreground">{label}</p>
        <p className="text-muted-foreground mt-0.5">
          <span className="font-600 text-foreground tabular-nums">{payload[0].value}</span> employees
        </p>
      </div>
    );
  }
  return null;
};

export default function WorkforceDistributionChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="project" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="employees" radius={[3, 3, 0, 0]}>
          {DATA.map((entry, index) => (
            <Cell key={`wf-cell-${entry.project}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}