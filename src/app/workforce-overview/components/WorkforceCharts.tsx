'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useData } from '@/components/DataUI';

const DEPT_COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#6B7280', '#15803D', '#DC2626'];
const PROJ_COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#6B7280', '#0891B2', '#15803D'];

const DeptTooltip = ({ active, payload, label }: any) => {
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

const ProjTooltip = ({ active, payload, label }: any) => {
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

function EmployeesByDeptChart({ data }: { data: Array<{ dept: string; count: number }> }) {
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
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<DeptTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`dept-cell-${entry.dept}-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmployeesByProjectChart({ data }: { data: Array<{ project: string; count: number }> }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
        No project deployment records found in database.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="project" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ProjTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`proj-cell-${entry.project}-${index}`} fill={PROJ_COLORS[index % PROJ_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface WorkforceChartsProps {
  departmentId?: string;
  employmentStatus?: string;
  availabilityStatus?: string;
  projectId?: string;
}

// ── Combined export ──────────────────────────────────────────────────────────
export default function WorkforceCharts({
  departmentId,
  employmentStatus,
  availabilityStatus,
  projectId,
}: WorkforceChartsProps) {
  const queryParams = new URLSearchParams();
  if (departmentId) queryParams.set('department_id', departmentId);
  if (employmentStatus) queryParams.set('employment_status', employmentStatus);
  if (availabilityStatus) queryParams.set('availability_status', availabilityStatus);
  if (projectId) queryParams.set('project_id', projectId);

  const url = '/api/v1/hr/workforce-stats' + (queryParams.toString() ? '?' + queryParams.toString() : '');
  const statsRes = useData(url);
  const byDept = statsRes.data?.by_department || [];
  const byProj = statsRes.data?.by_project || [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-700 text-foreground">Employees by Department</p>
            <p className="text-xs text-muted-foreground">Current headcount per department</p>
          </div>
          {statsRes.loading && <span className="text-[11px] text-muted-foreground animate-pulse">Loading live data...</span>}
        </div>
        <EmployeesByDeptChart data={byDept} />
      </div>
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-700 text-foreground">Employees by Project</p>
            <p className="text-xs text-muted-foreground">Current deployment distribution</p>
          </div>
          {statsRes.loading && <span className="text-[11px] text-muted-foreground animate-pulse">Loading live data...</span>}
        </div>
        <EmployeesByProjectChart data={byProj} />
      </div>
    </div>
  );
}