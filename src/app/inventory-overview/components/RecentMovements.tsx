'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, RotateCcw } from 'lucide-react';
import { getInventoryTransactions } from '@/lib/api';

interface Transaction {
  id?: string;
  created_at?: string;
  transaction_date?: string;
  transaction_type?: string;
  type?: string;
  item?: { name?: string } | string;
  item_name?: string;
  quantity?: number;
  quantity_change?: number;
  unit?: { symbol?: string; name?: string } | string;
  from_store?: { name?: string } | string;
  to_store?: { name?: string } | string;
  store?: { name?: string } | string;
  store_name?: string;
  [key: string]: unknown;
}

function getTypeInfo(type?: string): { label: string; typeClass: string; icon: React.ReactNode; qtyClass: string } {
  switch (type?.toUpperCase()) {
    case 'RECEIPT': case'RECEIVE':
      return { label: 'RECEIPT', typeClass: 'text-green-600 bg-green-50', icon: <ArrowDownCircle size={13} />, qtyClass: 'text-green-700' };
    case 'ISSUE':
      return { label: 'ISSUE', typeClass: 'text-red-600 bg-red-50', icon: <ArrowUpCircle size={13} />, qtyClass: 'text-red-600' };
    case 'TRANSFER':
      return { label: 'TRANSFER', typeClass: 'text-blue-600 bg-blue-50', icon: <ArrowLeftRight size={13} />, qtyClass: 'text-primary' };
    case 'RETURN':
      return { label: 'RETURN', typeClass: 'text-purple-600 bg-purple-50', icon: <RotateCcw size={13} />, qtyClass: 'text-purple-600' };
    case 'ADJUSTMENT':
      return { label: 'ADJUST', typeClass: 'text-amber-600 bg-amber-50', icon: <RotateCcw size={13} />, qtyClass: 'text-amber-600' };
    default:
      return { label: type ?? 'TXN', typeClass: 'text-muted-foreground bg-muted', icon: <ArrowLeftRight size={13} />, qtyClass: 'text-foreground' };
  }
}

function getItemName(txn: Transaction): string {
  if (typeof txn?.item === 'object' && txn?.item?.name) return txn.item.name;
  if (typeof txn?.item === 'string') return txn.item;
  return txn?.item_name ?? '—';
}

function getStoreName(txn: Transaction): string {
  const from = typeof txn?.from_store === 'object' ? txn.from_store?.name : txn?.from_store;
  const to = typeof txn?.to_store === 'object' ? txn.to_store?.name : txn?.to_store;
  if (from && to) return `${from} → ${to}`;
  const store = typeof txn?.store === 'object' ? txn.store?.name : txn?.store;
  return store ?? txn?.store_name ?? '—';
}

function getQtyDisplay(txn: Transaction, typeInfo: ReturnType<typeof getTypeInfo>): string {
  const qty = txn?.quantity ?? txn?.quantity_change;
  if (qty === undefined || qty === null) return '—';
  const unit = typeof txn?.unit === 'object' ? txn.unit?.symbol ?? txn.unit?.name : txn?.unit;
  const prefix = typeInfo.label === 'ISSUE' ? '-' : typeInfo.label === 'RECEIPT' || typeInfo.label === 'RETURN' ? '+' : '';
  return `${prefix}${Math.abs(Number(qty))}${unit ? ' ' + unit : ''}`;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

export default function RecentMovements() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInventoryTransactions({ page_size: '10', page: '1' })
      .then(res => setTransactions((res?.items as Transaction[]) ?? []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card h-fit">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-700 text-foreground">Recent Movements</span>
        <span className="text-2xs text-muted-foreground">Latest transactions</span>
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-6 h-6 bg-muted animate-pulse rounded-full" />
              <div className="flex-1">
                <div className="h-3 bg-muted animate-pulse rounded w-3/4 mb-1" />
                <div className="h-2.5 bg-muted animate-pulse rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          No recent transactions found.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {transactions.map((txn, idx) => {
            const type = txn?.transaction_type ?? txn?.type;
            const typeInfo = getTypeInfo(type);
            const dateStr = txn?.transaction_date ?? txn?.created_at;
            return (
              <div key={txn?.id ?? idx} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${typeInfo.typeClass}`}>
                  {typeInfo.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-600 text-foreground truncate">{getItemName(txn)}</p>
                  <p className="text-2xs text-muted-foreground truncate">{getStoreName(txn)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs font-700 tabular-nums ${typeInfo.qtyClass}`}>{getQtyDisplay(txn, typeInfo)}</p>
                  <p className="text-2xs text-muted-foreground">{formatTime(dateStr)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-border">
        <button className="text-xs text-primary font-600 hover:underline">View transaction ledger</button>
      </div>
    </div>
  );
}