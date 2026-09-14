'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingDown, XCircle, AlertTriangle, ClipboardList, Truck, Shield, RotateCcw } from 'lucide-react';
import { getInventoryDashboard, type InventoryDashboard } from '@/lib/api';

export default function InventoryKPIGrid({
  storeId,
  categoryId,
  supplierId,
  projectId,
  dateFrom,
  dateTo,
}: {
  storeId?: string;
  categoryId?: string;
  supplierId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [data, setData] = useState<InventoryDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (storeId) params.store_id = storeId;
    if (categoryId) params.category_id = categoryId;
    if (supplierId) params.supplier_id = supplierId;
    if (projectId) params.project_id = projectId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    getInventoryDashboard(params)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [storeId, categoryId, supplierId, projectId, dateFrom, dateTo]);

  const formatValue = (val: number | string | undefined | null): string => {
    if (val === undefined || val === null) return '—';
    return String(val);
  };

  const formatCurrency = (val: number | string | undefined | null): string => {
    if (val === undefined || val === null) return '—';
    const num = Number(val);
    if (isNaN(num)) return '—';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toLocaleString()}`;
  };

  const kpiCards = [
    {
      id: 'inv-kpi-value',
      label: 'Inventory Value',
      value: loading ? '—' : formatCurrency(data?.total_inventory_value ?? data?.total_value),
      sub: 'Across all stores',
      icon: <DollarSign size={17} />,
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
      isAlert: false,
    },
    {
      id: 'inv-kpi-low',
      label: 'Low Stock',
      value: loading ? '—' : formatValue(data?.low_stock_items ?? data?.low_stock_count),
      sub: 'Items below reorder point',
      icon: <TrendingDown size={17} />,
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
      isAlert: false,
    },
    {
      id: 'inv-kpi-out',
      label: 'Out of Stock',
      value: loading ? '—' : formatValue(data?.out_of_stock_items ?? data?.out_of_stock_count),
      sub: 'Zero quantity on hand',
      icon: <XCircle size={17} />,
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
      isAlert: true,
    },
    {
      id: 'inv-kpi-critical',
      label: 'Critical Items',
      value: loading ? '—' : formatValue(data?.critical_stock_items ?? data?.critical_stock_count),
      sub: 'Below critical threshold',
      icon: <AlertTriangle size={17} />,
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
      isAlert: true,
    },
    {
      id: 'inv-kpi-requests',
      label: 'Pending Requests',
      value: loading ? '—' : formatValue(data?.pending_requests),
      sub: 'Awaiting approval',
      icon: <ClipboardList size={17} />,
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
      isAlert: false,
    },
    {
      id: 'inv-kpi-transit',
      label: 'In Transit',
      value: loading ? '—' : formatValue(data?.in_transit_transfers),
      sub: 'Active transfers',
      icon: <Truck size={17} />,
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
      isAlert: false,
    },
    {
      id: 'inv-kpi-quarantine',
      label: 'Quarantined',
      value: loading ? '—' : formatValue(data?.quarantined_items ?? data?.quarantined_count),
      sub: 'Pending disposition',
      icon: <Shield size={17} />,
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
      isAlert: false,
    },
    {
      id: 'inv-kpi-reorder',
      label: 'Reorder Required',
      value: loading ? '—' : formatValue(data?.items_requiring_reorder ?? data?.reorder_required),
      sub: 'Recommended orders',
      icon: <RotateCcw size={17} />,
      colorClass: 'text-primary',
      bgClass: 'bg-secondary',
      isAlert: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
      {kpiCards.map(card => (
        <div
          key={card.id}
          className={`kpi-card cursor-pointer ${card.isAlert ? 'border-red-200 bg-red-50/40' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="kpi-label">{card.label}</span>
            <div className={`w-7 h-7 rounded flex items-center justify-center ${card.bgClass} ${card.colorClass}`}>
              {card.icon}
            </div>
          </div>
          <div className={`kpi-value-sm ${card.isAlert ? 'text-red-600' : ''}`}>
            {loading ? <div className="h-6 w-8 bg-muted animate-pulse rounded" /> : card.value}
          </div>
          <span className="kpi-sub">{card.sub}</span>
        </div>
      ))}
    </div>
  );
}