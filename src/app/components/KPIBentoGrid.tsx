'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Wrench,
  FolderKanban,
  AlertTriangle,
  UserCheck,
  Package,
  Activity,
  Target,
} from 'lucide-react';
import { apiFetch, getOperationsSummary, type OperationsSummary } from '@/lib/api';

interface DrillingMetricsSummary {
  metres?: number;
  drill_holes?: number;
}

export default function KPIBentoGrid({
  timeframe,
  dateFrom,
  dateTo,
  projectId,
  status,
}: {
  timeframe?: string;
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
  status?: string;
}) {
  const [data, setData] = useState<OperationsSummary | null>(null);
  const [drilling, setDrilling] = useState<DrillingMetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const opsParams: Record<string, string> = {};
    if (projectId) opsParams.project_id = projectId;
    if (status) opsParams.status = status;
    if (dateFrom) opsParams.date_from = dateFrom;
    if (dateTo) opsParams.date_to = dateTo;

    const drillParams = new URLSearchParams();
    if (projectId) drillParams.set('project_id', projectId);
    if (status) drillParams.set('status', status);
    if (dateFrom) drillParams.set('date_from', dateFrom);
    if (dateTo) drillParams.set('date_to', dateTo);

    const drillUrl = projectId
      ? `/api/v1/projects/${projectId}/report-metrics`
      : `/api/v1/projects/dashboard-summary?${drillParams.toString()}`;

    Promise.all([
      getOperationsSummary(opsParams),
      apiFetch<DrillingMetricsSummary>(drillUrl),
    ])
      .then(([opsRes, drillRes]) => {
        if (!active) return;
        setData(opsRes);
        setDrilling(drillRes);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Unable to load dashboard metrics.');
        setData(null);
        setDrilling(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [timeframe, dateFrom, dateTo, projectId, status, refresh]);

  const activeProjects = data?.projects?.active ?? data?.active_projects;
  const activeEmployees = data?.employees?.active ?? data?.active_employees;
  const operatingAssets = data?.assets?.operating ?? data?.operating_assets;
  const availablePeople = data?.available_employees;
  const availableAssets = data?.assets?.available ?? data?.available_assets;
  const breakdowns = data?.assets?.breakdown ?? data?.breakdowns;

  const metresDrilled = drilling?.metres != null ? Number(drilling.metres).toLocaleString() : '0';
  const completedHoles =
    drilling?.drill_holes != null ? Number(drilling.drill_holes).toLocaleString() : '0';

  const kpiCards = [
    {
      id: 'kpi-active-projects',
      label: 'Active Projects',
      value: loading ? '—' : String(activeProjects ?? 0),
      sub: 'Across all operational regions',
      icon: <FolderKanban size={17} />,
      href: '/projects-overview',
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
      isAlert: false,
    },
    {
      id: 'kpi-active-employees',
      label: 'Active Workforce',
      value: loading ? '—' : String(activeEmployees ?? 0),
      sub: `${data?.employees?.assigned ?? 0} with active assignments`,
      icon: <Users size={17} />,
      href: '/workforce-overview',
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
      isAlert: false,
    },
    {
      id: 'kpi-operating-assets',
      label: 'Operating Assets',
      value: loading ? '—' : String(operatingAssets ?? 0),
      sub: `${data?.assets?.maintenance ?? 0} currently in maintenance`,
      icon: <Wrench size={17} />,
      href: '/fleet-dashboard',
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
      isAlert: false,
    },
    {
      id: 'kpi-metres-drilled',
      label: 'Metres Drilled',
      value: loading ? '—' : metresDrilled,
      sub: 'Cumulative reported metres',
      icon: <Activity size={17} />,
      href: '/projects-overview',
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
      isAlert: false,
    },
    {
      id: 'kpi-drill-holes',
      label: 'Completed Holes',
      value: loading ? '—' : completedHoles,
      sub: 'Production drill holes',
      icon: <Target size={17} />,
      href: '/projects-overview',
      colorClass: 'text-purple-700',
      bgClass: 'bg-purple-50',
      isAlert: false,
    },
    {
      id: 'kpi-available-people',
      label: 'Available People',
      value: loading ? '—' : String(availablePeople ?? 0),
      sub: 'Ready for assignment',
      icon: <UserCheck size={17} />,
      href: '/workforce-overview',
      colorClass: 'text-green-700',
      bgClass: 'bg-green-50',
      isAlert: false,
    },
    {
      id: 'kpi-available-assets',
      label: 'Available Assets',
      value: loading ? '—' : String(availableAssets ?? 0),
      sub: 'Ready for deployment',
      icon: <Package size={17} />,
      href: '/fleet-dashboard',
      colorClass: 'text-green-700',
      bgClass: 'bg-green-50',
      isAlert: false,
    },
    {
      id: 'kpi-breakdowns',
      label: 'Fleet Breakdowns',
      value: loading ? '—' : String(breakdowns ?? 0),
      sub: 'Requires urgent maintenance',
      icon: <AlertTriangle size={17} />,
      href: '/fleet-dashboard',
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
      isAlert: true,
    },
  ];

  if (error)
    return (
      <div className="card p-5" role="alert">
        <p className="text-sm text-red-700">{error}</p>
        <button className="btn-secondary mt-3" onClick={() => setRefresh((value) => value + 1)}>
          Retry dashboard metrics
        </button>
      </div>
    );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {kpiCards.map((card) => (
        <Link
          key={card.id}
          href={card.href}
          className={`kpi-card group cursor-pointer ${card.isAlert ? 'border-red-200 bg-red-50/50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="kpi-label">{card.label}</span>
            <div
              className={`w-7 h-7 rounded flex items-center justify-center ${card.bgClass} ${card.colorClass}`}
            >
              {card.icon}
            </div>
          </div>
          <div className={`kpi-value ${card.isAlert ? 'text-red-600' : ''}`}>
            {loading ? <div className="h-7 w-12 bg-muted animate-pulse rounded" /> : card.value}
          </div>
          <span className="kpi-sub">{card.sub}</span>
        </Link>
      ))}
    </div>
  );
}
