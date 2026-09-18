'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { 
  DollarSign, TrendingUp, Layers, RefreshCw, Search, FileText, ArrowUpRight, CheckCircle2, PieChart, ShieldCheck
} from 'lucide-react';
import { apiFetch, ProjectContractRead, CostSubledgerRead, RevenueSubledgerRead } from '@/lib/api';
import { rows } from '@/components/DataUI';

export default function CommercialOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ProjectContractRead[]>([]);
  const [costEntries, setCostEntries] = useState<CostSubledgerRead[]>([]);
  const [revenueEntries, setRevenueEntries] = useState<RevenueSubledgerRead[]>([]);
  const [version, setVersion] = useState(0);

  const [search, setSearch] = useState('');

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<ProjectContractRead[]>('/api/v1/commercial/contracts').catch(() => []),
      apiFetch<CostSubledgerRead[]>('/api/v1/commercial/cost-entries').catch(() => []),
      apiFetch<RevenueSubledgerRead[]>('/api/v1/commercial/revenue-entries').catch(() => []),
    ]).then(([cRes, costRes, revRes]) => {
      if (!active) return;
      setContracts(rows(cRes) as ProjectContractRead[]);
      setCostEntries(rows(costRes) as CostSubledgerRead[]);
      setRevenueEntries(rows(revRes) as RevenueSubledgerRead[]);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version]);

  const totalContractVal = (Array.isArray(contracts) ? contracts : []).reduce((acc, c) => acc + (Number(c.total_contract_value) || 0), 0);
  const totalRevenue = (Array.isArray(revenueEntries) ? revenueEntries : []).reduce((acc, r) => acc + (Number(r.total_revenue_base || r.amount) || 0), 0);
  const totalCost = (Array.isArray(costEntries) ? costEntries : []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const netMarginPct = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

  const filteredContracts = (Array.isArray(contracts) ? contracts : []).filter((c) =>
    !search || (c.contract_number || '').toLowerCase().includes(search.toLowerCase()) || (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-emerald-500" />
              Commercial Contracts & Costing Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Commercial contracts, revenue subledgers, cost subledgers, and financial contribution analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reload}
              className="flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium hover:bg-muted"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => router.push('/workspace/commercial/contracts')}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90"
            >
              <Layers className="h-4 w-4" />
              Raw Contracts & Subledgers
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Contract Value</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono">
              ${totalContractVal.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{contracts.length} active client contracts</p>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue Subledger</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Recognized across subledger entries</p>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Direct Cost Subledger</span>
              <PieChart className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-600">
              ${totalCost.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Direct site & rig operational costs</p>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Net Contribution Margin</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {netMarginPct.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Gross Profit: ${(totalRevenue - totalCost).toLocaleString()}</p>
          </div>
        </div>

        {/* Commercial Contracts Table */}
        <div className="border rounded-xl bg-card p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Active Commercial Contracts
              </h2>
              <p className="text-xs text-muted-foreground">Client contract agreements, rate structures, start & end dates</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search contracts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg bg-background"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Contract #</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredContracts.slice(0, 8).map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{c.contract_number}</td>
                    <td className="px-4 py-3 font-semibold">{c.title}</td>
                    <td className="px-4 py-3 font-mono font-bold">${Number(c.total_contract_value).toLocaleString()} {c.currency}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.start_date || '2026-01-01'} to {c.end_date || '2026-12-31'}</td>
                  </tr>
                ))}
                {filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No active commercial contracts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost & Revenue Subledger Overview */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="border rounded-xl bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <PieChart className="h-5 w-5 text-rose-500" />
                Cost Subledger Entries
              </h2>
              <button
                onClick={() => router.push('/workspace/commercial/cost-entries')}
                className="text-xs text-primary font-medium hover:underline"
              >
                View Cost Ledger →
              </button>
            </div>
            <div className="space-y-3">
              {(Array.isArray(costEntries) ? costEntries : []).slice(0, 4).map((entry) => (
                <div key={entry.id} className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm block">{entry.cost_category}</span>
                    <span className="text-xs text-muted-foreground">{entry.description || 'Direct Operational Cost'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm block text-rose-600">${Number(entry.amount || 0).toLocaleString()} {entry.currency}</span>
                    <span className="text-xs text-muted-foreground">{entry.created_at?.slice(0, 10)}</span>
                  </div>
                </div>
              ))}
              {costEntries.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No cost subledger entries recorded.</p>
              )}
            </div>
          </div>

          <div className="border rounded-xl bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Revenue Subledger Entries
              </h2>
              <button
                onClick={() => router.push('/workspace/commercial/revenue-entries')}
                className="text-xs text-primary font-medium hover:underline"
              >
                View Revenue Ledger →
              </button>
            </div>
            <div className="space-y-3">
              {(Array.isArray(revenueEntries) ? revenueEntries : []).slice(0, 4).map((entry) => (
                <div key={entry.id} className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm block">{entry.category}</span>
                    <span className="text-xs text-muted-foreground">{entry.description || 'Contract Revenue Realized'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm block text-emerald-600">${Number(entry.total_revenue_base || entry.amount || 0).toLocaleString()} {entry.currency}</span>
                    <span className="text-xs text-muted-foreground">{entry.created_at?.slice(0, 10)}</span>
                  </div>
                </div>
              ))}
              {revenueEntries.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No revenue subledger entries recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
