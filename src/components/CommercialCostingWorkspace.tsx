'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, FileText, TrendingUp, Plus, RefreshCw, Layers, Calculator, ShieldCheck, Search, Eye 
} from 'lucide-react';
import { apiFetch, ProjectContractRead, CostSubledgerRead, RevenueSubledgerRead } from '@/lib/api';
import { Modal, rows } from './DataUI';

export default function CommercialCostingWorkspace({ subResource }: { subResource?: string }) {
  const [activeTab, setActiveTab] = useState<'CONTRACTS' | 'REVENUE' | 'COSTS'>('CONTRACTS');
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState<ProjectContractRead | null>(null);
  const [selectedCostEntry, setSelectedCostEntry] = useState<CostSubledgerRead | null>(null);
  const [selectedRevenueEntry, setSelectedRevenueEntry] = useState<RevenueSubledgerRead | null>(null);

  useEffect(() => {
    if (subResource === 'cost-entries' || subResource === 'costs') setActiveTab('COSTS');
    else if (subResource === 'revenue-entries' || subResource === 'revenue') setActiveTab('REVENUE');
    else if (subResource === 'contracts') setActiveTab('CONTRACTS');
  }, [subResource]);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ProjectContractRead[]>([]);
  const [costEntries, setCostEntries] = useState<CostSubledgerRead[]>([]);
  const [revenueEntries, setRevenueEntries] = useState<RevenueSubledgerRead[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [version, setVersion] = useState(0);

  // New Contract Form State
  const [showAddContract, setShowAddContract] = useState(false);
  const [newContract, setNewContract] = useState({
    project_id: '',
    title: 'Drilling Master Commercial Agreement 2026',
    currency: 'USD',
  });

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<ProjectContractRead[]>('/api/v1/commercial/contracts').catch(() => []),
      apiFetch<CostSubledgerRead[]>('/api/v1/commercial/cost-entries').catch(() => []),
      apiFetch<RevenueSubledgerRead[]>('/api/v1/commercial/revenue-entries').catch(() => []),
      apiFetch<any>('/api/v1/projects?page_size=100').catch(() => ({ items: [] })),
    ]).then(([contractRes, costRes, revRes, projRes]) => {
      if (!active) return;
      setContracts(rows(contractRes) as ProjectContractRead[]);
      setCostEntries(rows(costRes) as CostSubledgerRead[]);
      setRevenueEntries(rows(revRes) as RevenueSubledgerRead[]);
      setProjects(rows(projRes));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/commercial/contracts', {
        method: 'POST',
        body: JSON.stringify(newContract),
      });
      setShowAddContract(false);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create contract');
    }
  };

  const totalRev = revenueEntries.reduce((sum, r) => sum + Number(r.total_revenue_base || 0), 0);
  const totalCost = costEntries.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-500" />
            Commercial Contracts & Project Costing
          </h1>
          <p className="text-sm text-muted-foreground">
            Depth-banded rate cards, automated shift revenue auto-posting, and dual-entry cost subledgers
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
        </div>
      </div>

      {/* Financial Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border bg-card">
          <span className="text-xs font-medium text-muted-foreground">TOTAL AUTO-POSTED REVENUE</span>
          <div className="text-2xl font-bold text-emerald-600">${totalRev.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <span className="text-xs font-medium text-muted-foreground">TOTAL OPERATIONAL COSTS</span>
          <div className="text-2xl font-bold text-rose-600">${totalCost.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <span className="text-xs font-medium text-muted-foreground">NET CONTRIBUTION</span>
          <div className="text-2xl font-bold text-blue-600">${(totalRev - totalCost).toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b space-x-4">
        <button
          onClick={() => setActiveTab('CONTRACTS')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'CONTRACTS'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Contracts & Rate Cards ({contracts.length})
        </button>
        <button
          onClick={() => setActiveTab('REVENUE')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'REVENUE'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Revenue Subledger ({revenueEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('COSTS')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'COSTS'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calculator className="h-4 w-4" />
          Cost Subledger ({costEntries.length})
        </button>
      </div>

      {/* CONTRACTS TAB */}
      {activeTab === 'CONTRACTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Commercial Contracts</h2>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search contracts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-sm border rounded-lg pl-9 pr-3 py-1.5 bg-background"
                />
              </div>
              <button
                onClick={() => setShowAddContract(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 shrink-0"
              >
                <Plus className="h-4 w-4" />
                New Contract
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Array.isArray(contracts) ? contracts : [])
              .filter((c) => {
                if (!search.trim()) return true;
                const q = search.toLowerCase();
                return (
                  c.title?.toLowerCase().includes(q) ||
                  c.contract_number?.toLowerCase().includes(q) ||
                  c.status?.toLowerCase().includes(q)
                );
              })
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedContract(c)}
                  className="p-4 rounded-xl border bg-card space-y-3 shadow-sm hover:border-primary/50 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-muted-foreground">{c.contract_number}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-600 font-semibold">{c.status}</span>
                  </div>
                  <h3 className="font-bold text-base leading-snug">{c.title}</h3>
                  <p className="text-xs text-muted-foreground">Currency: {c.currency}</p>
                  <div className="border-t pt-2 text-xs font-medium text-muted-foreground flex justify-between items-center">
                    <span>Rate Cards: {c.rate_cards?.length || 0} active meterage / hourly bands</span>
                    <Eye className="h-3.5 w-3.5" />
                  </div>
                </div>
              ))}
            {contracts.length === 0 && (
              <div className="col-span-full p-8 text-center border rounded-xl bg-card text-muted-foreground">
                No commercial contracts created. Click "New Contract" to add contract rate cards.
              </div>
            )}
          </div>
        </div>
      )}

      {/* REVENUE TAB */}
      {activeTab === 'REVENUE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Revenue Subledger</h2>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search revenue entries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm border rounded-lg pl-9 pr-3 py-1.5 bg-background"
              />
            </div>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Total Base Revenue</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(revenueEntries) ? revenueEntries : [])
                  .filter((r) => {
                    if (!search.trim()) return true;
                    const q = search.toLowerCase();
                    return (
                      r.category?.toLowerCase().includes(q) ||
                      r.currency?.toLowerCase().includes(q)
                    );
                  })
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{r.category}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">${Number(r.total_revenue_base).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs">{r.currency}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.created_at?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedRevenueEntry(r)}
                          className="px-2 py-1 text-xs border rounded font-medium hover:bg-muted inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                {revenueEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No revenue auto-posted entries yet. Approve shift production reports to auto-post meterage & standby revenue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COSTS TAB */}
      {activeTab === 'COSTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Cost Subledger</h2>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search cost entries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm border rounded-lg pl-9 pr-3 py-1.5 bg-background"
              />
            </div>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Cost Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(costEntries) ? costEntries : [])
                  .filter((c) => {
                    if (!search.trim()) return true;
                    const q = search.toLowerCase();
                    return (
                      c.cost_category?.toLowerCase().includes(q) ||
                      c.description?.toLowerCase().includes(q)
                    );
                  })
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{c.cost_category}</td>
                      <td className="px-4 py-3">{c.description}</td>
                      <td className="px-4 py-3 font-bold text-rose-600">${Number(c.amount).toLocaleString()} {c.currency}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.created_at?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedCostEntry(c)}
                          className="px-2 py-1 text-xs border rounded font-medium hover:bg-muted inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                {costEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No cost subledger entries recorded. Work order completions and fuel logs auto-post operational costs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE CONTRACT MODAL */}
      {showAddContract && (
        <Modal title="Create Commercial Contract" onClose={() => setShowAddContract(false)}>
          <form onSubmit={handleCreateContract} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Project</label>
              <select
                required
                value={newContract.project_id}
                onChange={(e) => setNewContract({ ...newContract, project_id: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              >
                <option value="">Select Project...</option>
                {(Array.isArray(projects) ? projects : []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Contract Title</label>
              <input
                type="text"
                required
                value={newContract.title}
                onChange={(e) => setNewContract({ ...newContract, title: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddContract(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save Contract
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
