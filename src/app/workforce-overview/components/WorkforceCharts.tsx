'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,  } from 'recharts';

// ── Employees by Department ──────────────────────────────────────────────────
const DEPT_DATA = [
  { dept: 'Drilling', count: 52 },
  { dept: 'Engineering', count: 38 },
  { dept: 'Logistics', count: 27 },
  { dept: 'Admin', count: 19 },
  { dept: 'Safety', count: 14 },
  { dept: 'Finance', count: 11 },
  { dept: 'IT', count: 7 },
];

const DEPT_COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#6B7280', '#15803D', '#DC2626'];

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

function EmployeesByDeptChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={DEPT_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="dept" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<DeptTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {DEPT_DATA.map((entry, index) => (
            <Cell key={`dept-cell-${entry.dept}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Employees by Project ─────────────────────────────────────────────────────
const PROJ_DATA = [
  { project: 'Alpha', count: 42 },
  { project: 'Bravo', count: 31 },
  { project: 'Delta', count: 18 },
  { project: 'Main Yard', count: 12 },
  { project: 'Head Office', count: 9 },
  { project: 'On Leave', count: 8 },
  { project: 'Training', count: 5 },
];

const PROJ_COLORS = ['var(--primary)', '#7C3AED', '#D97706', '#0891B2', '#6B7280', '#0891B2', '#15803D'];

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

function EmployeesByProjectChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={PROJ_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="project" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ProjTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {PROJ_DATA.map((entry, index) => (
            <Cell key={`proj-cell-${entry.project}`} fill={PROJ_COLORS[index % PROJ_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Combined export ──────────────────────────────────────────────────────────
export default function WorkforceCharts() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="card p-5">
        <div className="mb-4">
          <p className="text-sm font-700 text-foreground">Employees by Department</p>
          <p className="text-xs text-muted-foreground">Current headcount per department</p>
        </div>
        <EmployeesByDeptChart />
      </div>
      <div className="card p-5">
        <div className="mb-4">
          <p className="text-sm font-700 text-foreground">Employees by Project</p>
          <p className="text-xs text-muted-foreground">Current deployment distribution</p>
        </div>
        <EmployeesByProjectChart />
      </div>
    </div>
  );
}