'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { useData } from '@/components/DataUI';

const DEPT_COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#6B7280', '#15803D', '#DC2626'];
const PROJ_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#64748B', '#06B6D4', '#EC4899'];
const STATUS_COLORS: Record<string, string> = {
  Active: '#16A34A',
  'On Leave': '#EAB308',
  'Off Rotation': '#8B5CF6',
  'Out Of Contract': '#F97316',
  Suspended: '#EF4444',
  Probation: '#3B82F6',
  Resigned: '#64748B',
  Terminated: '#DC2626',
  Exited: '#94A3B8',
  Unknown: '#94A3B8',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded shadow-card-md px-3 py-2 text-xs z-50">
        <p className="font-600 text-foreground">{label}</p>
        <p className="text-muted-foreground mt-0.5">
          <span className="font-600 text-foreground">{payload[0].value}</span> employees
        </p>
      </div>
    );
  }
  return null;
};

const ProjectStatusTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((acc: number, entry: any) => acc + (Number(entry.value) || 0), 0);
    return (
      <div className="bg-card border border-border rounded shadow-card-md px-3 py-2 text-xs z-50 space-y-1">
        <p className="font-700 text-foreground border-b border-border pb-1 mb-1">{label} ({total} total)</p>
        {payload.map((entry: any, index: number) => (
          <div key={`tt-${entry.name}-${index}`} className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 font-500 text-muted-foreground">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-700 text-foreground">{entry.value}</span>
          </div>
        ))}
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
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
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
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`proj-cell-${entry.project}-${index}`} fill={PROJ_COLORS[index % PROJ_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmployeesByStatusChart({ data }: { data: Array<{ status: string; count: number }> }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
        No employment status records found in database.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="status" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`status-cell-${entry.status}-${index}`}
              fill={STATUS_COLORS[entry.status] || DEPT_COLORS[index % DEPT_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmployeesByProjectAndStatusChart({
  data,
  statusKeys,
}: {
  data: Array<Record<string, any>>;
  statusKeys: string[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
        No project breakdown records found in database.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={26}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="project" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ProjectStatusTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
        {statusKeys.map((statusKey, index) => (
          <Bar
            key={`bar-status-${statusKey}`}
            dataKey={statusKey}
            stackId="projStatusStack"
            fill={STATUS_COLORS[statusKey] || DEPT_COLORS[index % DEPT_COLORS.length]}
            radius={index === statusKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
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

  const url = '/api/v1/employees/dashboard-summary' + (queryParams.toString() ? '?' + queryParams.toString() : '');
  const statsRes = useData(url);

  const rawDept = statsRes.data?.employees_by_department || statsRes.data?.by_department;
  const byDept: Array<{ dept: string; count: number }> = Array.isArray(rawDept)
    ? rawDept.map((d: any) => ({ dept: d.department ?? d.dept ?? d.name ?? 'Unassigned', count: Number(d.count ?? d.value ?? 0) }))
    : typeof rawDept === 'object' && rawDept !== null
    ? Object.entries(rawDept).map(([dept, count]) => ({ dept: dept || 'Unassigned', count: Number(count || 0) }))
    : [];

  const rawProj = statsRes.data?.employees_by_project || statsRes.data?.by_project;
  const byProj: Array<{ project: string; count: number }> = Array.isArray(rawProj)
    ? rawProj.map((d: any) => ({ project: d.project ?? d.name ?? 'Unknown', count: Number(d.count ?? d.value ?? 0) }))
    : typeof rawProj === 'object' && rawProj !== null
    ? Object.entries(rawProj).map(([project, count]) => ({ project: project || 'Unknown', count: Number(count || 0) }))
    : [];

  const rawStatus = statsRes.data?.employees_by_employment_status || statsRes.data?.by_employment_status || statsRes.data?.by_status;
  let byStatus: Array<{ status: string; count: number }> = [];

  if (Array.isArray(rawStatus)) {
    byStatus = rawStatus.map((d: any) => ({
      status: d.status ?? d.name ?? 'Unknown',
      count: Number(d.count ?? d.value ?? 0),
    }));
  } else if (typeof rawStatus === 'object' && rawStatus !== null) {
    byStatus = Object.entries(rawStatus).map(([st, count]) => ({
      status: st || 'Unknown',
      count: Number(count || 0),
    }));
  } else if (statsRes.data) {
    const d = statsRes.data;
    const fallbackList = [
      { status: 'Active', count: Number(d.active_employees || 0) },
      { status: 'On Leave', count: Number(d.on_leave || 0) },
      { status: 'Off Rotation', count: Number(d.off_rotation || 0) },
      { status: 'Suspended', count: Number(d.suspended || 0) },
    ].filter((item) => item.count > 0);
    byStatus = fallbackList;
  }

  // 4th Chart: Employees by Project & Employment Status
  const rawProjStatus = statsRes.data?.employees_by_project_and_status || statsRes.data?.by_project_and_status;
  const projectStatusMap: Record<string, Record<string, number>> = typeof rawProjStatus === 'object' && rawProjStatus !== null ? rawProjStatus : {};

  const statusKeySet = new Set<string>();
  const projStatusData: Array<Record<string, any>> = [];

  Object.entries(projectStatusMap).forEach(([projName, statusObj]) => {
    const row: Record<string, any> = { project: projName };
    Object.entries(statusObj || {}).forEach(([st, cnt]) => {
      row[st] = Number(cnt || 0);
      if (Number(cnt || 0) > 0) statusKeySet.add(st);
    });
    projStatusData.push(row);
  });

  const statusKeys = Array.from(statusKeySet);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Department */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-700 text-foreground">Employees by Department</p>
            <p className="text-xs text-muted-foreground">Headcount per department</p>
          </div>
          {statsRes.loading && <span className="text-[11px] text-muted-foreground animate-pulse">Loading live data...</span>}
        </div>
        <EmployeesByDeptChart data={byDept} />
      </div>

      {/* 2. Project */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-700 text-foreground">Employees by Project</p>
            <p className="text-xs text-muted-foreground">Current project deployment</p>
          </div>
          {statsRes.loading && <span className="text-[11px] text-muted-foreground animate-pulse">Loading live data...</span>}
        </div>
        <EmployeesByProjectChart data={byProj} />
      </div>

      {/* 3. Employment Status */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-700 text-foreground">Employees by Employment Status</p>
            <p className="text-xs text-muted-foreground">Headcount by status category</p>
          </div>
          {statsRes.loading && <span className="text-[11px] text-muted-foreground animate-pulse">Loading live data...</span>}
        </div>
        <EmployeesByStatusChart data={byStatus} />
      </div>

      {/* 4. Project & Employment Status Combined */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-700 text-foreground">Employees by Project & Employment Status</p>
            <p className="text-xs text-muted-foreground">Breakdown of status per project assignment</p>
          </div>
          {statsRes.loading && <span className="text-[11px] text-muted-foreground animate-pulse">Loading live data...</span>}
        </div>
        <EmployeesByProjectAndStatusChart data={projStatusData} statusKeys={statusKeys} />
      </div>
    </div>
  );
}