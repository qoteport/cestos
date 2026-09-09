'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Search } from 'lucide-react';
import { getProjects, getProjectManpowerSummary } from '@/lib/api';

interface WorkforceEmployee {
  id?: string;
  employee_number?: string;
  employee?: { employee_number?: string; full_name?: string; first_name?: string; last_name?: string };
  full_name?: string;
  department?: { name?: string } | string;
  position?: { name?: string } | string;
  role?: string;
  site?: { name?: string } | string;
  site_name?: string;
  status?: string;
  start_date?: string;
  assignment_start_date?: string;
  [key: string]: unknown;
}

function getEmpName(e: WorkforceEmployee): string {
  if (e?.employee?.full_name) return e.employee.full_name;
  if (e?.employee?.first_name || e?.employee?.last_name)
    return `${e.employee?.first_name ?? ''} ${e.employee?.last_name ?? ''}`.trim();
  return e?.full_name ?? '—';
}

function getEmpNo(e: WorkforceEmployee): string {
  return e?.employee?.employee_number ?? e?.employee_number ?? '—';
}

function getDept(e: WorkforceEmployee): string {
  if (typeof e?.department === 'object' && e?.department?.name) return e.department.name;
  if (typeof e?.department === 'string') return e.department;
  return '—';
}

function getPosition(e: WorkforceEmployee): string {
  if (typeof e?.position === 'object' && e?.position?.name) return e.position.name;
  if (typeof e?.position === 'string') return e.position;
  return e?.role ?? '—';
}

function getSite(e: WorkforceEmployee): string {
  if (typeof e?.site === 'object' && e?.site?.name) return e.site.name;
  if (typeof e?.site === 'string') return e.site;
  return e?.site_name ?? '—';
}

function getStatusClass(status?: string): string {
  switch (status?.toUpperCase()) {
    case 'ASSIGNED': return 'badge-assigned';
    case 'ON_LEAVE': return 'badge-on-leave';
    case 'AVAILABLE': return 'badge-available';
    default: return 'badge-neutral';
  }
}

function formatDate(d?: string): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

export default function ProjectWorkforceTab() {
  const [workforce, setWorkforce] = useState<WorkforceEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getProjects({ status: 'ACTIVE', page_size: '1' })
      .then(async res => {
        const first = res?.items?.[0];
        if (first?.id) {
          const summary = await getProjectManpowerSummary(first.id);
          // The manpower summary may return employees array directly or nested
          const data = summary as Record<string, unknown>;
          const employees = (data?.employees ?? data?.current_employees ?? data?.items ?? []) as WorkforceEmployee[];
          setWorkforce(employees);
        }
      })
      .catch(() => setWorkforce([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = workforce.filter(emp => {
    if (!search) return true;
    const name = getEmpName(emp).toLowerCase();
    const dept = getDept(emp).toLowerCase();
    return name.includes(search.toLowerCase()) || dept.includes(search.toLowerCase());
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="input-field pl-8 py-1.5 text-xs w-48"
              placeholder="Search workforce..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <button className="btn-primary text-xs py-1.5">
          <UserPlus size={13} />
          Assign Employee
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {search ? 'No employees match your search.' : 'No workforce assigned to this project.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Emp No.</th>
                <th>Name</th>
                <th>Department</th>
                <th>Role</th>
                <th>Site</th>
                <th>Status</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, idx) => (
                <tr key={emp?.id ?? idx}>
                  <td className="text-xs font-600 text-muted-foreground tabular-nums">{getEmpNo(emp)}</td>
                  <td>
                    <Link href="/workforce-overview" className="entity-link text-sm font-600">{getEmpName(emp)}</Link>
                  </td>
                  <td className="text-sm text-muted-foreground">{getDept(emp)}</td>
                  <td className="text-sm text-foreground">{getPosition(emp)}</td>
                  <td className="text-sm text-muted-foreground">{getSite(emp)}</td>
                  <td><span className={`badge ${getStatusClass(emp?.status)}`}>{emp?.status?.replace('_', ' ') ?? '—'}</span></td>
                  <td className="text-xs text-muted-foreground">{formatDate(emp?.start_date ?? emp?.assignment_start_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}