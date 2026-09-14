'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Clock, AlertTriangle, Settings, XCircle, BarChart2 } from 'lucide-react';
import { getFleetDashboard, type FleetDashboard } from '@/lib/api';

export default function FleetKPIGrid({
  statusFilter,
  categoryId,
  locationId,
  projectId,
  dateFrom,
  dateTo,
}: {
  statusFilter?: string;
  categoryId?: string;
  locationId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [data, setData] = useState<FleetDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = React.useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (categoryId) params.category_id = categoryId;
    if (locationId) params.location_id = locationId;
    if (projectId) params.project_id = projectId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    getFleetDashboard(params)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to connect to backend.');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [statusFilter, categoryId, locationId, projectId, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kpis = [
    {
      id: 'fleet-kpi-total',
      label: 'Total Fleet',
      value: loading ? '—' : String(data?.total ?? data?.total_assets ?? 0),
      sub: 'All registered assets',
      icon: <BarChart2 size={17} />,
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
      isAlert: false,
    },
    {
      id: 'fleet-kpi-operating',
      label: 'Operating',
      value: loading ? '—' : String(data?.operating ?? data?.operating_assets ?? 0),
      sub: 'On active assignments',
      icon: <CheckCircle size={17} />,
      colorClass: 'text-green-700',
      bgClass: 'bg-green-50',
      isAlert: false,
    },
    {
      id: 'fleet-kpi-available',
      label: 'Available',
      value: loading ? '—' : String(data?.available ?? data?.available_assets ?? 0),
      sub: 'Ready for deployment',
      icon: <CheckCircle size={17} />,
      colorClass: 'text-green-700',
      bgClass: 'bg-green-50',
      isAlert: false,
    },
    {
      id: 'fleet-kpi-standby',
      label: 'Standby',
      value: loading ? '—' : String(data?.standby ?? data?.standby_assets ?? 0),
      sub: 'Awaiting mobilization',
      icon: <Clock size={17} />,
      colorClass: 'text-muted-foreground',
      bgClass: 'bg-muted',
      isAlert: false,
    },
    {
      id: 'fleet-kpi-breakdown',
      label: 'Breakdown',
      value: loading ? '—' : String(data?.breakdown ?? data?.breakdown_assets ?? 0),
      sub: 'Requires attention',
      icon: <AlertTriangle size={17} />,
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
      isAlert: true,
    },
    {
      id: 'fleet-kpi-maintenance',
      label: 'Maintenance',
      value: loading ? '—' : String(data?.under_maintenance ?? data?.maintenance_assets ?? 0),
      sub: 'Scheduled service',
      icon: <Settings size={17} />,
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
      isAlert: false,
    },
    {
      id: 'fleet-kpi-oos',
      label: 'Out of Service',
      value: loading ? '—' : String(data?.out_of_service ?? data?.out_of_service_assets ?? 0),
      sub: 'Pending disposition',
      icon: <XCircle size={17} />,
      colorClass: 'text-red-600',
    },
  ];

  if (error && !loading) {
    return (
      <div className="card p-4 flex items-center justify-between bg-red-50/50 border border-red-200 text-xs text-red-700">
        <span>Failed to load fleet dashboard stats: {error}</span>
        <button
          type="button"
          onClick={loadData}
          className="px-3 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 2xl:grid-cols-7 gap-4">
      {kpis.map(kpi => (
        <div
          key={kpi.id}
          className={`kpi-card cursor-pointer ${kpi.isAlert ? 'border-red-200 bg-red-50/40' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="kpi-label">{kpi.label}</span>
            <div className={`w-7 h-7 rounded flex items-center justify-center ${kpi.bgClass} ${kpi.colorClass}`}>
              {kpi.icon}
            </div>
          </div>
          <div className={`kpi-value-sm ${kpi.isAlert ? 'text-red-600' : ''}`}>
            {loading ? <div className="h-6 w-8 bg-muted animate-pulse rounded" /> : kpi.value}
          </div>
          <span className="kpi-sub">{kpi.sub}</span>
        </div>
      ))}
    </div>
  );
}