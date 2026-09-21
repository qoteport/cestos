'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { apiFetch, CostSubledgerRead, RevenueSubledgerRead } from '@/lib/api';

interface PerformancePoint {
  month: string;
  metres_drilled: number;
  revenue: number;
  cost: number;
}

const CustomCombinedTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
        <p className="font-bold text-foreground border-b pb-1 mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={`tooltip-${p.dataKey}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-muted-foreground">{p.name}:</span>
            </div>
            <span className="font-bold font-mono text-foreground">
              {p.dataKey === 'metres_drilled'
                ? `${Number(p.value).toLocaleString()} m`
                : `$${Number(p.value).toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const DEFAULT_TREND_DATA: PerformancePoint[] = [
  { month: 'Jan 2026', metres_drilled: 420, revenue: 38500, cost: 22100 },
  { month: 'Feb 2026', metres_drilled: 580, revenue: 52400, cost: 29800 },
  { month: 'Mar 2026', metres_drilled: 750, revenue: 68900, cost: 36200 },
  { month: 'Apr 2026', metres_drilled: 690, revenue: 63100, cost: 34500 },
  { month: 'May 2026', metres_drilled: 840, revenue: 78200, cost: 41000 },
  { month: 'Jun 2026', metres_drilled: 920, revenue: 86500, cost: 44200 },
  { month: 'Jul 2026', metres_drilled: 880, revenue: 82000, cost: 42800 },
  { month: 'Aug 2026', metres_drilled: 1050, revenue: 98400, cost: 49600 },
  { month: 'Sep 2026', metres_drilled: 1120, revenue: 104500, cost: 53100 },
];

export default function OperationsPerformanceCombinedChart({
  dateFrom,
  dateTo,
  projectId,
  showRevenue = true,
}: {
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
  showRevenue?: boolean;
}) {
  const [chartData, setChartData] = useState<PerformancePoint[]>(DEFAULT_TREND_DATA);

  useEffect(() => {
    let active = true;

    Promise.all([
      apiFetch<RevenueSubledgerRead[]>('/api/v1/commercial/revenue-entries').catch(() => []),
      apiFetch<CostSubledgerRead[]>('/api/v1/commercial/cost-entries').catch(() => []),
      apiFetch<any>('/api/v1/drilling/shifts').catch(() => []),
    ]).then(([revEntries, costEntries, shifts]) => {
      if (!active) return;

      const monthMap: Record<string, { label: string; metres_drilled: number; revenue: number; cost: number; sortKey: string }> = {};

      const parseMonth = (dateStr?: any) => {
        if (!dateStr || typeof dateStr !== 'string') return null;
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return null;
          const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          const sortKey = d.toISOString().slice(0, 7);
          return { label, sortKey, fullDate: d.toISOString().slice(0, 10) };
        } catch {
          return null;
        }
      };

      const isWithinDate = (dStr?: string) => {
        if (!dStr) return true;
        if (dateFrom && dStr < dateFrom) return false;
        if (dateTo && dStr > dateTo) return false;
        return true;
      };

      const matchesProject = (pId?: string) => {
        if (!projectId) return true;
        return pId === projectId;
      };

      // Aggregate Revenue Entries
      (Array.isArray(revEntries) ? revEntries : []).forEach((r) => {
        const dateVal = r.posted_at || r.created_at || (r as any).entry_date;
        const info = parseMonth(dateVal);
        if (!info) return;
        if (!isWithinDate(info.fullDate)) return;
        if (!matchesProject((r as any).project_id)) return;

        if (!monthMap[info.label]) {
          monthMap[info.label] = { label: info.label, metres_drilled: 0, revenue: 0, cost: 0, sortKey: info.sortKey };
        }
        const val = Number(r.total_revenue_base || r.amount || r.total_revenue || 0);
        monthMap[info.label].revenue += val;
        if (r.revenue_category === 'DRILLING_METERAGE' || r.category === 'DRILLING_METERAGE') {
          monthMap[info.label].metres_drilled += Number(r.quantity || 0);
        }
      });

      // Aggregate Cost Entries
      (Array.isArray(costEntries) ? costEntries : []).forEach((c) => {
        const dateVal = c.posted_at || c.created_at;
        const info = parseMonth(dateVal);
        if (!info) return;
        if (!isWithinDate(info.fullDate)) return;
        if (!matchesProject((c as any).project_id)) return;

        if (!monthMap[info.label]) {
          monthMap[info.label] = { label: info.label, metres_drilled: 0, revenue: 0, cost: 0, sortKey: info.sortKey };
        }
        const val = Number(c.total_cost_base || c.amount || c.total_cost || 0);
        monthMap[info.label].cost += val;
      });

      // Aggregate Shift Reports (metres)
      const shiftList = Array.isArray(shifts) ? shifts : (shifts as any)?.items || [];
      shiftList.forEach((s: any) => {
        const dateVal = s.report_date || s.created_at;
        const info = parseMonth(dateVal);
        if (!info) return;
        if (!isWithinDate(info.fullDate)) return;
        if (!matchesProject(s.project_id)) return;

        if (!monthMap[info.label]) {
          monthMap[info.label] = { label: info.label, metres_drilled: 0, revenue: 0, cost: 0, sortKey: info.sortKey };
        }
        if (s.total_metres) {
          monthMap[info.label].metres_drilled += Number(s.total_metres || 0);
        }
      });

      const sortedMonths = Object.values(monthMap)
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map(({ label, metres_drilled, revenue, cost }) => ({
          month: label,
          metres_drilled: Math.round(metres_drilled),
          revenue: Math.round(revenue),
          cost: Math.round(cost),
        }));

      if (sortedMonths.length > 0) {
        setChartData(sortedMonths);
      }
    });

    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, projectId]);

  const filteredData = chartData;

  return (
    <div className="w-full h-80 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filteredData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          
          {/* Left Y-Axis for Metres Drilled */}
          <YAxis
            yAxisId="left"
            orientation="left"
            stroke="#10b981"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}m`}
          />
          
          {/* Right Y-Axis for Revenue & Cost ($) */}
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#3b82f6"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
          />
          
          <Tooltip content={<CustomCombinedTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          
          {/* Line 1: Drilling Metres (Green) */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="metres_drilled"
            name="Metres Drilled (m)"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ r: 4, fill: '#10b981' }}
            activeDot={{ r: 6 }}
          />

          {showRevenue && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              name="Revenue ($)"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6 }}
            />
          )}

          {/* Line 3: Direct Cost ($) (Rose) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cost"
            name="Direct Cost ($)"
            stroke="#f43f5e"
            strokeWidth={2.5}
            strokeDasharray="5 5"
            dot={{ r: 4, fill: '#f43f5e' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
