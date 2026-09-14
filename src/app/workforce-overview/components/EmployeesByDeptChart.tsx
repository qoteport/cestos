'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useData } from '@/components/DataUI';

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

export default function EmployeesByDeptChart({ data: passedData }: { data?: Array<{ dept: string; count: number }> }) {
  const statsRes = useData('/api/v1/employees/dashboard-summary');
  const rawData = passedData || (statsRes.data?.by_department || []).map((d: any) => ({ dept: d.department ?? d.dept, count: d.count }));
  const data = rawData;

  if (!passedData && statsRes.loading) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Loading live department data from database...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
        No department records found in database.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="dept" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry: any, index: number) => (
            <Cell key={`dept-cell-${entry.dept}-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}