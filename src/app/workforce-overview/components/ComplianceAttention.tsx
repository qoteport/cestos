'use client';

import React, { useEffect, useState } from 'react';
import { Shield, FileWarning, GraduationCap, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getExpiringLicenses, getExpiringTraining, getExpiringEmployeeDocuments } from '@/lib/api';

interface ExpiringItem {
  id?: string;
  employee?: { full_name?: string; first_name?: string; last_name?: string };
  employee_name?: string;
  expiry_date?: string;
  expires_on?: string;
  license_type?: string;
  training_name?: string;
  document_type?: string;
  name?: string;
  days_until_expiry?: number;
  [key: string]: unknown;
}

function getEmpName(item: ExpiringItem): string {
  if (item?.employee?.full_name) return item.employee.full_name;
  if (item?.employee?.first_name || item?.employee?.last_name)
    return `${item.employee?.first_name ?? ''} ${item.employee?.last_name ?? ''}`.trim();
  return item?.employee_name ?? '—';
}

function getDays(item: ExpiringItem): number {
  if (typeof item?.days_until_expiry === 'number') return item.days_until_expiry;
  const d = item?.expiry_date ?? item?.expires_on;
  if (!d) return 0;
  return Math.max(0, Math.ceil((new Date(d as string).getTime() - Date.now()) / 86400000));
}

export default function ComplianceAttention() {
  const [licenses, setLicenses] = useState<ExpiringItem[]>([]);
  const [training, setTraining] = useState<ExpiringItem[]>([]);
  const [documents, setDocuments] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getExpiringLicenses(30),
      getExpiringTraining(30),
      getExpiringEmployeeDocuments(30),
    ]).then(([lic, trn, doc]) => {
      setLicenses(lic.status === 'fulfilled' ? (lic.value as ExpiringItem[]) : []);
      setTraining(trn.status === 'fulfilled' ? (trn.value as ExpiringItem[]) : []);
      setDocuments(doc.status === 'fulfilled' ? (doc.value as ExpiringItem[]) : []);
    }).finally(() => setLoading(false));
  }, []);

  const sections = [
    {
      id: 'comp-licenses',
      icon: <Shield size={16} />,
      iconBg: 'bg-amber-50 text-amber-600',
      title: `${licenses.length} Licence${licenses.length !== 1 ? 's' : ''} Expiring`,
      sub: 'Within 30 days',
      items: licenses,
      labelFn: (item: ExpiringItem) => `${item?.license_type ?? item?.name ?? 'Licence'} — ${getEmpName(item)} (${getDays(item)}d)`,
      href: '/workforce-overview',
      severity: 'warning',
    },
    {
      id: 'comp-training',
      icon: <GraduationCap size={16} />,
      iconBg: 'bg-amber-50 text-amber-600',
      title: `${training.length} Training Cert${training.length !== 1 ? 's' : ''} Expiring`,
      sub: 'Within 30 days',
      items: training,
      labelFn: (item: ExpiringItem) => `${item?.training_name ?? item?.name ?? 'Training'} — ${getEmpName(item)} (${getDays(item)}d)`,
      href: '/workforce-overview',
      severity: 'warning',
    },
    {
      id: 'comp-documents',
      icon: <FileWarning size={16} />,
      iconBg: 'bg-red-50 text-red-600',
      title: `${documents.length} Document${documents.length !== 1 ? 's' : ''} Expiring`,
      sub: 'Passports and work permits',
      items: documents,
      labelFn: (item: ExpiringItem) => `${item?.document_type ?? item?.name ?? 'Document'} — ${getEmpName(item)} (${getDays(item)}d)`,
      href: '/workforce-overview',
      severity: 'critical',
    },
  ];

  if (loading) {
    return (
      <div className="card h-fit">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Shield size={15} className="text-accent" />
          <span className="text-sm font-700 text-foreground">Compliance Attention</span>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-4">
              <div className="h-4 bg-muted animate-pulse rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card h-fit">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Shield size={15} className="text-accent" />
        <span className="text-sm font-700 text-foreground">Compliance Attention</span>
      </div>
      <div className="divide-y divide-border">
        {sections.map(section => (
          <div key={section.id} className="px-4 py-4">
            <div className="flex items-start gap-3 mb-2">
              <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${section.iconBg}`}>
                {section.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-700 text-foreground">{section.title}</p>
                <p className="text-xs text-muted-foreground">{section.sub}</p>
              </div>
            </div>
            {section.items.length > 0 && (
              <div className="ml-11 space-y-1">
                {section.items.slice(0, 2).map((item, idx) => (
                  <p key={item?.id ?? idx} className={`text-xs font-500 ${section.severity === 'critical' ? 'text-red-600' : 'text-amber-700'}`}>
                    {section.labelFn(item)}
                  </p>
                ))}
                {section.items.length > 2 && (
                  <p className="text-xs text-muted-foreground">+{section.items.length - 2} more</p>
                )}
              </div>
            )}
            {section.items.length === 0 && (
              <p className="ml-11 text-xs text-muted-foreground">None expiring in the next 30 days.</p>
            )}
            <div className="ml-11 mt-2">
              <Link href={section.href} className="text-xs text-primary font-600 hover:underline flex items-center gap-0.5">
                Review <ChevronRight size={11} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}