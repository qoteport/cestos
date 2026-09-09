'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, AlertTriangle } from 'lucide-react';
import { getProjects, getProjectInventorySummary } from '@/lib/api';

interface InventoryItem {
  id?: string;
  item?: { name?: string; item_number?: string } | string;
  item_name?: string;
  item_number?: string;
  category?: { name?: string } | string;
  category_name?: string;
  quantity_on_hand?: number;
  available_quantity?: number;
  consumed_quantity?: number;
  unit?: { symbol?: string; name?: string } | string;
  reorder_status?: string;
  status?: string;
  [key: string]: unknown;
}

function getItemName(item: InventoryItem): string {
  if (typeof item?.item === 'object' && item?.item?.name) return item.item.name;
  if (typeof item?.item === 'string') return item.item;
  return item?.item_name ?? '—';
}

function getItemNo(item: InventoryItem): string {
  if (typeof item?.item === 'object' && item?.item?.item_number) return item.item.item_number;
  return item?.item_number ?? '—';
}

function getCategoryName(cat: InventoryItem['category'], catName?: string): string {
  if (typeof cat === 'object' && cat?.name) return cat.name;
  if (typeof cat === 'string') return cat;
  return catName ?? '—';
}

function getUnit(item: InventoryItem): string {
  if (typeof item?.unit === 'object') return item.unit?.symbol ?? item.unit?.name ?? '';
  if (typeof item?.unit === 'string') return item.unit;
  return '';
}

function getQty(item: InventoryItem): string {
  const qty = item?.available_quantity ?? item?.quantity_on_hand;
  if (qty === undefined) return '—';
  return `${qty} ${getUnit(item)}`.trim();
}

function getConsumed(item: InventoryItem): string {
  const qty = item?.consumed_quantity;
  if (qty === undefined) return '—';
  return `${qty} ${getUnit(item)}`.trim();
}

function getStatusInfo(item: InventoryItem): { label: string; cls: string } {
  const status = item?.reorder_status ?? item?.status ?? '';
  switch (status.toUpperCase()) {
    case 'CRITICAL': return { label: 'CRITICAL', cls: 'badge-critical' };
    case 'LOW': return { label: 'LOW', cls: 'badge-warning' };
    case 'REORDER': return { label: 'REORDER', cls: 'badge-neutral' };
    case 'OK': return { label: 'OK', cls: 'badge-available' };
    default: return { label: status || 'OK', cls: 'badge-available' };
  }
}

export default function ProjectInventoryTab() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState<string>('Project Store');

  useEffect(() => {
    getProjects({ status: 'ACTIVE', page_size: '1' })
      .then(async res => {
        const first = res?.items?.[0];
        if (first?.id) {
          const summary = await getProjectInventorySummary(first.id);
          const data = summary as Record<string, unknown>;
          const invItems = (data?.items ?? data?.stock ?? data?.inventory ?? []) as InventoryItem[];
          setItems(invItems);
          if (data?.store_name) setStoreName(data.store_name as string);
          else if (first?.name) setStoreName(`${first.name} Store`);
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const alertCount = items.filter(i => {
    const s = (i?.reorder_status ?? i?.status ?? '').toUpperCase();
    return s === 'CRITICAL' || s === 'LOW';
  }).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-primary" />
          <span className="text-sm font-700 text-foreground">{storeName}</span>
          {alertCount > 0 && (
            <span className="badge badge-warning">
              <AlertTriangle size={10} />
              {alertCount} low/critical
            </span>
          )}
        </div>
        <Link href="/inventory-overview" className="text-xs text-primary font-600 hover:underline">
          View Full Inventory →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No inventory data available for this project.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Item No.</th>
                <th>Category</th>
                <th>On Hand</th>
                <th>Consumed (30d)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv, idx) => {
                const statusInfo = getStatusInfo(inv);
                return (
                  <tr key={inv?.id ?? idx}>
                    <td>
                      <Link href="/inventory-overview" className="entity-link text-sm font-600">{getItemName(inv)}</Link>
                    </td>
                    <td className="text-xs text-muted-foreground tabular-nums">{getItemNo(inv)}</td>
                    <td className="text-xs text-muted-foreground">{getCategoryName(inv?.category, inv?.category_name)}</td>
                    <td className="text-sm tabular-nums font-600 text-foreground">{getQty(inv)}</td>
                    <td className="text-sm tabular-nums text-muted-foreground">{getConsumed(inv)}</td>
                    <td><span className={`badge ${statusInfo.cls}`}>{statusInfo.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <button className="btn-primary text-xs py-1.5">Request Items</button>
        <button className="btn-secondary text-xs py-1.5">View Transactions</button>
      </div>
    </div>
  );
}