'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileWarning, Shield, Package, ClipboardList, ChevronRight } from 'lucide-react';
import { getOperationsSummary, type OperationsSummary } from '@/lib/api';

export default function NeedsAttentionPanel() {
  const [data, setData] = useState<OperationsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOperationsSummary()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const attentionItems = data
    ? [
        data.critical_defects && Number(data.critical_defects) > 0
          ? {
              id: 'attn-defects',
              icon: <AlertTriangle size={15} />,
              text: `${data.critical_defects} critical equipment defect${Number(data.critical_defects) !== 1 ? 's' : ''}`,
              sub: 'Requires immediate attention',
              severity: 'critical',
              href: '/fleet-dashboard',
              actionLabel: 'View Defects',
            }
          : null,
        data.expiring_employee_documents && Number(data.expiring_employee_documents) > 0
          ? {
              id: 'attn-emp-docs',
              icon: <FileWarning size={15} />,
              text: `${data.expiring_employee_documents} employee document${Number(data.expiring_employee_documents) !== 1 ? 's' : ''} expiring`,
              sub: 'Within 30 days — passports, work permits',
              severity: 'warning',
              href: '/workforce-overview',
              actionLabel: 'Review',
            }
          : null,
        data.expiring_equipment_registrations && Number(data.expiring_equipment_registrations) > 0
          ? {
              id: 'attn-registrations',
              icon: <Shield size={15} />,
              text: `${data.expiring_equipment_registrations} equipment registration${Number(data.expiring_equipment_registrations) !== 1 ? 's' : ''} expiring`,
              sub: 'Within 30 days',
              severity: 'warning',
              href: '/fleet-dashboard',
              actionLabel: 'Review',
            }
          : null,
        data.critical_stock_items && Number(data.critical_stock_items) > 0
          ? {
              id: 'attn-low-stock',
              icon: <Package size={15} />,
              text: `${data.critical_stock_items} inventory item${Number(data.critical_stock_items) !== 1 ? 's' : ''} below critical stock`,
              sub: 'Immediate reorder recommended',
              severity: 'warning',
              href: '/inventory-overview',
              actionLabel: 'View Items',
            }
          : null,
        data.pending_inventory_requests && Number(data.pending_inventory_requests) > 0
          ? {
              id: 'attn-requests',
              icon: <ClipboardList size={15} />,
              text: `${data.pending_inventory_requests} inventory request${Number(data.pending_inventory_requests) !== 1 ? 's' : ''} pending approval`,
              sub: 'Awaiting your review',
              severity: 'info',
              href: '/inventory-overview',
              actionLabel: 'Approve',
            }
          : null,
      ].filter(Boolean)
    : [];

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <AlertTriangle size={15} className="text-accent" />
          <span className="text-sm font-700 text-foreground">Needs Attention</span>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3 flex gap-3 items-center">
              <div className="w-4 h-4 bg-muted animate-pulse rounded" />
              <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!attentionItems.length) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <AlertTriangle size={15} className="text-accent" />
          <span className="text-sm font-700 text-foreground">Needs Attention</span>
        </div>
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          No items requiring attention right now.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-accent" />
          <span className="text-sm font-700 text-foreground">Needs Attention</span>
        </div>
        <span className="badge badge-critical">{attentionItems.length} items</span>
      </div>
      <div className="divide-y divide-border">
        {attentionItems.map(item => item && (
          <div
            key={item.id}
            className={`attention-item ${
              item.severity === 'critical' ? 'attention-critical' : item.severity === 'warning' ? 'attention-warning' : 'attention-info'
            }`}
          >
            <div className={`flex-shrink-0 ${
              item.severity === 'critical' ? 'text-red-500' : item.severity === 'warning' ? 'text-amber-500' : 'text-primary'
            }`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-600 text-foreground">{item.text}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
            </div>
            <Link
              href={item.href}
              className="flex items-center gap-1 text-xs font-600 text-primary hover:text-primary/80 flex-shrink-0 transition-colors"
            >
              {item.actionLabel}
              <ChevronRight size={12} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}