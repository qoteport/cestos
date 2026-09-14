'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#15803D', '#6B7280'];

export default function ValueByCategoryChart({ data }: { data: Array<{ name: string; value?: number; inventory_value?: number | string }> }) {
  const normalizedData = (data || [])
    .map(d => ({
      name: d.name,
      value: Number(d.value ?? d.inventory_value ?? 0),
    }))
    .filter(d => d.value > 0);

  if (!normalizedData || normalizedData.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
        No category valuation records found in database.
      </div>
    );
  }

  const total = normalizedData.reduce((s, d) => s + (d.value || 0), 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pct = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : '0';
      return (
        <div className="bg-card border border-border rounded shadow-card-md px-3 py-2 text-xs">
          <p className="font-600 text-foreground">{payload[0].name}</p>
          <p className="text-muted-foreground mt-0.5">
            <span className="font-600 text-foreground">${Number(payload[0].value).toLocaleString()}</span>
            <span className="ml-1">({pct}%)</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={normalizedData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {normalizedData.map((entry, index) => (
            <Cell key={`vbc-cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
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