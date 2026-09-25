'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  FileText,
  TrendingUp,
  Plus,
  RefreshCw,
  Calculator,
  Search,
  Eye,
  Edit,
  Download,
  Trash2,
  Paperclip,
  ExternalLink,
  Calendar,
  X,
  Building2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  apiFetch,
  ProjectContractRead,
  CostSubledgerRead,
  RevenueSubledgerRead,
  updateProjectContract,
  deleteProjectContract,
} from '@/lib/api';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import { Modal, ErrorModal, SearchableProjectSelect, rows } from './DataUI';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './ui/AppDateTimePicker';

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

function getClientNameForContract(
  contract: ProjectContractRead | null,
  projects: any[],
  clients: any[]
): string {
  if (!contract) return 'N/A';
  if ((contract as any).client_name && typeof (contract as any).client_name === 'string') {
    return (contract as any).client_name;
  }
  const proj = projects.find((p) => String(p.id) === String(contract.project_id));
  if (proj) {
    if (proj.client_name && typeof proj.client_name === 'string') return proj.client_name;
    if (proj.client && typeof proj.client === 'object' && proj.client.name) return proj.client.name;
    if (proj.client_id) {
      const matchClient = clients.find((c) => String(c.id) === String(proj.client_id));
      if (matchClient)
        return matchClient.name || matchClient.company_name || matchClient.title || 'Client';
    }
  }
  if ((contract as any).client_id) {
    const matchClient = clients.find((c) => String(c.id) === String((contract as any).client_id));
    if (matchClient)
      return matchClient.name || matchClient.company_name || matchClient.title || 'Client';
  }
  return 'N/A';
}

