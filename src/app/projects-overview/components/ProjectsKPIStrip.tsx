'use client';

import React, { useEffect, useState } from 'react';
import { Layers, Activity, Clock, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ProjectsDashboardSummary {
  total?: number;
  by_status?: Record<string, number>;
  overdue?: number;
  without_recent_update?: number;
  [key: string]: unknown;
}

export default function ProjectsKPIStrip({
  statusFilter,
  clientId,
  locationId,
  dateFrom,
  dateTo,
}: {
  statusFilter?: string;
  clientId?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [data, setData] = useState<ProjectsDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (clientId) params.set('client_id', clientId);
    if (locationId) params.set('location_id', locationId);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    const qs = params.toString() ? `?${params.toString()}` : '';
    apiFetch<ProjectsDashboardSummary>(`/api/v1/projects/dashboard-summary${qs}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [statusFilter, clientId, locationId, dateFrom, dateTo]);

  const kpis = [
    {
      id: 'proj-kpi-total',
      label: 'Total Projects',
      value: loading ? '—' : String(data?.total ?? '—'),
      sub: data ? `${data?.by_status?.ACTIVE ?? 0} active, ${data?.by_status?.MOBILIZING ?? 0} mobilizing` : 'Loading...',
      icon: <Layers size={17} />,
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
    },
    {
      id: 'proj-kpi-active',
      label: 'Active Projects',
      value: loading ? '—' : String(data?.by_status?.ACTIVE ?? '—'),
      sub: 'Currently in progress',
      icon: <Activity size={17} />,
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
    },
    {
      id: 'proj-kpi-overdue',
      label: 'Past Expected End',
      value: loading ? '—' : String(data?.overdue ?? '—'),
      sub: 'Projects past deadline',
      icon: <AlertTriangle size={17} />,
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
    },
    {
      id: 'proj-kpi-stale',
      label: 'No Update (7 days)',
      value: loading ? '—' : String(data?.without_recent_update ?? '—'),
      sub: 'Active projects without recent update',
      icon: <Clock size={17} />,
      colorClass: 'text-red-700',
      bgClass: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map(kpi => (
        <div key={kpi.id} className="kpi-card">
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
