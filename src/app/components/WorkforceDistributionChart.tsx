'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useData } from '@/components/DataUI';

const COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#6B7280', '#15803D', '#DC2626'];

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

export default function WorkforceDistributionChart({ projectId, departmentId }: { projectId?: string; departmentId?: string }) {
  const queryParams = new URLSearchParams();
  if (projectId) queryParams.set('project_id', projectId);
  if (departmentId) queryParams.set('department_id', departmentId);

  const url = '/api/v1/hr/workforce-stats' + (queryParams.toString() ? '?' + queryParams.toString() : '');
  const statsRes = useData(url);

  const byProject = statsRes.data?.by_project || [];

  if (statsRes.loading) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Loading live workforce distribution data from database...
      </div>
    );
  }

  if (byProject.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
        No workforce project deployment records found in database.
      </div>
    );
  }

  const chartData = byProject.map((item: any) => ({
    project: item.project,
    employees: item.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="project" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="employees" radius={[3, 3, 0, 0]}>
          {chartData.map((entry: any, index: number) => (
            <Cell key={`wf-cell-${entry.project}-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}