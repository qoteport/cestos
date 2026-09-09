'use client';

import React, { useEffect, useState } from 'react';
import { Users, UserCheck, Briefcase, RotateCcw } from 'lucide-react';
import { getWorkforceDashboard, type WorkforceDashboard } from '@/lib/api';

export default function WorkforceKPIStrip() {
  const [data, setData] = useState<WorkforceDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkforceDashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    {
      id: 'wf-kpi-total',
      label: 'Total Employees',
      value: loading ? '—' : String(data?.total_employees ?? data?.active_employees ?? '—'),
      sub: data ? `${data?.active_employees ?? '—'} active` : 'Loading...',
      icon: <Users size={17} />,
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
    },
    {
      id: 'wf-kpi-assigned',
      label: 'Assigned',
      value: loading ? '—' : String(data?.assigned_employees ?? '—'),
      sub: 'On active projects',
      icon: <Briefcase size={17} />,
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
    },
    {
      id: 'wf-kpi-available',
      label: 'Available',
      value: loading ? '—' : String(data?.available_employees ?? '—'),
      sub: 'Ready for deployment',
      icon: <UserCheck size={17} />,
      colorClass: 'text-green-700',
      bgClass: 'bg-green-50',
    },
    {
      id: 'wf-kpi-off-rotation',
      label: 'Off Rotation / Leave',
      value: loading ? '—' : String((data?.off_rotation ?? 0) + (data?.on_leave ?? 0) || '—'),
      sub: data ? `${data?.on_leave ?? 0} on leave, ${data?.off_rotation ?? 0} off rotation` : 'Loading...',
      icon: <RotateCcw size={17} />,
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map(kpi => (
        <div key={kpi.id} className="kpi-card cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="kpi-label">{kpi.label}</span>
            <div className={`w-7 h-7 rounded flex items-center justify-center ${kpi.bgClass} ${kpi.colorClass}`}>
              {kpi.icon}
            </div>
          </div>
          <div className="kpi-value">
            {loading ? <div className="h-7 w-10 bg-muted animate-pulse rounded" /> : kpi.value}
          </div>
          <span className="kpi-sub">{kpi.sub}</span>
        </div>
      ))}
    </div>
  );
}