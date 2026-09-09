'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, TrendingDown, RotateCcw, ChevronRight } from 'lucide-react';
import { getCriticalStockItems, getLowStockItems } from '@/lib/api';

interface StockItem {
  id?: string;
  item?: { id?: string; name?: string; item_number?: string } | string;
  item_name?: string;
  item_number?: string;
  sku?: string;
  available_quantity?: number;
  quantity_on_hand?: number;
  quantity?: number;
  unit?: { symbol?: string; name?: string } | string;
  daily_usage?: number;
  estimated_days_remaining?: number;
  lead_time_days?: number;
  store?: { name?: string } | string;
  store_name?: string;
  reorder_status?: string;
  criticality?: string;
  [key: string]: unknown;
}

function getItemName(item: StockItem): string {
  if (typeof item?.item === 'object' && item?.item?.name) return item.item.name;
  if (typeof item?.item === 'string') return item.item;
  return item?.item_name ?? '—';
}

function getItemSku(item: StockItem): string {
  if (typeof item?.item === 'object' && item?.item?.item_number) return item.item.item_number;
  return item?.item_number ?? item?.sku ?? '—';
}

function getUnit(item: StockItem): string {
  if (typeof item?.unit === 'object') return item.unit?.symbol ?? item.unit?.name ?? '';
  if (typeof item?.unit === 'string') return item.unit;
  return '';
}

function getStoreName(item: StockItem): string {
  if (typeof item?.store === 'object' && item?.store?.name) return item.store.name;
  if (typeof item?.store === 'string') return item.store;
  return item?.store_name ?? '—';
}

function getOnHand(item: StockItem): number {
  return item?.available_quantity ?? item?.quantity_on_hand ?? item?.quantity ?? 0;
}

type FilterId = 'filter-all' | 'filter-critical' | 'filter-low' | 'filter-reorder';

export default function CriticalActionRequired() {
  const [criticalItems, setCriticalItems] = useState<StockItem[]>([]);
  const [lowItems, setLowItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterId>('filter-all');

  useEffect(() => {
    Promise.allSettled([
      getCriticalStockItems({ page_size: '20' } as Record<string, string>),
      getLowStockItems({ page_size: '20' } as Record<string, string>),
    ]).then(([crit, low]) => {
      setCriticalItems(crit.status === 'fulfilled' ? (crit.value as StockItem[]) : []);
      setLowItems(low.status === 'fulfilled' ? (low.value as StockItem[]) : []);
    }).finally(() => setLoading(false));
  }, []);

  // Merge and deduplicate
  const allItems: (StockItem & { _severity: 'CRITICAL' | 'LOW' })[] = [
    ...criticalItems.map(i => ({ ...i, _severity: 'CRITICAL' as const })),
    ...lowItems
      .filter(l => !criticalItems.some(c => c?.id === l?.id))
      .map(i => ({ ...i, _severity: 'LOW' as const })),
  ];

  const filtered = allItems.filter(item => {
    if (activeFilter === 'filter-all') return true;
    if (activeFilter === 'filter-critical') return item._severity === 'CRITICAL';
    if (activeFilter === 'filter-low') return item._severity === 'LOW';
    if (activeFilter === 'filter-reorder') return item?.reorder_status === 'REORDER';
    return true;
  });

  const filterTabs: { id: FilterId; label: string; count: number }[] = [
    { id: 'filter-all', label: 'All', count: allItems.length },
    { id: 'filter-critical', label: 'Critical', count: criticalItems.length },
    { id: 'filter-low', label: 'Low Stock', count: lowItems.filter(l => !criticalItems.some(c => c?.id === l?.id)).length },
    { id: 'filter-reorder', label: 'Reorder', count: allItems.filter(i => i?.reorder_status === 'REORDER').length },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-accent" />
          <span className="text-sm font-700 text-foreground">Action Required</span>
        </div>
        <div className="flex items-center gap-1">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-600 transition-colors ${
                activeFilter === tab.id ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
              <span className={`text-2xs rounded-full px-1 ${activeFilter === tab.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3.5">
              <div className="h-4 bg-muted animate-pulse rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No items requiring attention.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((item, idx) => {
            const onHand = getOnHand(item);
            const unit = getUnit(item);
            const days = item?.estimated_days_remaining;
            const leadTime = item?.lead_time_days;
            const daysUrgent = days !== undefined && leadTime !== undefined && days < leadTime;
            const isCritical = item._severity === 'CRITICAL';
            return (
              <div key={item?.id ?? idx} className="px-4 py-3.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 ${isCritical ? 'text-red-500' : 'text-amber-500'}`}>
                    {isCritical ? <AlertTriangle size={14} /> : <TrendingDown size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-700 text-foreground">{getItemName(item)}</span>
                      <span className={`badge ${isCritical ? 'badge-critical' : 'badge-warning'}`}>{item._severity}</span>
                      {daysUrgent && (
                        <span className="badge badge-critical">
                          <AlertTriangle size={9} /> Lead time exceeded
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="tabular-nums">
                        <span className="font-600 text-foreground">{onHand} {unit}</span> remaining
                      </span>
                      {item?.daily_usage !== undefined && (
                        <span className="tabular-nums">{item.daily_usage} {unit}/day usage</span>
                      )}
                      {days !== undefined && (
                        <span className={`font-600 tabular-nums ${days <= 10 ? 'text-red-600' : 'text-amber-600'}`}>
                          ~{days} days left
                        </span>
                      )}
                      {leadTime !== undefined && <span>Lead time: {leadTime}d</span>}
                      <span className="text-muted-foreground">{getStoreName(item)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href="/inventory-overview" className="btn-ghost text-xs py-1 px-2">View</Link>
                    <button className="btn-accent text-xs py-1 px-2.5">
                      <RotateCcw size={12} />
                      Reorder
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Showing {filtered.length} items requiring attention</span>
        <Link href="/inventory-overview" className="text-xs text-primary font-600 hover:underline flex items-center gap-1">
          View Forecast & Reorder Center <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}