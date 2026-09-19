'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, FileText, TrendingUp, Plus, RefreshCw, Calculator, Search, Eye, Edit, Download, Trash2, Paperclip, ExternalLink, Calendar, X 
} from 'lucide-react';
import { apiFetch, ProjectContractRead, CostSubledgerRead, RevenueSubledgerRead, updateProjectContract } from '@/lib/api';
import { Modal, rows } from './DataUI';

interface RateCardInput {
  rate_type: string;
  drilling_method?: string;
  depth_from_m?: number | null;
  depth_to_m?: number | null;
  unit_rate: number;
  description?: string;
}

interface AttachmentInput {
  name: string;
  url: string;
}

export default function CommercialCostingWorkspace({ subResource }: { subResource?: string }) {
  const [activeTab, setActiveTab] = useState<'CONTRACTS' | 'REVENUE' | 'COSTS'>('CONTRACTS');
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState<ProjectContractRead | null>(null);
  const [editingContract, setEditingContract] = useState<ProjectContractRead | null>(null);
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
  const [formContract, setFormContract] = useState({
    project_id: '',
    contract_number: `CNT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    title: 'Drilling Master Commercial Agreement',
    total_contract_value: 1250000.0,
    currency: 'USD',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'ACTIVE',
    notes: '',
    rate_cards: [
      { rate_type: 'DRILLING_METER', drilling_method: 'Diamond Core (HQ)', depth_from_m: 0, depth_to_m: 100, unit_rate: 65.0, description: 'Shallow diamond drilling rate' },
      { rate_type: 'DRILLING_METER', drilling_method: 'Diamond Core (HQ)', depth_from_m: 100, depth_to_m: 250, unit_rate: 78.5, description: 'Deep diamond drilling band' },
      { rate_type: 'STANDBY_HOURLY', drilling_method: '', depth_from_m: null, depth_to_m: null, unit_rate: 150.0, description: 'Approved client standby rate' }
    ] as RateCardInput[],
    attachments: [] as AttachmentInput[],
  });

  // Manual URL upload helper state
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newAtt = { name: file.name, url: url || '#' };
        if (isEdit) {
          setEditingContract((prev) => prev ? {
            ...prev,
            attachments: [...(prev.attachments || []), newAtt]
          } : prev);
        } else {
          setFormContract((prev) => ({
            ...prev,
            attachments: [...prev.attachments, newAtt]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const addManualAttachment = (isEdit: boolean) => {
    if (!newAttachmentName.trim()) return;
    const url = newAttachmentUrl.trim() || `blob:contract-document-${Date.now()}`;
    const newAtt = { name: newAttachmentName.trim(), url };
    if (isEdit) {
      setEditingContract((prev) => prev ? {
        ...prev,
        attachments: [...(prev.attachments || []), newAtt]
      } : prev);
    } else {
      setFormContract((prev) => ({
        ...prev,
        attachments: [...prev.attachments, newAtt]
      }));
    }
    setNewAttachmentName('');
    setNewAttachmentUrl('');
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/commercial/contracts', {
        method: 'POST',
        body: JSON.stringify(formContract),
      });
      setShowAddContract(false);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create contract');
    }
  };

  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;
    try {
      const updated = await updateProjectContract(editingContract.id, {
        title: editingContract.title,
        contract_number: editingContract.contract_number,
        currency: editingContract.currency,
        start_date: editingContract.start_date,
        end_date: editingContract.end_date,
        status: editingContract.status,
        notes: editingContract.notes,
        attachments: editingContract.attachments || [],
        rate_cards: editingContract.rate_cards || [],
      });
      setEditingContract(null);
      if (selectedContract?.id === editingContract.id) {
        setSelectedContract(updated);
      }
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to update contract');
    }
  };

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
                  className="p-4 rounded-xl border bg-card space-y-3 shadow-sm hover:border-primary/50 transition flex flex-col justify-between"
                >
                  <div className="space-y-2" onClick={() => setSelectedContract(c)}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-medium text-muted-foreground">{c.contract_number}</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-600 font-semibold">{c.status}</span>
                    </div>
                    <h3 className="font-bold text-base leading-snug">{c.title}</h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Currency: <strong className="text-foreground">{c.currency}</strong></span>
                      <span>Value: <strong className="text-foreground font-semibold">${Number(c.total_contract_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {c.start_date || 'N/A'} {c.end_date ? `to ${c.end_date}` : ''}
                      </span>
                    </div>
                    {c.attachments && c.attachments.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <Paperclip className="h-3 w-3" /> {c.attachments.length} attached document(s)
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3 flex justify-between items-center text-xs font-medium">
                    <span className="text-muted-foreground">{c.rate_cards?.length || 0} rate bands</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingContract(c);
                        }}
                        className="px-2 py-1 text-xs border rounded hover:bg-muted flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3 text-amber-600" /> Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContract(c);
                        }}
                        className="px-2.5 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" /> View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            {contracts.length === 0 && (
              <div className="col-span-full p-8 text-center border rounded-xl bg-card text-muted-foreground">
                No commercial contracts created. Click "New Contract" to add contract rate cards and attachments.
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

      {/* VIEW CONTRACT DETAILS MODAL */}
      {selectedContract && (
        <Modal title={`Contract Details: ${selectedContract.contract_number}`} onClose={() => setSelectedContract(null)}>
          <div className="space-y-6 text-sm">
            {/* Metadata Header */}
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <span className="text-xs text-muted-foreground block">Contract Title</span>
                <span className="font-bold text-base text-foreground">{selectedContract.title}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Status, Currency & Value</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-600 font-semibold">{selectedContract.status}</span>
                  <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded">{selectedContract.currency}</span>
                  <span className="font-bold text-xs text-foreground bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    ${Number(selectedContract.total_contract_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">Associated Project</span>
                <span className="font-medium text-foreground">
                  {projects.find((p) => p.id === selectedContract.project_id)?.name || selectedContract.project_id || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Contract Duration</span>
                <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {selectedContract.start_date || 'N/A'} {selectedContract.end_date ? `to ${selectedContract.end_date}` : ''}
                </span>
              </div>

              {selectedContract.notes && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground block">Notes & Terms</span>
                  <p className="text-xs text-foreground mt-1 bg-muted/30 p-2.5 rounded border">{selectedContract.notes}</p>
                </div>
              )}
            </div>

            {/* Depth-Banded Rate Cards */}
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-500" />
                Depth-Banded Rate Cards ({selectedContract.rate_cards?.length || 0})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2">Rate Type</th>
                      <th className="p-2">Method</th>
                      <th className="p-2">Depth Range (m)</th>
                      <th className="p-2">Unit Rate</th>
                      <th className="p-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(selectedContract.rate_cards || []).map((rc: any, idx: number) => (
                      <tr key={rc.id || idx}>
                        <td className="p-2 font-medium">{rc.rate_type}</td>
                        <td className="p-2">{rc.drilling_method || '—'}</td>
                        <td className="p-2 font-mono">
                          {rc.depth_from_m != null && rc.depth_to_m != null
                            ? `${rc.depth_from_m}m - ${rc.depth_to_m}m`
                            : 'Flat Rate'}
                        </td>
                        <td className="p-2 font-bold text-emerald-600">${Number(rc.unit_rate).toFixed(2)}</td>
                        <td className="p-2 text-muted-foreground">{rc.description || '—'}</td>
                      </tr>
                    ))}
                    {(!selectedContract.rate_cards || selectedContract.rate_cards.length === 0) && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted-foreground">No rate cards defined for this contract.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Contract File Attachments with View & Download */}
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-blue-500" />
                Attached Contract Documents ({selectedContract.attachments?.length || 0})
              </h3>
              <div className="space-y-2">
                {(selectedContract.attachments || []).map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/20 text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium truncate">{att.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => window.open(att.url, '_blank')}
                        className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded border hover:bg-muted flex items-center gap-1 font-medium"
                        title="View Document"
                      >
                        <Eye className="h-3 w-3" /> View
                      </button>
                      <button
                        onClick={() => triggerDownload(att.url, att.name)}
                        className="px-2.5 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-1 font-medium"
                        title="Download Document"
                      >
                        <Download className="h-3 w-3" /> Download
                      </button>
                    </div>
                  </div>
                ))}
                {(!selectedContract.attachments || selectedContract.attachments.length === 0) && (
                  <p className="text-xs text-muted-foreground italic border border-dashed p-3 rounded text-center">
                    No documents attached to this contract. Click Edit Contract to attach tender files or rate specs.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => setSelectedContract(null)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setEditingContract(selectedContract);
                  setSelectedContract(null);
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 flex items-center gap-1.5"
              >
                <Edit className="h-4 w-4" /> Edit Contract
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT CONTRACT MODAL */}
      {editingContract && (
        <Modal title={`Edit Commercial Contract: ${editingContract.contract_number}`} onClose={() => setEditingContract(null)}>
          <form onSubmit={handleUpdateContract} className="space-y-4 text-sm max-h-[80vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Contract Number</label>
                <input
                  type="text"
                  required
                  value={editingContract.contract_number}
                  onChange={(e) => setEditingContract({ ...editingContract, contract_number: e.target.value })}
                  className="w-full border rounded p-2 bg-background text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Contract Title</label>
                <input
                  type="text"
                  required
                  value={editingContract.title}
                  onChange={(e) => setEditingContract({ ...editingContract, title: e.target.value })}
                  className="w-full border rounded p-2 bg-background text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={editingContract.start_date || ''}
                  onChange={(e) => setEditingContract({ ...editingContract, start_date: e.target.value })}
                  className="w-full border rounded p-2 bg-background text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={editingContract.end_date || ''}
                  onChange={(e) => setEditingContract({ ...editingContract, end_date: e.target.value })}
                  className="w-full border rounded p-2 bg-background text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select
                  value={editingContract.status}
                  onChange={(e) => setEditingContract({ ...editingContract, status: e.target.value })}
                  className="w-full border rounded p-2 bg-background text-xs"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="SUPERSEDED">SUPERSEDED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Currency</label>
                <input
                  type="text"
                  required
                  value={editingContract.currency}
                  onChange={(e) => setEditingContract({ ...editingContract, currency: e.target.value })}
                  className="w-full border rounded p-2 bg-background text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Total Contract Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1,250,000.00"
                  value={editingContract.total_contract_value ?? ''}
                  onChange={(e) => setEditingContract({ ...editingContract, total_contract_value: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="w-full border rounded p-2 bg-background text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Notes & Terms</label>
              <textarea
                rows={2}
                value={editingContract.notes || ''}
                onChange={(e) => setEditingContract({ ...editingContract, notes: e.target.value })}
                className="w-full border rounded p-2 bg-background text-xs"
              />
            </div>

            {/* Depth-banded Rate Cards Editor */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="block text-xs font-bold">Rate Cards (Depth & Hourly Bands)</label>
                  <p className="text-[11px] text-muted-foreground">Billable commercial rates per metre drilled, standby hour, or flat mobilization fee</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingContract({
                    ...editingContract,
                    rate_cards: [
                      ...(editingContract.rate_cards || []),
                      { rate_type: 'DRILLING_METER', drilling_method: '', depth_from_m: 0, depth_to_m: 100, unit_rate: 50.0, description: '' }
                    ]
                  })}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="h-3 w-3" /> Add Rate Card Row
                </button>
              </div>

              {/* Rate Card Grid Column Labels */}
              <div className="grid grid-cols-12 gap-1.5 px-2 py-1 bg-muted/60 rounded text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                <span className="col-span-2">Rate Type</span>
                <span className="col-span-2">Drilling Method</span>
                <span className="col-span-1">From (m)</span>
                <span className="col-span-1">To (m)</span>
                <span className="col-span-2">Unit Rate ($)</span>
                <span className="col-span-3">Description / Scope</span>
                <span className="col-span-1 text-center">Remove</span>
              </div>

              <div className="space-y-2">
                {(editingContract.rate_cards || []).map((rc, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center p-2 rounded border bg-muted/20 text-xs">
                    <select
                      value={rc.rate_type}
                      onChange={(e) => {
                        const updated = [...(editingContract.rate_cards || [])];
                        updated[idx].rate_type = e.target.value;
                        setEditingContract({ ...editingContract, rate_cards: updated });
                      }}
                      className="col-span-2 border rounded p-1 bg-background text-xs font-medium"
                    >
                      <option value="DRILLING_METER">DRILLING_METER</option>
                      <option value="STANDBY_HOURLY">STANDBY_HOURLY</option>
                      <option value="MOBILIZATION_FLAT">MOBILIZATION_FLAT</option>
                      <option value="DEMOBILIZATION_FLAT">DEMOBILIZATION_FLAT</option>
                      <option value="DAYWORK_HOURLY">DAYWORK_HOURLY</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Method (e.g. HQ/PQ)"
                      value={rc.drilling_method || ''}
                      onChange={(e) => {
                        const updated = [...(editingContract.rate_cards || [])];
                        updated[idx].drilling_method = e.target.value;
                        setEditingContract({ ...editingContract, rate_cards: updated });
                      }}
                      className="col-span-2 border rounded p-1 bg-background text-xs"
                    />

                    <input
                      type="number"
                      placeholder="From (0m)"
                      value={rc.depth_from_m ?? ''}
                      onChange={(e) => {
                        const updated = [...(editingContract.rate_cards || [])];
                        updated[idx].depth_from_m = e.target.value === '' ? null : Number(e.target.value);
                        setEditingContract({ ...editingContract, rate_cards: updated });
                      }}
                      className="col-span-1 border rounded p-1 bg-background text-xs"
                    />

                    <input
                      type="number"
                      placeholder="To (100m)"
                      value={rc.depth_to_m ?? ''}
                      onChange={(e) => {
                        const updated = [...(editingContract.rate_cards || [])];
                        updated[idx].depth_to_m = e.target.value === '' ? null : Number(e.target.value);
                        setEditingContract({ ...editingContract, rate_cards: updated });
                      }}
                      className="col-span-1 border rounded p-1 bg-background text-xs"
                    />

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Rate ($/m or $/hr)"
                      value={rc.unit_rate}
                      onChange={(e) => {
                        const updated = [...(editingContract.rate_cards || [])];
                        updated[idx].unit_rate = Number(e.target.value);
                        setEditingContract({ ...editingContract, rate_cards: updated });
                      }}
                      className="col-span-2 border rounded p-1 bg-background text-xs font-bold"
                    />

                    <input
                      type="text"
                      placeholder="Scope / notes (what rate represents)"
                      value={rc.description || ''}
                      onChange={(e) => {
                        const updated = [...(editingContract.rate_cards || [])];
                        updated[idx].description = e.target.value;
                        setEditingContract({ ...editingContract, rate_cards: updated });
                      }}
                      className="col-span-3 border rounded p-1 bg-background text-xs"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        const updated = (editingContract.rate_cards || []).filter((_, i) => i !== idx);
                        setEditingContract({ ...editingContract, rate_cards: updated });
                      }}
                      className="col-span-1 p-1 text-rose-500 hover:text-rose-700 flex justify-center"
                      title="Remove Rate Card Row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* File Attachments Editor */}
            <div className="border-t pt-3">
              <label className="block text-xs font-bold mb-2">Contract Document Attachments (Multiple Allowed)</label>
              
              <div className="flex flex-col gap-2 mb-3">
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e, true)}
                  className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded file:border file:text-xs file:font-medium file:bg-muted hover:file:bg-muted/80 cursor-pointer"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Document Name (e.g. Rate Spec Sheet 2026.pdf)"
                    value={newAttachmentName}
                    onChange={(e) => setNewAttachmentName(e.target.value)}
                    className="flex-1 border rounded p-1.5 bg-background text-xs"
                  />
                  <input
                    type="text"
                    placeholder="URL (optional)"
                    value={newAttachmentUrl}
                    onChange={(e) => setNewAttachmentUrl(e.target.value)}
                    className="flex-1 border rounded p-1.5 bg-background text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => addManualAttachment(true)}
                    className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded border text-xs font-semibold hover:bg-muted shrink-0"
                  >
                    + Add Link
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {(editingContract.attachments || []).map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded border bg-muted/20 text-xs">
                    <span className="font-medium truncate pr-2 flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-blue-500" /> {att.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (editingContract.attachments || []).filter((_, i) => i !== idx);
                        setEditingContract({ ...editingContract, attachments: updated });
                      }}
                      className="text-rose-500 hover:text-rose-700 p-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => setEditingContract(null)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE CONTRACT MODAL */}
      {showAddContract && (
        <Modal title="Create Commercial Contract" onClose={() => setShowAddContract(false)}>
          <form onSubmit={handleCreateContract} className="space-y-4 text-sm max-h-[80vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Project</label>
                <select
                  required
                  value={formContract.project_id}
                  onChange={(e) => setFormContract({ ...formContract, project_id: e.target.value })}
                  className="w-full text-xs border rounded p-2 bg-background"
                >
                  <option value="">Select Project...</option>
                  {(Array.isArray(projects) ? projects : []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Contract Number</label>
                <input
                  type="text"
                  required
                  value={formContract.contract_number}
                  onChange={(e) => setFormContract({ ...formContract, contract_number: e.target.value })}
                  className="w-full text-xs border rounded p-2 bg-background"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Contract Title</label>
                <input
                  type="text"
                  required
                  value={formContract.title}
                  onChange={(e) => setFormContract({ ...formContract, title: e.target.value })}
                  className="w-full text-xs border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={formContract.start_date}
                  onChange={(e) => setFormContract({ ...formContract, start_date: e.target.value })}
                  className="w-full text-xs border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={formContract.end_date}
                  onChange={(e) => setFormContract({ ...formContract, end_date: e.target.value })}
                  className="w-full text-xs border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select
                  value={formContract.status}
                  onChange={(e) => setFormContract({ ...formContract, status: e.target.value })}
                  className="w-full text-xs border rounded p-2 bg-background"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="SUPERSEDED">SUPERSEDED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Currency</label>
                <input
                  type="text"
                  required
                  value={formContract.currency}
                  onChange={(e) => setFormContract({ ...formContract, currency: e.target.value })}
                  className="w-full text-xs border rounded p-2 bg-background font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Total Contract Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1,250,000.00"
                  value={formContract.total_contract_value ?? ''}
                  onChange={(e) => setFormContract({ ...formContract, total_contract_value: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full text-xs border rounded p-2 bg-background font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Notes & Terms</label>
              <textarea
                rows={2}
                value={formContract.notes}
                onChange={(e) => setFormContract({ ...formContract, notes: e.target.value })}
                className="w-full text-xs border rounded p-2 bg-background"
                placeholder="Key payment terms, escalation clause, or standby rate guidelines..."
              />
            </div>

            {/* Depth-Banded Rate Cards Builder */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="block text-xs font-bold">Rate Cards (Depth & Hourly Bands)</label>
                  <p className="text-[11px] text-muted-foreground">Billable commercial rates per metre drilled, standby hour, or flat mobilization fee</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormContract({
                    ...formContract,
                    rate_cards: [
                      ...formContract.rate_cards,
                      { rate_type: 'DRILLING_METER', drilling_method: '', depth_from_m: 0, depth_to_m: 100, unit_rate: 50.0, description: '' }
                    ]
                  })}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="h-3 w-3" /> Add Rate Card Row
                </button>
              </div>

              {/* Rate Card Grid Column Labels */}
              <div className="grid grid-cols-12 gap-1.5 px-2 py-1 bg-muted/60 rounded text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                <span className="col-span-2">Rate Type</span>
                <span className="col-span-2">Drilling Method</span>
                <span className="col-span-1">From (m)</span>
                <span className="col-span-1">To (m)</span>
                <span className="col-span-2">Unit Rate ($)</span>
                <span className="col-span-3">Description / Scope</span>
                <span className="col-span-1 text-center">Remove</span>
              </div>

              <div className="space-y-2">
                {formContract.rate_cards.map((rc, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center p-2 rounded border bg-muted/20 text-xs">
                    <select
                      value={rc.rate_type}
                      onChange={(e) => {
                        const updated = [...formContract.rate_cards];
                        updated[idx].rate_type = e.target.value;
                        setFormContract({ ...formContract, rate_cards: updated });
                      }}
                      className="col-span-2 border rounded p-1 bg-background text-xs font-medium"
                    >
                      <option value="DRILLING_METER">DRILLING_METER</option>
                      <option value="STANDBY_HOURLY">STANDBY_HOURLY</option>
                      <option value="MOBILIZATION_FLAT">MOBILIZATION_FLAT</option>
                      <option value="DEMOBILIZATION_FLAT">DEMOBILIZATION_FLAT</option>
                      <option value="DAYWORK_HOURLY">DAYWORK_HOURLY</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Method (e.g. HQ/PQ)"
                      value={rc.drilling_method || ''}
                      onChange={(e) => {
                        const updated = [...formContract.rate_cards];
                        updated[idx].drilling_method = e.target.value;
                        setFormContract({ ...formContract, rate_cards: updated });
                      }}
                      className="col-span-2 border rounded p-1 bg-background text-xs"
                    />

                    <input
                      type="number"
                      placeholder="From (0m)"
                      value={rc.depth_from_m ?? ''}
                      onChange={(e) => {
                        const updated = [...formContract.rate_cards];
                        updated[idx].depth_from_m = e.target.value === '' ? null : Number(e.target.value);
                        setFormContract({ ...formContract, rate_cards: updated });
                      }}
                      className="col-span-1 border rounded p-1 bg-background text-xs"
                    />

                    <input
                      type="number"
                      placeholder="To (100m)"
                      value={rc.depth_to_m ?? ''}
                      onChange={(e) => {
                        const updated = [...formContract.rate_cards];
                        updated[idx].depth_to_m = e.target.value === '' ? null : Number(e.target.value);
                        setFormContract({ ...formContract, rate_cards: updated });
                      }}
                      className="col-span-1 border rounded p-1 bg-background text-xs"
                    />

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Rate ($/m or $/hr)"
                      value={rc.unit_rate}
                      onChange={(e) => {
                        const updated = [...formContract.rate_cards];
                        updated[idx].unit_rate = Number(e.target.value);
                        setFormContract({ ...formContract, rate_cards: updated });
                      }}
                      className="col-span-2 border rounded p-1 bg-background text-xs font-bold"
                    />

                    <input
                      type="text"
                      placeholder="Scope / notes (what rate represents)"
                      value={rc.description || ''}
                      onChange={(e) => {
                        const updated = [...formContract.rate_cards];
                        updated[idx].description = e.target.value;
                        setFormContract({ ...formContract, rate_cards: updated });
                      }}
                      className="col-span-3 border rounded p-1 bg-background text-xs"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        const updated = formContract.rate_cards.filter((_, i) => i !== idx);
                        setFormContract({ ...formContract, rate_cards: updated });
                      }}
                      className="col-span-1 p-1 text-rose-500 hover:text-rose-700 flex justify-center"
                      title="Remove Rate Card Row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* File Attachments Uploader */}
            <div className="border-t pt-3">
              <label className="block text-xs font-bold mb-2">Contract File Attachments (Multiple Allowed)</label>
              
              <div className="flex flex-col gap-2 mb-3">
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e, false)}
                  className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded file:border file:text-xs file:font-medium file:bg-muted hover:file:bg-muted/80 cursor-pointer"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Document Name (e.g. Master Tender Agreement.pdf)"
                    value={newAttachmentName}
                    onChange={(e) => setNewAttachmentName(e.target.value)}
                    className="flex-1 border rounded p-1.5 bg-background text-xs"
                  />
                  <input
                    type="text"
                    placeholder="URL (optional)"
                    value={newAttachmentUrl}
                    onChange={(e) => setNewAttachmentUrl(e.target.value)}
                    className="flex-1 border rounded p-1.5 bg-background text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => addManualAttachment(false)}
                    className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded border text-xs font-semibold hover:bg-muted shrink-0"
                  >
                    + Add Link
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {formContract.attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded border bg-muted/20 text-xs">
                    <span className="font-medium truncate pr-2 flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-blue-500" /> {att.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formContract.attachments.filter((_, i) => i !== idx);
                        setFormContract({ ...formContract, attachments: updated });
                      }}
                      className="text-rose-500 hover:text-rose-700 p-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
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
