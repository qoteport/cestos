'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DATA = [
  { name: 'Lubricants', value: 142000 },
  { name: 'Tooling', value: 98500 },
  { name: 'Consumables', value: 76200 },
  { name: 'Fuel', value: 64800 },
  { name: 'PPE', value: 28400 },
  { name: 'Spare Parts', value: 18600 },
];

const COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#15803D', '#6B7280'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const total = DATA.reduce((s, d) => s + d.value, 0);
    const pct = ((payload[0].value / total) * 100).toFixed(1);
    return (
      <div className="bg-card border border-border rounded shadow-card-md px-3 py-2 text-xs">
        <p className="font-600 text-foreground">{payload[0].name}</p>
        <p className="text-muted-foreground mt-0.5">
          <span className="font-600 text-foreground">${payload[0].value.toLocaleString()}</span>
          <span className="ml-1">({pct}%)</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function ValueByCategoryChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={DATA}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {DATA.map((entry, index) => (
            <Cell key={`vbc-cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{value}</span>}
          iconSize={8}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}