function CategoryTimeSeriesChart({
  title,
  subtitle,
  categoryKey,
  entries,
  valueGetter,
  color,
  isCost = true,
}: {
  title: string;
  subtitle: string;
  categoryKey: string;
  entries: any[];
  valueGetter: (e: any) => number;
  color: string;
  isCost?: boolean;
}) {
  const categoryEntries = useMemo(() => {
    return entries.filter((e) => {
      const cat = String(e.cost_category || e.revenue_category || e.category || '').toUpperCase();
      return cat === categoryKey.toUpperCase();
    });
  }, [entries, categoryKey]);

  const totalAmount = useMemo(() => {
    return categoryEntries.reduce((sum, e) => sum + valueGetter(e), 0);
  }, [categoryEntries, valueGetter]);

  const chartData = useMemo(() => {
    if (categoryEntries.length === 0) return [];

    const monthMap: Record<string, number> = {};
    categoryEntries.forEach((e) => {
      const rawDate = e.posted_at || e.created_at;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const monthKey = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      monthMap[monthKey] = (monthMap[monthKey] || 0) + valueGetter(e);
    });

    return Object.entries(monthMap).map(([month, amount]) => ({
      month,
      amount: Math.round(amount),
    }));
  }, [categoryEntries, valueGetter]);

  return (
    <div className="p-4 rounded-xl border bg-card shadow-sm space-y-3 flex flex-col justify-between">
      <div className="flex items-start justify-between border-b pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="font-bold text-sm text-foreground">{title}</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="text-right">
          <div
            className={`font-mono font-bold text-base ${isCost ? 'text-rose-600' : 'text-emerald-600'}`}
          >
            ${totalAmount.toLocaleString()}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {categoryEntries.length} entries
          </span>
        </div>
      </div>

      <div className="h-44 w-full pt-1">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
                opacity={0.5}
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card border border-border rounded-lg shadow-md p-2 text-xs">
                        <p className="font-bold border-b pb-1 mb-1">{label}</p>
                        <p className="font-mono font-semibold" style={{ color }}>
                          ${Number(payload[0].value).toLocaleString()}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: color }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center border border-dashed rounded-lg text-xs text-muted-foreground bg-muted/10">
            No entries recorded for this category in selected filter.
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommercialCostingWorkspace({ subResource }: { subResource?: string }) {
  const [activeTab, setActiveTab] = useState<'CONTRACTS' | 'REVENUE' | 'COSTS'>('CONTRACTS');
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState<ProjectContractRead | null>(null);
  const [editingContract, setEditingContract] = useState<ProjectContractRead | null>(null);
  const [selectedCostEntry, setSelectedCostEntry] = useState<CostSubledgerRead | null>(null);
  const [selectedRevenueEntry, setSelectedRevenueEntry] = useState<RevenueSubledgerRead | null>(
    null
  );

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletingContract, setDeletingContract] = useState(false);

  // Pagination states
  const [costPage, setCostPage] = useState(1);
  const [revenuePage, setRevenuePage] = useState(1);
  const itemsPerPage = 10;

  // Global Filter States
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('all_time');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  useEffect(() => {
    if (subResource === 'cost-entries' || subResource === 'costs') setActiveTab('COSTS');
    else if (subResource === 'revenue-entries' || subResource === 'revenue')
      setActiveTab('REVENUE');
    else if (subResource === 'contracts') setActiveTab('CONTRACTS');
  }, [subResource]);

  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ProjectContractRead[]>([]);
  const [costEntries, setCostEntries] = useState<CostSubledgerRead[]>([]);
  const [revenueEntries, setRevenueEntries] = useState<RevenueSubledgerRead[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
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
      {
        rate_type: 'DRILLING_METER',
        drilling_method: 'Diamond Core (HQ)',
        depth_from_m: 0,
        depth_to_m: 100,
        unit_rate: 65.0,
        description: 'Shallow diamond drilling rate',
      },
      {
        rate_type: 'DRILLING_METER',
        drilling_method: 'Diamond Core (HQ)',
        depth_from_m: 100,
        depth_to_m: 250,
        unit_rate: 78.5,
        description: 'Deep diamond drilling band',
      },
      {
        rate_type: 'STANDBY_HOURLY',
        drilling_method: '',
        depth_from_m: null,
        depth_to_m: null,
        unit_rate: 150.0,
        description: 'Approved client standby rate',
      },
    ] as RateCardInput[],
    attachments: [] as AttachmentInput[],
  });

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
      apiFetch<any>('/api/v1/clients?page_size=100').catch(() => ({ items: [] })),
    ]).then(([contractRes, costRes, revRes, projRes, clientRes]) => {
      if (!active) return;
      setContracts(rows(contractRes) as ProjectContractRead[]);
      setCostEntries(rows(costRes) as CostSubledgerRead[]);
      setRevenueEntries(rows(revRes) as RevenueSubledgerRead[]);
      setProjects(rows(projRes));
      setClients(rows(clientRes));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version]);

  // Date preset helper
  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const formatDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    switch (preset) {
      case 'last_30': {
        const past = new Date();
        past.setDate(now.getDate() - 30);
        setFilterDateFrom(formatDate(past));
        setFilterDateTo(formatDate(now));
        break;
      }
      case 'last_90': {
        const past = new Date();
        past.setDate(now.getDate() - 90);
        setFilterDateFrom(formatDate(past));
        setFilterDateTo(formatDate(now));
        break;
      }
      case 'this_month': {
        const first = new Date(year, month, 1);
        setFilterDateFrom(formatDate(first));
        setFilterDateTo(formatDate(now));
        break;
      }
      case 'ytd': {
        const first = new Date(year, 0, 1);
        setFilterDateFrom(formatDate(first));
        setFilterDateTo(formatDate(now));
        break;
      }
      case 'all_time':
      default:
        setFilterDateFrom('');
        setFilterDateTo('');
        break;
    }
  };

  const clearFilters = () => {
    setFilterProject('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setDatePreset('all_time');
    setCostPage(1);
    setRevenuePage(1);
  };

  const hasActiveFilters = Boolean(filterProject || filterDateFrom || filterDateTo);

  // Filter cost and revenue entries dynamically by Project and Date Range
  const filteredCostEntries = useMemo(() => {
    return costEntries.filter((c) => {
      if (filterProject && String(c.project_id) !== String(filterProject)) return false;
      const postedDate = String(c.posted_at || c.created_at || '').slice(0, 10);
      if (filterDateFrom && postedDate && postedDate < filterDateFrom) return false;
      if (filterDateTo && postedDate && postedDate > filterDateTo) return false;
      return true;
    });
  }, [costEntries, filterProject, filterDateFrom, filterDateTo]);

  const filteredRevenueEntries = useMemo(() => {
    return revenueEntries.filter((r) => {
      if (filterProject && String(r.project_id) !== String(filterProject)) return false;
      const postedDate = String(r.posted_at || r.created_at || '').slice(0, 10);
      if (filterDateFrom && postedDate && postedDate < filterDateFrom) return false;
      if (filterDateTo && postedDate && postedDate > filterDateTo) return false;
      return true;
    });
  }, [revenueEntries, filterProject, filterDateFrom, filterDateTo]);

  // Recalculate metrics accurately
  const getCostValue = (c: CostSubledgerRead): number => {
    return Number(c.total_cost_base ?? c.total_cost ?? c.amount ?? 0);
  };

  const getRevValue = (r: RevenueSubledgerRead): number => {
    return Number(r.total_revenue_base ?? r.total_revenue ?? r.amount ?? 0);
  };

  const totalCost = useMemo(() => {
    return filteredCostEntries.reduce((sum, c) => sum + getCostValue(c), 0);
  }, [filteredCostEntries]);

  const totalRev = useMemo(() => {
    return filteredRevenueEntries.reduce((sum, r) => sum + getRevValue(r), 0);
  }, [filteredRevenueEntries]);

  // Search and Sort (Recent Items First)
  const searchedCostEntries = useMemo(() => {
    return filteredCostEntries
      .filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          (c.cost_category || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.currency || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.posted_at || a.created_at || 0).getTime();
        const dateB = new Date(b.posted_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });
  }, [filteredCostEntries, search]);

  const searchedRevenueEntries = useMemo(() => {
    return filteredRevenueEntries
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const cat = (r.revenue_category || r.category || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return cat.includes(q) || desc.includes(q) || (r.currency || '').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const dateA = new Date(a.posted_at || a.created_at || 0).getTime();
        const dateB = new Date(b.posted_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });
  }, [filteredRevenueEntries, search]);

  // Reset page when search changes
  useEffect(() => {
    setCostPage(1);
    setRevenuePage(1);
  }, [search, filterProject, filterDateFrom, filterDateTo]);

  // Paginated Slices
  const paginatedCostEntries = useMemo(() => {
    const start = (costPage - 1) * itemsPerPage;
    return searchedCostEntries.slice(start, start + itemsPerPage);
  }, [searchedCostEntries, costPage]);

  const totalCostPages = Math.max(1, Math.ceil(searchedCostEntries.length / itemsPerPage));

  const paginatedRevenueEntries = useMemo(() => {
    const start = (revenuePage - 1) * itemsPerPage;
    return searchedRevenueEntries.slice(start, start + itemsPerPage);
  }, [searchedRevenueEntries, revenuePage]);

  const totalRevenuePages = Math.max(1, Math.ceil(searchedRevenueEntries.length / itemsPerPage));

  // Contract Completion Tracking helpers
  const getContractEarnedRevenue = (contract: ProjectContractRead): number => {
    return revenueEntries.reduce((sum, r) => {
      const matchProject = contract.project_id && String(r.project_id) === String(contract.project_id);
      const matchContract = (r as any).contract_id && String((r as any).contract_id) === String(contract.id);
      if (matchProject || matchContract) {
        return sum + getRevValue(r);
      }
      return sum;
    }, 0);
  };

  const getContractCompletionStats = (contract: ProjectContractRead) => {
    const totalVal = Number(contract.total_contract_value || 0);
    const earnedVal = getContractEarnedRevenue(contract);
    const finPct = totalVal > 0 ? Math.min(100, Math.round((earnedVal / totalVal) * 1000) / 10) : 0;

    let timePct = 0;
    let elapsedDays = 0;
    let totalDays = 0;

    if (contract.start_date && contract.end_date) {
      const startMs = new Date(contract.start_date).getTime();
      const endMs = new Date(contract.end_date).getTime();
      const nowMs = Date.now();
      totalDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
      elapsedDays = Math.max(0, Math.round((nowMs - startMs) / (1000 * 60 * 60 * 24)));
      timePct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 1000) / 10));
    }

    let status = 'ON_TRACK';
    let statusLabel = 'On Track';
    let badgeColor = 'bg-blue-500/10 text-blue-600 border-blue-500/20';

    if (finPct >= 100 || contract.status === 'COMPLETED') {
      status = 'COMPLETED';
      statusLabel = 'Completed';
      badgeColor = 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    } else if (finPct >= timePct + 5) {
      status = 'AHEAD';
      statusLabel = 'Ahead of Schedule';
      badgeColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    } else if (finPct < timePct - 5) {
      status = 'BEHIND';
      statusLabel = 'Behind Schedule';
      badgeColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    }

    return {
      earnedVal,
      totalVal,
      remainingVal: Math.max(0, totalVal - earnedVal),
      finPct,
      timePct,
      elapsedDays,
      totalDays,
      status,
      statusLabel,
      badgeColor,
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newAtt = { name: file.name, url: url || '#' };
        if (isEdit) {
          setEditingContract((prev) =>
            prev
              ? {
                  ...prev,
                  attachments: [...(prev.attachments || []), newAtt],
                }
              : prev
          );
        } else {
          setFormContract((prev) => ({
            ...prev,
            attachments: [...prev.attachments, newAtt],
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
      setEditingContract((prev) =>
        prev
          ? {
              ...prev,
              attachments: [...(prev.attachments || []), newAtt],
            }
          : prev
      );
    } else {
      setFormContract((prev) => ({
        ...prev,
        attachments: [...prev.attachments, newAtt],
      }));
    }
    setNewAttachmentName('');
    setNewAttachmentUrl('');
  };

  const [errorMessage, setErrorMessage] = useState('');

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
      setErrorMessage(err.message || 'Failed to create contract');
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
        total_contract_value: editingContract.total_contract_value,
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
      setErrorMessage(err.message || 'Failed to update contract');
    }
  };

  const handleDeleteContract = async () => {
    if (!editingContract) return;
    setDeletingContract(true);
    try {
      await deleteProjectContract(editingContract.id);
      setEditingContract(null);
      if (selectedContract?.id === editingContract.id) {
        setSelectedContract(null);
      }
      setShowConfirmDelete(false);
      reload();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete contract');
    } finally {
      setDeletingContract(false);
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

  const selectedProjectName = useMemo(() => {
    if (!filterProject) return null;
    const p = projects.find((item) => String(item.id) === String(filterProject));
    return p ? p.name : filterProject;
  }, [filterProject, projects]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-500" />
            {activeTab === 'COSTS'
              ? 'Cost Subledger'
              : activeTab === 'REVENUE'
                ? 'Revenue Subledger'
                : 'Contracts'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'COSTS'
              ? 'Direct operational costs, vendor invoices, rig maintenance expenses, and cost subledger tracking'
              : activeTab === 'REVENUE'
                ? 'Automated shift revenue auto-posting, rate card calculations, and revenue subledger entries'
                : 'Commercial contract agreements, depth-banded rate cards, hourly bands, and attachments'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filters Button */}
          <button
            onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium transition ${
              hasActiveFilters
                ? 'bg-primary/10 border-primary text-primary hover:bg-primary/20'
                : 'hover:bg-muted text-foreground'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
          </button>

          {/* Refresh Button */}
          <button
            onClick={reload}
            className="flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasActiveFilters && (
        <div className="flex items-center flex-wrap gap-2 p-3 rounded-lg bg-muted/40 border border-border text-xs">
          <span className="font-semibold text-muted-foreground flex items-center gap-1 pr-1">
            <Filter className="h-3.5 w-3.5" /> Active Filters:
          </span>
          {filterProject && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
              Project: <strong>{selectedProjectName}</strong>
              <button onClick={() => setFilterProject('')} className="hover:text-primary/70 ml-1">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {(filterDateFrom || filterDateTo) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 font-medium border border-blue-500/20">
              Date Range:{' '}
              <strong>
                {filterDateFrom || 'Start'} to {filterDateTo || 'End'}
              </strong>
              <button
                onClick={() => {
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setDatePreset('all_time');
                }}
                className="hover:text-blue-700 ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearFilters}
            className="text-xs text-rose-600 font-semibold hover:underline ml-auto"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Financial Overview Strip (Focused strictly per view) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {activeTab === 'COSTS' ? (
          <>
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                TOTAL COST ENTRIES
              </span>
              <div className="text-2xl font-bold font-mono text-foreground mt-1">
                {filteredCostEntries.length}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Auto-posted & manual cost subledger items
              </p>
            </div>
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                TOTAL OPERATIONAL COSTS
              </span>
              <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
                ${totalCost.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sum of all direct site & operational cost entries
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AVERAGE COST ENTRY VALUE
              </span>
              <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
                $
                {filteredCostEntries.length > 0
                  ? Math.round(totalCost / filteredCostEntries.length).toLocaleString()
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mean value per cost subledger record
              </p>
            </div>
          </>
        ) : activeTab === 'REVENUE' ? (
          <>
              <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                REVENUE SUBLEDGER ENTRIES
              </span>
              <div className="text-2xl font-bold font-mono text-foreground mt-1">
                {filteredRevenueEntries.length}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total auto-posted revenue subledger records
              </p>
            </div>
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                TOTAL AUTO-POSTED REVENUE
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                ${totalRev.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recognized revenue from shift reports & rate cards
              </p>
            </div>
        
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AVERAGE REVENUE PER ENTRY
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                $
                {filteredRevenueEntries.length > 0
                  ? Math.round(totalRev / filteredRevenueEntries.length).toLocaleString()
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mean value per recognized revenue entry
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ACTIVE COMMERCIAL CONTRACTS
              </span>
              <div className="text-2xl font-bold font-mono text-primary mt-1">
                {contracts.length}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Master drilling & client service agreements
              </p>
            </div>
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                TOTAL CONTRACT PORTFOLIO VALUE
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                $
                {contracts
                  .reduce((sum, c) => sum + Number(c.total_contract_value || 0), 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aggregate value across active client agreements
              </p>
            </div>
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                TOTAL REVENUE BILLED / REALIZED
              </span>
              <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
                $
                {contracts
                  .reduce((sum, c) => sum + getContractEarnedRevenue(c), 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Earned revenue auto-posted from shift reports
              </p>
            </div>
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                PORTFOLIO COMPLETION RATE
              </span>
              <div className="text-2xl font-bold font-mono text-purple-600 mt-1">
                {(() => {
                  const totalVal = contracts.reduce((sum, c) => sum + Number(c.total_contract_value || 0), 0);
                  const totalEarned = contracts.reduce((sum, c) => sum + getContractEarnedRevenue(c), 0);
                  return totalVal > 0 ? (Math.round((totalEarned / totalVal) * 1000) / 10).toFixed(1) : '0.0';
                })()}%
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Financial realization % across contract portfolio
              </p>
            </div>
          </>
        )}
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
              .map((c) => {
                const stats = getContractCompletionStats(c);
                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border bg-card space-y-3 shadow-sm hover:border-primary/50 transition flex flex-col justify-between"
                  >
                    <div className="space-y-2.5 cursor-pointer" onClick={() => setSelectedContract(c)}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-medium text-muted-foreground">
                          {c.contract_number}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-600 font-semibold">
                          {c.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-base leading-snug">{c.title}</h3>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate pr-2">
                          Client:{' '}
                          <strong className="text-foreground">
                            {getClientNameForContract(c, projects, clients)}
                          </strong>
                        </span>
                        <span className="shrink-0">
                          Value:{' '}
                          <strong className="text-foreground font-semibold">
                            $
                            {Number(c.total_contract_value || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          {c.start_date || 'N/A'} {c.end_date ? `to ${c.end_date}` : ''}
                        </span>
                      </div>
                      {c.attachments && c.attachments.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                          <Paperclip className="h-3 w-3" /> {c.attachments.length} attached
                          document(s)
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3 flex justify-between items-center text-xs font-medium">
                      <span className="text-muted-foreground">
                        {c.rate_cards?.length || 0} rate bands
                      </span>
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
                );
              })}

            {contracts.length === 0 && (
              <div className="col-span-full p-8 text-center border rounded-xl bg-card text-muted-foreground">
                No commercial contracts created. Click "New Contract" to add contract rate cards and
                attachments.
              </div>
            )}
          </div>

          {/* CONTRACT COMPLETION PROGRESS TABLE & HORIZONTAL BAR CHART */}
          <div className="border rounded-xl bg-card p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Contract Completion & Pacing Matrix
                </h3>
                <p className="text-xs text-muted-foreground">
                  Comparative portfolio tracking 
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Financial Billed (%)
                </span>
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Schedule Elapsed (%)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Contract / Client</th>
                    <th className="px-4 py-3 text-right">Contract Value</th>
                    <th className="px-4 py-3 text-right">Billed / Realized</th>
                    <th className="px-4 py-3 text-center">Pacing Status</th>
                    <th className="px-4 py-3 min-w-[220px]">Financial Completion Progress</th>
                    <th className="px-4 py-3 min-w-[200px]">Schedule Timeline Progress</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
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
                    .map((c) => {
                      const stats = getContractCompletionStats(c);
                      const clientName = getClientNameForContract(c, projects, clients);
                      return (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">{c.title}</div>
                            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                              <span>{c.contract_number}</span>
                              <span>•</span>
                              <span className="text-foreground font-medium">{clientName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium">
                            ${Number(c.total_contract_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                            ${stats.earnedVal.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${stats.badgeColor}`}>
                              {stats.statusLabel}
                            </span>
                          </td>
                          {/* Horizontal Bar Chart Column for Financial Completion */}
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="font-bold text-emerald-600">{stats.finPct}%</span>
                                <span className="text-[10px] text-muted-foreground">
                                  ${stats.earnedVal.toLocaleString()} / ${stats.totalVal.toLocaleString()}
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-3 overflow-hidden border p-0.5">
                                <div
                                  className="bg-emerald-500 h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, stats.finPct)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          {/* Horizontal Bar Chart Column for Schedule Elapsed */}
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="font-bold text-blue-600">{stats.timePct}%</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {stats.elapsedDays} / {stats.totalDays} days
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border p-0.5">
                                <div
                                  className="bg-blue-500 h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, stats.timePct)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedContract(c)}
                              className="px-2.5 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 inline-flex items-center gap-1 font-medium"
                            >
                              <Eye className="h-3 w-3" /> Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {contracts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No contracts available to calculate completion progress.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REVENUE TAB */}
      {activeTab === 'REVENUE' && (
        <div className="space-y-6">
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

          <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Total Base Revenue</th>
                
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedRevenueEntries.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3 font-semibold text-xs">
                      {r.revenue_category || r.category || 'REVENUE'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.description || 'Contract Revenue Realized'}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-600 font-mono">
                      ${getRevValue(r).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">{r.currency || 'USD'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {String(r.posted_at || r.created_at || '').slice(0, 10)}
                    </td>
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
                {searchedRevenueEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No revenue auto-posted entries match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {searchedRevenueEntries.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                <div>
                  Showing <strong>{(revenuePage - 1) * itemsPerPage + 1}</strong> to{' '}
                  <strong>
                    {Math.min(revenuePage * itemsPerPage, searchedRevenueEntries.length)}
                  </strong>{' '}
                  of <strong>{searchedRevenueEntries.length}</strong> revenue entries
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setRevenuePage((p) => Math.max(1, p - 1))}
                    disabled={revenuePage === 1}
                    className="p-1 rounded border disabled:opacity-40 hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 font-medium text-foreground">
                    Page {revenuePage} of {totalRevenuePages}
                  </span>
                  <button
                    onClick={() => setRevenuePage((p) => Math.min(totalRevenuePages, p + 1))}
                    disabled={revenuePage >= totalRevenuePages}
                    className="p-1 rounded border disabled:opacity-40 hover:bg-muted"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Time Series Graphs for Revenue Categories (2-Column Grid) */}
          <div className="space-y-3 pt-4 border-t">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Revenue Category Performance Over Time
              </h2>
              <p className="text-xs text-muted-foreground">
                Trend analysis per revenue category item side-by-side
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Related Pair 1: DRILLING_METERAGE & STANDBY_TIME */}
              <CategoryTimeSeriesChart
                title="DRILLING_METERAGE"
                subtitle="Meterage drilling production revenue"
                categoryKey="DRILLING_METERAGE"
                entries={filteredRevenueEntries}
                valueGetter={getRevValue}
                color="#10b981"
                isCost={false}
              />
              <CategoryTimeSeriesChart
                title="STANDBY_TIME"
                subtitle="Client approved standby revenue"
                categoryKey="STANDBY_TIME"
                entries={filteredRevenueEntries}
                valueGetter={getRevValue}
                color="#06b6d4"
                isCost={false}
              />

              {/* Related Pair 2: DAYWORK & MOBILIZATION */}
              <CategoryTimeSeriesChart
                title="DAYWORK"
                subtitle="Daywork & hourly rate operations revenue"
                categoryKey="DAYWORK"
                entries={filteredRevenueEntries}
                valueGetter={getRevValue}
                color="#3b82f6"
                isCost={false}
              />
              <CategoryTimeSeriesChart
                title="MOBILIZATION"
                subtitle="Rig mobilization & demob fee revenue"
                categoryKey="MOBILIZATION"
                entries={filteredRevenueEntries}
                valueGetter={getRevValue}
                color="#8b5cf6"
                isCost={false}
              />

              {/* Related Pair 3: REIMBURSABLE */}
              <div className="lg:col-span-2">
                <CategoryTimeSeriesChart
                  title="REIMBURSABLE"
                  subtitle="Pass-through client reimbursable costs & consumables"
                  categoryKey="REIMBURSABLE"
                  entries={filteredRevenueEntries}
                  valueGetter={getRevValue}
                  color="#f59e0b"
                  isCost={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COSTS TAB */}
      {activeTab === 'COSTS' && (
        <div className="space-y-6">
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

          <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
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
                {paginatedCostEntries.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3 font-semibold text-xs">{c.cost_category}</td>
                    <td className="px-4 py-3 text-xs">{c.description}</td>
                    <td className="px-4 py-3 font-bold text-rose-600 font-mono">
                      ${getCostValue(c).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {String(c.posted_at || c.created_at || '').slice(0, 10)}
                    </td>
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
                {searchedCostEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No cost subledger entries match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {searchedCostEntries.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                <div>
                  Showing <strong>{(costPage - 1) * itemsPerPage + 1}</strong> to{' '}
                  <strong>{Math.min(costPage * itemsPerPage, searchedCostEntries.length)}</strong>{' '}
                  of <strong>{searchedCostEntries.length}</strong> cost entries
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCostPage((p) => Math.max(1, p - 1))}
                    disabled={costPage === 1}
                    className="p-1 rounded border disabled:opacity-40 hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 font-medium text-foreground">
                    Page {costPage} of {totalCostPages}
                  </span>
                  <button
                    onClick={() => setCostPage((p) => Math.min(totalCostPages, p + 1))}
                    disabled={costPage >= totalCostPages}
                    className="p-1 rounded border disabled:opacity-40 hover:bg-muted"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Time Series Graphs for Cost Categories (2-Column Grid, Related Categories Paired) */}
          <div className="space-y-3 pt-4 border-t">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Cost Category Performance Over Time
              </h2>
              <p className="text-xs text-muted-foreground">
                Direct site cost trend analysis per category item side-by-side
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pair 1: FUEL & CONSUMABLES (Site Operational Supplies) */}
              <CategoryTimeSeriesChart
                title="FUEL"
                subtitle="Diesel, lubricants & rig fuel consumption"
                categoryKey="FUEL"
                entries={filteredCostEntries}
                valueGetter={getCostValue}
                color="#f43f5e"
                isCost={true}
              />
              <CategoryTimeSeriesChart
                title="CONSUMABLES"
                subtitle="Drilling core bits, mud, polymers & consumables"
                categoryKey="CONSUMABLES"
                entries={filteredCostEntries}
                valueGetter={getCostValue}
                color="#f59e0b"
                isCost={true}
              />

              {/* Pair 2: LABOUR & SUBCONTRACTOR (Workforce & Subcontracting) */}
              <CategoryTimeSeriesChart
                title="LABOUR"
                subtitle="Field drillers, offsiders & site crew compensation"
                categoryKey="LABOUR"
                entries={filteredCostEntries}
                valueGetter={getCostValue}
                color="#3b82f6"
                isCost={true}
              />
              <CategoryTimeSeriesChart
                title="SUBCONTRACTOR"
                subtitle="Specialist site contractors & earthmoving services"
                categoryKey="SUBCONTRACTOR"
                entries={filteredCostEntries}
                valueGetter={getCostValue}
                color="#6366f1"
                isCost={true}
              />

              {/* Pair 3: MAINTENANCE_PARTS & CAMP (Maintenance & Facilities) */}
              <CategoryTimeSeriesChart
                title="MAINTENANCE_PARTS"
                subtitle="Rig maintenance spares & mechanical repairs"
                categoryKey="MAINTENANCE_PARTS"
                entries={filteredCostEntries}
                valueGetter={getCostValue}
                color="#10b981"
                isCost={true}
              />
              <CategoryTimeSeriesChart
                title="CAMP"
                subtitle="Field camp catering, housing & accommodation"
                categoryKey="CAMP"
                entries={filteredCostEntries}
                valueGetter={getCostValue}
                color="#14b8a6"
                isCost={true}
              />

              {/* Pair 4: LOGISTICS & OVERHEAD (Transport & Administration) */}
              <CategoryTimeSeriesChart
                title="LOGISTICS"
                subtitle="Equipment freight, mobilization & transport"
                categoryKey="LOGISTICS"
                entries={filteredCostEntries}
                valueGetter={getCostValue}
                color="#a855f7"
                isCost={true}
              />
              <CategoryTimeSeriesChart
                title="OVERHEAD"
                subtitle="Site administration, permits & overhead expenses"
                categoryKey="OVERHEAD"
                entries={filteredCostEntries}
                valueGetter={getCostValue}
                color="#64748b"
                isCost={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* FILTER POPUP MODAL */}
      {showFilterModal && (
        <Modal title="Filter Subledger Telemetry" onClose={() => setShowFilterModal(false)}>
          <div className="space-y-4 text-sm p-1">
            {/* Project Filter */}
            <div>
              <label className="block text-xs font-semibold mb-1">Filter by Project</label>
              <SearchableProjectSelect
                projects={projects}
                value={filterProject}
                onChange={setFilterProject}
                placeholder="All Projects"
              />
            </div>

            {/* Date Quick Presets */}
            <div>
              <label className="block text-xs font-semibold mb-1.5">Date Range Quick Presets</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all_time', label: 'All Time' },
                  { id: 'last_30', label: 'Last 30 Days' },
                  { id: 'last_90', label: 'Last 90 Days' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'ytd', label: 'Year To Date' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyDatePreset(item.id)}
                    className={`px-3 py-1 rounded text-xs font-medium border transition ${
                      datePreset === item.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Pickers */}
            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div>
                <label className="block text-xs font-medium mb-1">Start Date</label>
                <AppDateTimePicker
                  mode="date"
                  value={filterDateFrom}
                  onChange={(val) => {
                    setFilterDateFrom(val);
                    setDatePreset('custom');
                  }}
                  placeholder="Start date"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">End Date</label>
                <AppDateTimePicker
                  mode="date"
                  value={filterDateTo}
                  onChange={(val) => {
                    setFilterDateTo(val);
                    setDatePreset('custom');
                  }}
                  placeholder="End date"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-rose-600 font-semibold hover:underline"
              >
                Reset All Filters
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-2 border rounded text-xs hover:bg-muted font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-semibold hover:bg-primary/90"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* VIEW COST ENTRY DETAILS MODAL */}
      {selectedCostEntry && (
        <Modal
          title={`Cost Subledger Entry Details: ${String(selectedCostEntry.id).slice(0, 8)}`}
          onClose={() => setSelectedCostEntry(null)}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <span className="text-xs text-muted-foreground block">Cost Category</span>
                <span className="font-bold text-base text-foreground">
                  {selectedCostEntry.cost_category}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Total Base Cost</span>
                <span className="font-mono text-lg font-bold text-rose-600">
                  ${getCostValue(selectedCostEntry).toLocaleString()}{' '}
                  {selectedCostEntry.currency || 'USD'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground block">Description</span>
                <span className="font-medium text-foreground">
                  {selectedCostEntry.description || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Posted Date</span>
                <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {String(
                    selectedCostEntry.posted_at || selectedCostEntry.created_at || 'N/A'
                  ).slice(0, 10)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Project</span>
                <span className="font-semibold text-foreground">
                  {projects.find((p) => String(p.id) === String(selectedCostEntry.project_id))
                    ?.name || String(selectedCostEntry.project_id || 'N/A')}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Quantity & Unit Cost</span>
                <span className="font-medium text-foreground">
                  {selectedCostEntry.quantity != null
                    ? `${selectedCostEntry.quantity} ${selectedCostEntry.unit_of_measure || 'units'} @ $${Number(selectedCostEntry.unit_cost || 0).toLocaleString()}`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Source Reference</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {selectedCostEntry.shift_report_id
                    ? `Shift Report: ${String(selectedCostEntry.shift_report_id).slice(0, 8)}`
                    : 'Manual Posting'}
                </span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCostEntry(null)}
                className="px-4 py-2 border rounded hover:bg-muted text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* VIEW REVENUE ENTRY DETAILS MODAL */}
      {selectedRevenueEntry && (
        <Modal
          title={`Revenue Subledger Entry Details: ${String(selectedRevenueEntry.id).slice(0, 8)}`}
          onClose={() => setSelectedRevenueEntry(null)}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <span className="text-xs text-muted-foreground block">Revenue Category</span>
                <span className="font-bold text-base text-foreground">
                  {selectedRevenueEntry.revenue_category ||
                    selectedRevenueEntry.category ||
                    'REVENUE'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Total Base Revenue</span>
                <span className="font-mono text-lg font-bold text-emerald-600">
                  ${getRevValue(selectedRevenueEntry).toLocaleString()}{' '}
                  {selectedRevenueEntry.currency || 'USD'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground block">Description</span>
                <span className="font-medium text-foreground">
                  {selectedRevenueEntry.description || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Posted Date</span>
                <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {String(
                    selectedRevenueEntry.posted_at || selectedRevenueEntry.created_at || 'N/A'
                  ).slice(0, 10)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Project</span>
                <span className="font-semibold text-foreground">
                  {projects.find((p) => String(p.id) === String(selectedRevenueEntry.project_id))
                    ?.name || String(selectedRevenueEntry.project_id || 'N/A')}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Quantity & Unit Rate</span>
                <span className="font-medium text-foreground">
                  {selectedRevenueEntry.quantity != null
                    ? `${selectedRevenueEntry.quantity} @ $${Number(selectedRevenueEntry.unit_rate || 0).toLocaleString()}`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Contract / Rate Card</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {selectedRevenueEntry.contract_id
                    ? `Contract: ${String(selectedRevenueEntry.contract_id).slice(0, 8)}`
                    : 'Shift Rate Calculation'}
                </span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRevenueEntry(null)}
                className="px-4 py-2 border rounded hover:bg-muted text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* VIEW CONTRACT DETAILS MODAL */}
      {selectedContract && (
        <Modal
          title={`Contract Details: ${selectedContract.contract_number}`}
          onClose={() => setSelectedContract(null)}
        >
          <div className="space-y-6 text-sm">
            {/* Metadata Header */}
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <span className="text-xs text-muted-foreground block">Contract Title</span>
                <span className="font-bold text-base text-foreground">
                  {selectedContract.title}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">
                  Status, Currency & Value
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-600 font-semibold">
                    {selectedContract.status}
                  </span>
                  <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded">
                    {selectedContract.currency}
                  </span>
                  <span className="font-bold text-xs text-foreground bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    $
                    {Number(selectedContract.total_contract_value || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">Client</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  {getClientNameForContract(selectedContract, projects, clients)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Project</span>
                <span className="font-medium text-foreground">
                  {projects.find((p) => p.id === selectedContract.project_id)?.name ||
                    selectedContract.project_id ||
                    'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Contract Duration</span>
                <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {selectedContract.start_date || 'N/A'}{' '}
                  {selectedContract.end_date ? `to ${selectedContract.end_date}` : ''}
                </span>
              </div>

              {selectedContract.notes && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground block">Notes & Terms</span>
                  <p className="text-xs text-foreground mt-1 bg-muted/30 p-2.5 rounded border">
                    {selectedContract.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Contract Completion & Realization Tracking */}

            {(() => {
              const stats = getContractCompletionStats(selectedContract);
              return (
                <div className="p-4 rounded-xl border bg-muted/20 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <h4 className="font-bold text-sm text-foreground">
                        Contract Completion & Realization Tracking
                      </h4>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-xs font-bold border ${stats.badgeColor}`}>
                      {stats.statusLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg border bg-card">
                      <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                        Recognized Revenue
                      </span>
                      <span className="text-lg font-mono font-bold text-emerald-600">
                        ${stats.earnedVal.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {stats.finPct}% of total contract value
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border bg-card">
                      <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                        Unbilled Remaining Value
                      </span>
                      <span className="text-lg font-mono font-bold text-foreground">
                        ${stats.remainingVal.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {(100 - Math.min(100, stats.finPct)).toFixed(1)}% remaining balance
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border bg-card">
                      <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                        Schedule Duration
                      </span>
                      <span className="text-lg font-mono font-bold text-blue-600">
                        {stats.elapsedDays} / {stats.totalDays} Days
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {stats.timePct}% timeline duration elapsed
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Financial Realization Progress</span>
                        <span className="font-mono text-emerald-600">{stats.finPct}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border">
                        <div
                          className="bg-emerald-500 h-2.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, stats.finPct)}%` }}
                        />
                      </div>
                    </div>

                    {stats.totalDays > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>Timeline / Schedule Duration Elapsed</span>
                          <span className="font-mono text-blue-600">{stats.timePct}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden border">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, stats.timePct)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Depth-Banded Rate Cards */}
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-500" />

                Depth-Banded Rates ({selectedContract.rate_cards?.length || 0})
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
                        <td className="p-2 font-bold text-emerald-600">
                          ${Number(rc.unit_rate).toFixed(2)}
                        </td>
                        <td className="p-2 text-muted-foreground">{rc.description || '—'}</td>
                      </tr>
                    ))}
                    {(!selectedContract.rate_cards || selectedContract.rate_cards.length === 0) && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted-foreground">
                          No rate cards defined for this contract.
                        </td>
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
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium truncate">{att.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openUniversalFileViewer({ fileUrl: att.url, fileName: att.name || 'Contract attachment', title: 'Contract attachment' })}
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
                    No documents attached to this contract. Click Edit Contract to attach tender
                    files or rate specs.
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
        <Modal
          title={`Edit Commercial Contract: ${editingContract.contract_number}`}
          onClose={() => setEditingContract(null)}
        >
          <form onSubmit={handleUpdateContract} className="space-y-4 text-sm p-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Contract Number</label>
                <input
                  type="text"
                  required
                  value={editingContract.contract_number}
                  onChange={(e) =>
                    setEditingContract({ ...editingContract, contract_number: e.target.value })
                  }
                  className="w-full border rounded p-2 bg-background text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Contract Title</label>
                <input
                  type="text"
                  required
                  value={editingContract.title}
                  onChange={(e) =>
                    setEditingContract({ ...editingContract, title: e.target.value })
                  }
                  className="w-full border rounded p-2 bg-background text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Start Date</label>
                <AppDateTimePicker
                  mode="date"
                  required
                  value={editingContract.start_date || ''}
                  onChange={(val) =>
                    setEditingContract({ ...editingContract, start_date: val })
                  }
                  placeholder="Start date"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">End Date</label>
                <AppDateTimePicker
                  mode="date"
                  value={editingContract.end_date || ''}
                  onChange={(val) =>
                    setEditingContract({ ...editingContract, end_date: val })
                  }
                  placeholder="End date"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <SearchableSelect
                  value={editingContract.status}
                  onChange={(val) =>
                    setEditingContract({ ...editingContract, status: val })
                  }
                  options={[
                    { value: 'ACTIVE', label: 'ACTIVE' },
                    { value: 'DRAFT', label: 'DRAFT' },
                    { value: 'EXPIRED', label: 'EXPIRED' },
                    { value: 'SUPERSEDED', label: 'SUPERSEDED' },
                  ]}
                  searchable={false}
                  ariaLabel="Contract status"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Currency</label>
                <input
                  type="text"
                  required
                  value={editingContract.currency}
                  onChange={(e) =>
                    setEditingContract({ ...editingContract, currency: e.target.value })
                  }
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
                  onChange={(e) =>
                    setEditingContract({
                      ...editingContract,
                      total_contract_value:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
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
                  <label className="block text-xs font-bold">
                    Rate Cards (Depth & Hourly Bands)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Billable commercial rates per metre drilled, standby hour, or flat mobilization
                    fee
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingContract({
                      ...editingContract,
                      rate_cards: [
                        ...(editingContract.rate_cards || []),
                        {
                          rate_type: 'DRILLING_METER',
                          drilling_method: '',
                          depth_from_m: 0,
                          depth_to_m: 100,
                          unit_rate: 50.0,
                          description: '',
                        },
                      ],
                    })
                  }
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
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-1.5 items-center p-2 rounded border bg-muted/20 text-xs"
                  >
                    <div className="col-span-2">
                      <SearchableSelect
                        value={rc.rate_type}
                        onChange={(val) => {
                          const updated = [...(editingContract.rate_cards || [])];
                          updated[idx].rate_type = val;
                          setEditingContract({ ...editingContract, rate_cards: updated });
                        }}
                        options={[
                          { value: 'DRILLING_METER', label: 'DRILLING_METER' },
                          { value: 'STANDBY_HOURLY', label: 'STANDBY_HOURLY' },
                          { value: 'MOBILIZATION_FLAT', label: 'MOBILIZATION_FLAT' },
                          { value: 'DEMOBILIZATION_FLAT', label: 'DEMOBILIZATION_FLAT' },
                          { value: 'DAYWORK_HOURLY', label: 'DAYWORK_HOURLY' },
                        ]}
                        searchable={false}
                        ariaLabel="Rate type"
                      />
                    </div>

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
                        updated[idx].depth_from_m =
                          e.target.value === '' ? null : Number(e.target.value);
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
                        updated[idx].depth_to_m =
                          e.target.value === '' ? null : Number(e.target.value);
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
                        const updated = (editingContract.rate_cards || []).filter(
                          (_, i) => i !== idx
                        );
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
              <label className="block text-xs font-bold mb-2">
                Contract Document Attachments (Multiple Allowed)
              </label>

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
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded border bg-muted/20 text-xs"
                  >
                    <span className="font-medium truncate pr-2 flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-blue-500" /> {att.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (editingContract.attachments || []).filter(
                          (_, i) => i !== idx
                        );
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

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                {showConfirmDelete ? (
                  <div className="flex items-center gap-2 bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                    <span className="text-xs text-rose-600 font-semibold">Delete contract?</span>
                    <button
                      type="button"
                      onClick={handleDeleteContract}
                      disabled={deletingContract}
                      className="px-2.5 py-1 text-xs bg-rose-600 text-white rounded font-semibold hover:bg-rose-700"
                    >
                      {deletingContract ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-2.5 py-1 text-xs border rounded hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded hover:bg-rose-700 flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Contract
                  </button>
                )}
              </div>
              <div className="flex gap-2">
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
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE CONTRACT MODAL */}
      {showAddContract && (
        <Modal title="Create Commercial Contract" onClose={() => setShowAddContract(false)}>
          <form onSubmit={handleCreateContract} className="space-y-4 text-sm p-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Target Project</label>
                <SearchableProjectSelect
                  projects={projects}
                  value={formContract.project_id}
                  onChange={(val) => setFormContract({ ...formContract, project_id: val })}
                  placeholder="Select Project..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Contract Number</label>
                <input
                  type="text"
                  required
                  value={formContract.contract_number}
                  onChange={(e) =>
                    setFormContract({ ...formContract, contract_number: e.target.value })
                  }
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
                <AppDateTimePicker
                  mode="date"
                  required
                  value={formContract.start_date}
                  onChange={(val) => setFormContract({ ...formContract, start_date: val })}
                  placeholder="Start date"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">End Date</label>
                <AppDateTimePicker
                  mode="date"
                  value={formContract.end_date}
                  onChange={(val) => setFormContract({ ...formContract, end_date: val })}
                  placeholder="End date"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <SearchableSelect
                  value={formContract.status}
                  onChange={(val) => setFormContract({ ...formContract, status: val })}
                  options={[
                    { value: 'ACTIVE', label: 'ACTIVE' },
                    { value: 'DRAFT', label: 'DRAFT' },
                    { value: 'EXPIRED', label: 'EXPIRED' },
                    { value: 'SUPERSEDED', label: 'SUPERSEDED' },
                  ]}
                  searchable={false}
                  ariaLabel="Contract status"
                />
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
                  onChange={(e) =>
                    setFormContract({
                      ...formContract,
                      total_contract_value: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
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
                  <label className="block text-xs font-bold">
                    Rate Cards (Depth & Hourly Bands)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Billable commercial rates per metre drilled, standby hour, or flat mobilization
                    fee
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormContract({
                      ...formContract,
                      rate_cards: [
                        ...formContract.rate_cards,
                        {
                          rate_type: 'DRILLING_METER',
                          drilling_method: '',
                          depth_from_m: 0,
                          depth_to_m: 100,
                          unit_rate: 50.0,
                          description: '',
                        },
                      ],
                    })
                  }
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
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-1.5 items-center p-2 rounded border bg-muted/20 text-xs"
                  >
                    <div className="col-span-2">
                      <SearchableSelect
                        value={rc.rate_type}
                        onChange={(val) => {
                          const updated = [...formContract.rate_cards];
                          updated[idx].rate_type = val;
                          setFormContract({ ...formContract, rate_cards: updated });
                        }}
                        options={[
                          { value: 'DRILLING_METER', label: 'DRILLING_METER' },
                          { value: 'STANDBY_HOURLY', label: 'STANDBY_HOURLY' },
                          { value: 'MOBILIZATION_FLAT', label: 'MOBILIZATION_FLAT' },
                          { value: 'DEMOBILIZATION_FLAT', label: 'DEMOBILIZATION_FLAT' },
                          { value: 'DAYWORK_HOURLY', label: 'DAYWORK_HOURLY' },
                        ]}
                        searchable={false}
                        ariaLabel="Rate type"
                      />
                    </div>

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
                        updated[idx].depth_from_m =
                          e.target.value === '' ? null : Number(e.target.value);
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
                        updated[idx].depth_to_m =
                          e.target.value === '' ? null : Number(e.target.value);
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
              <label className="block text-xs font-bold mb-2">
                Contract File Attachments (Multiple Allowed)
              </label>

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
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded border bg-muted/20 text-xs"
                  >
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

      <ErrorModal error={errorMessage} onClose={() => setErrorMessage('')} />
    </div>
  );
}
