'use client';

import React, { useEffect, useState } from 'react';
import { Users, Wrench, MapPin, TrendingUp } from 'lucide-react';
import { getProjects, getProjectOverview, type ProjectOverview } from '@/lib/api';

export default function ProjectKPIStrip() {
  const [project, setProject] = useState<ProjectOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects({ status: 'ACTIVE', page_size: '1' })
      .then(async res => {
        const first = res?.items?.[0];
        if (first?.id) {
          const overview = await getProjectOverview(first.id);
          setProject(overview);
        }
      })
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, []);

  const empCount = project?.employee_count;
  const assetCount = project?.asset_count;
  const siteCount = project?.site_count;
  const targetMetres = (project as Record<string, unknown> | null)?.target_metres as number | undefined;
  const drilledMetres = (project as Record<string, unknown> | null)?.drilled_metres as number | undefined;
  const progress = targetMetres && drilledMetres ? Math.round((drilledMetres / targetMetres) * 100) : undefined;

  const kpis = [
    {
      id: 'pkpi-workforce',
      label: 'Workforce',
      value: loading ? '—' : String(empCount ?? '—'),
      sub: 'Assigned to project',
      icon: <Users size={16} />,
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
    },
    {
      id: 'pkpi-equipment',
      label: 'Equipment',
      value: loading ? '—' : String(assetCount ?? '—'),
      sub: 'Assigned assets',
      icon: <Wrench size={16} />,
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
    },
    {
      id: 'pkpi-sites',
      label: 'Sites',
      value: loading ? '—' : String(siteCount ?? '—'),
      sub: 'Active locations',
      icon: <MapPin size={16} />,
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
    },
    {
      id: 'pkpi-progress',
      label: 'Completion',
      value: loading ? '—' : (progress !== undefined ? `${progress}%` : '—'),
      sub: progress !== undefined ? (progress >= 50 ? 'On track' : 'In progress') : 'No data',
      icon: <TrendingUp size={16} />,
      colorClass: 'text-green-700',
      bgClass: 'bg-green-50',
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
          <div className="kpi-value-sm">
            {loading ? <div className="h-6 w-8 bg-muted animate-pulse rounded" /> : kpi.value}
          </div>
          <span className="kpi-sub">{kpi.sub}</span>
        </div>
      ))}
    </div>
  );
}