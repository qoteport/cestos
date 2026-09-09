'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertTriangle, Settings, XCircle, BarChart2 } from 'lucide-react';
import { getFleetDashboard, type FleetDashboard } from '@/lib/api';

export default function FleetKPIGrid() {
  const [data, setData] = useState<FleetDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFleetDashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    {
      id: 'fleet-kpi-total',
      label: 'Total Fleet',
      value: loading ? '—' : String(data?.total ?? '—'),
      sub: 'All registered assets',
      icon: <BarChart2 size={17} />,
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
      isAlert: false,
    },
    {
      id: 'fleet-kpi-operating',
      label: 'Operating',
      value: loading ? '—' : String(data?.operating ?? '—'),
      sub: 'On active assignments',
      icon: <CheckCircle size={17} />,
      colorClass: 'text-green-700',
      bgClass: 'bg-green-50',
      isAlert: false,
    },
    {
      id: 'fleet-kpi-available',
      label: 'Available',
      value: loading ? '—' : String(data?.available ?? '—'),
      sub: 'Ready for deployment',
      icon: <CheckCircle size={17} />,
      colorClass: 'text-green-700',
      bgClass: 'bg-green-50',
      isAlert: false,
    },
    {
      id: 'fleet-kpi-standby',
      label: 'Standby',
      value: loading ? '—' : String(data?.standby ?? '—'),
      sub: 'Awaiting mobilization',
      icon: <Clock size={17} />,
      colorClass: 'text-muted-foreground',
      bgClass: 'bg-muted',
      isAlert: false,
    },
    {
      id: 'fleet-kpi-breakdown',
      label: 'Breakdown',
      value: loading ? '—' : String(data?.breakdown ?? '—'),
      sub: 'Requires attention',
      icon: <AlertTriangle size={17} />,
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
      isAlert: true,
    },
    {
      id: 'fleet-kpi-maintenance',
      label: 'Maintenance',
      value: loading ? '—' : String(data?.under_maintenance ?? '—'),
      sub: 'Scheduled service',
      icon: <Settings size={17} />,
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
      isAlert: false,
    },
    {
      id: 'fleet-kpi-oos',
      label: 'Out of Service',
      value: loading ? '—' : String(data?.out_of_service ?? '—'),
      sub: 'Pending disposition',
      icon: <XCircle size={17} />,
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
      isAlert: true,
    },
  ];

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