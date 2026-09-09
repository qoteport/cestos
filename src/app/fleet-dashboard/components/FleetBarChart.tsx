'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,  } from 'recharts';

const DATA = [
  { project: 'Alpha', operating: 5, standby: 1, breakdown: 0 },
  { project: 'Bravo', operating: 4, standby: 0, breakdown: 1 },
  { project: 'Delta', operating: 3, standby: 1, breakdown: 0 },
  { project: 'Main Yard', operating: 4, standby: 0, breakdown: 0 },
  { project: 'Workshop', operating: 3, standby: 1, breakdown: 1 },
  { project: 'Unassigned', operating: 0, standby: 0, breakdown: 0 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded shadow-card-md px-3 py-2 text-xs">
        <p className="font-600 text-foreground mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <div key={`flt-tooltip-${p.dataKey}`} className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.fill }} />
            <span className="text-muted-foreground capitalize">{p.name}:</span>
            <span className="font-600 text-foreground">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function FleetBarChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={20} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="project" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
        <Bar dataKey="operating" name="Operating" fill="var(--primary)" radius={[2, 2, 0, 0]} stackId="a" />
        <Bar dataKey="standby" name="Standby/Maint." fill="#FBBF24" radius={[0, 0, 0, 0]} stackId="a" />
        <Bar dataKey="breakdown" name="Breakdown" fill="#F87171" radius={[2, 2, 0, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}