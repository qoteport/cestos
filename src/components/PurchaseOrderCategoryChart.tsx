'use client';

import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Layers } from 'lucide-react';
import { purchaseOrderCategoryLabel } from './PurchaseOrderCategoryField';

export default function PurchaseOrderCategoryChart({ orders, color = '#4f46e5' }: { orders: any[]; color?: string }) {
  const data = useMemo(() => {
    const totals = new Map<string, number>();
    for (const order of orders || []) {
      const category = purchaseOrderCategoryLabel(order.category);
      totals.set(category, (totals.get(category) || 0) + 1);
    }
    return [...totals.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [orders]);

  return (
    <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-3">
      <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Layers size={14} style={{ color }} /> Purchase Orders by Category
      </h4>
      {data.length ? (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 10 }}
                width={110}
                tickFormatter={(v) => (String(v).length > 20 ? String(v).slice(0, 18) + '…' : String(v))}
              />
              <Tooltip formatter={(val: any) => [`${Number(val)} orders`, 'Purchase Orders']} />
              <Bar dataKey="count" name="Purchase orders" fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-6 text-center">No category data</p>
      )}
    </div>
  );
}
