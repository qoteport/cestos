'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield, FileText, Activity } from 'lucide-react';
import Link from 'next/link';
import { getFleetDashboard, type FleetDashboard } from '@/lib/api';

export default function FleetAttentionPanel() {
  const [data, setData] = useState<FleetDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFleetDashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card h-fit">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <AlertTriangle size={15} className="text-accent" />
          <span className="text-sm font-700 text-foreground">Needs Attention</span>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="px-4 py-3.5">
              <div className="h-4 bg-muted animate-pulse rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sections = [
    {
      id: 'fleet-attn-defects',
      icon: <AlertTriangle size={15} />,
      iconColor: 'text-red-500',
      borderColor: 'border-red-400',
      title: `${data?.critical_defects ?? 0} Critical Defect${(data?.critical_defects ?? 0) !== 1 ? 's' : ''}`,
      count: data?.critical_defects ?? 0,
      href: '/fleet-dashboard',
    },
    {
      id: 'fleet-attn-insurance',
      icon: <Shield size={15} />,
      iconColor: 'text-amber-500',
      borderColor: 'border-amber-400',
      title: `${data?.expiring_insurance ?? 0} Insurance Expiring`,
      count: data?.expiring_insurance ?? 0,
      href: '/fleet-dashboard',
    },
    {
      id: 'fleet-attn-registrations',
      icon: <FileText size={15} />,
      iconColor: 'text-amber-500',
      borderColor: 'border-amber-400',
      title: `${data?.expiring_registrations ?? 0} Registrations Expiring`,
      count: data?.expiring_registrations ?? 0,
      href: '/fleet-dashboard',
    },
    {
      id: 'fleet-attn-meters',
      icon: <Activity size={15} />,
      iconColor: 'text-primary',
      borderColor: 'border-primary',
      title: `${data?.stale_meter_readings ?? 0} Stale Meter Readings`,
      count: data?.stale_meter_readings ?? 0,
      href: '/fleet-dashboard',
    },
  ].filter(s => s.count > 0);

  if (sections.length === 0) {
    return (
      <div className="card h-fit">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <AlertTriangle size={15} className="text-accent" />
          <span className="text-sm font-700 text-foreground">Needs Attention</span>
        </div>
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          No fleet items requiring attention.
        </div>
      </div>
    );
  }

  return (
    <div className="card h-fit">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <AlertTriangle size={15} className="text-accent" />
        <span className="text-sm font-700 text-foreground">Needs Attention</span>
      </div>
      <div className="divide-y divide-border">
        {sections.map(section => (
          <div key={section.id} className={`px-4 py-3.5 border-l-2 ${section.borderColor}`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 ${section.iconColor}`}>
                {section.icon}
                <span className="text-sm font-700 text-foreground">{section.title}</span>
              </div>
              <Link href={section.href} className="text-2xs text-primary font-600 hover:underline">
                Review →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}