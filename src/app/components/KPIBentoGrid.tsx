'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Wrench, FolderKanban, AlertTriangle, UserCheck, Package } from 'lucide-react';
import { getOperationsSummary, type OperationsSummary } from '@/lib/api';

export default function KPIBentoGrid() {
  const [data, setData] = useState<OperationsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOperationsSummary()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const kpiCards = [
    {
      id: 'kpi-active-projects',
      label: 'Active Projects',
      value: loading ? '—' : String(data?.active_projects ?? '—'),
      sub: 'Across all regions',
      icon: <FolderKanban size={18} />,
      href: '/project-command-center',
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
      isAlert: false,
    },
    {
      id: 'kpi-active-employees',
      label: 'Active Employees',
      value: loading ? '—' : String(data?.active_employees ?? '—'),
      sub: 'On active projects',
      icon: <Users size={18} />,
      href: '/workforce-overview',
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
      isAlert: false,
    },
    {
      id: 'kpi-operating-assets',
      label: 'Operating Assets',
      value: loading ? '—' : String(data?.operating_assets ?? '—'),
      sub: 'On active assignments',
      icon: <Wrench size={18} />,
      href: '/fleet-dashboard',
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
      isAlert: false,
    },
    {
      id: 'kpi-available-people',
      label: 'Available People',
      value: loading ? '—' : String(data?.available_employees ?? '—'),
      sub: 'Ready for assignment',
      icon: <UserCheck size={18} />,
      href: '/workforce-overview',
      colorClass: 'text-green-700',
      bgClass: 'bg-green-50',
      isAlert: false,
    },
    {
      id: 'kpi-available-assets',
      label: 'Available Assets',
      value: loading ? '—' : String(data?.available_assets ?? '—'),
      sub: 'Ready for deployment',
      icon: <Package size={18} />,
      href: '/fleet-dashboard',
      colorClass: 'text-green-700',
      bgClass: 'bg-green-50',
      isAlert: false,
    },
    {
      id: 'kpi-breakdowns',
      label: 'Breakdowns',
      value: loading ? '—' : String(data?.breakdowns ?? '—'),
      sub: 'Requires attention',
      icon: <AlertTriangle size={18} />,
      href: '/fleet-dashboard',
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
      isAlert: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
      {kpiCards.map(card => (
        <Link
          key={card.id}
          href={card.href}
          className={`kpi-card group cursor-pointer ${card.isAlert ? 'border-red-200 bg-red-50/50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="kpi-label">{card.label}</span>
            <div className={`w-7 h-7 rounded flex items-center justify-center ${card.bgClass} ${card.colorClass}`}>
              {card.icon}
            </div>
          </div>
          <div className={`kpi-value ${card.isAlert ? 'text-red-600' : ''}`}>
            {loading ? (
              <div className="h-7 w-10 bg-muted animate-pulse rounded" />
            ) : (
              card.value
            )}
          </div>
          <span className="kpi-sub">{card.sub}</span>
        </Link>
      ))}
    </div>
  );
}