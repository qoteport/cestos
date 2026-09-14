'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '@/components/DataUI';

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

interface FleetBarChartProps {
  statusFilter?: string;
  categoryId?: string;
  locationId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default function FleetBarChart({
  statusFilter,
  categoryId,
  locationId,
  projectId,
  dateFrom,
  dateTo,
}: FleetBarChartProps) {
  const params = new URLSearchParams();
  if (statusFilter) params.append('status', statusFilter);
  if (categoryId) params.append('category_id', categoryId);
  if (locationId) params.append('location_id', locationId);
  if (projectId) params.append('project_id', projectId);
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);

  const url = '/api/v1/assets/dashboard-summary' + (params.toString() ? '?' + params.toString() : '');
  const dashRes = useData(url);

  let byProject: any[] = [];
  const rawByProject = dashRes.data?.by_project ?? dashRes.data?.assets_by_project;
  if (Array.isArray(rawByProject)) {
    byProject = rawByProject;
  } else if (rawByProject && typeof rawByProject === 'object') {
    byProject = Object.entries(rawByProject).map(([proj, val]: [string, any]) => {
      if (typeof val === 'number') {
        return { project: proj, count: val, operating: val, standby: 0, breakdown: 0 };
      }
      return { project: proj, ...val };
    });
  }

  const chartData = byProject.map((item: any) => ({
    project: item.project || item.name || 'Unassigned',
    operating: item.operating ?? item.count ?? 0,
    standby: item.standby ?? 0,
    breakdown: item.breakdown ?? 0,
  }));

  if (dashRes.loading) {
    return (
      <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Loading live fleet deployment data from database...
      </div>
    );
  }

  if (dashRes.error) {
    return (
      <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-xs text-destructive">
        <p>Failed to load fleet deployment data: {dashRes.error}</p>
        <button
          type="button"
          onClick={() => dashRes.reload()}
          className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
        No fleet asset project records found in database.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={20} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="project" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
        <Bar dataKey="operating" name="Operating / Assets" fill="var(--primary)" radius={[2, 2, 0, 0]} stackId="a" />
        <Bar dataKey="standby" name="Standby/Maint." fill="#FBBF24" radius={[0, 0, 0, 0]} stackId="a" />
        <Bar dataKey="breakdown" name="Breakdown" fill="#F87171" radius={[2, 2, 0, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}