'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const DATA = [
  { dept: 'Drilling', count: 68 },
  { dept: 'Geology', count: 22 },
  { dept: 'HSE', count: 18 },
  { dept: 'Logistics', count: 24 },
  { dept: 'Engineering', count: 14 },
  { dept: 'Operations', count: 21 },
  { dept: 'Admin', count: 9 },
  { dept: 'Finance', count: 8 },
];

const COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#15803D', '#E8530A', '#6B7280', '#0891B2'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded shadow-card-md px-3 py-2 text-xs">
        <p className="font-600 text-foreground">{label}</p>
        <p className="text-muted-foreground mt-0.5">
          <span className="font-600 text-foreground">{payload[0].value}</span> employees
        </p>
      </div>
    );
  }
  return null;
};

export default function EmployeesByDeptChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="dept" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {DATA.map((entry, index) => (
            <Cell key={`dept-cell-${entry.dept}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}