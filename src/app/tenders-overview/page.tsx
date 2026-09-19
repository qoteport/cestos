'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { 
  FileSpreadsheet, TrendingUp, DollarSign, Plus, RefreshCw, Search, 
  Eye, Pencil, Paperclip, Download, Calendar, Layers, CheckCircle2, AlertTriangle, Clock 
} from 'lucide-react';
import { apiFetch, CommercialOpportunityRead, updateCommercialOpportunity } from '@/lib/api';
import { Modal, rows } from '@/components/DataUI';

export default function TendersOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<CommercialOpportunityRead[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [version, setVersion] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  // Selected & Edit modals
  const [selectedOpp, setSelectedOpp] = useState<CommercialOpportunityRead | null>(null);
  const [editingOpp, setEditingOpp] = useState<CommercialOpportunityRead | null>(null);
  const [showAddOpp, setShowAddOpp] = useState(false);

  // Form states
  const [newOpp, setNewOpp] = useState({
    client_id: '',
    title: 'HQ Diamond Coring Exploration Tender 2026',
    tender_stage: 'PROPOSAL_SENT',
    win_probability_pct: 75,
    estimated_value: 350000,
    currency: 'USD',
    expected_close_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    notes: '',
    attachment_name: '',
    attachment_url: '',
  });

  const [editOppForm, setEditOppForm] = useState({
    client_id: '',
    title: '',
    tender_stage: 'PROPOSAL_SENT',
    win_probability_pct: 70,
    estimated_value: 250000,
    currency: 'USD',
    expected_close_date: '',
    notes: '',
    attachment_name: '',
    attachment_url: '',
  });

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<CommercialOpportunityRead[]>('/api/v1/control-tower/opportunities').catch(() => []),
      apiFetch<any>('/api/v1/clients?page_size=100').catch(() => ({ items: [] })),
    ]).then(([oppRes, clientRes]) => {
      if (!active) return;
      setOpportunities(rows(oppRes) as CommercialOpportunityRead[]);
      setClients(rows(clientRes));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        if (isEdit) {
          setEditOppForm((prev) => ({
            ...prev,
            attachment_name: file.name,
            attachment_url: url,
          }));
        } else {
          setNewOpp((prev) => ({
            ...prev,
            attachment_name: file.name,
            attachment_url: url,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/control-tower/opportunities', {
        method: 'POST',
        body: JSON.stringify(newOpp),
      });
      setShowAddOpp(false);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create tender opportunity');
    }
  };

  const handleOpenEditOpp = (opp: CommercialOpportunityRead) => {
    setEditingOpp(opp);
    setEditOppForm({
      client_id: opp.client_id || '',
      title: opp.title || '',
      tender_stage: opp.tender_stage || 'PROPOSAL_SENT',
      win_probability_pct: opp.win_probability_pct ?? 70,
      estimated_value: opp.estimated_value ?? 0,
      currency: opp.currency || 'USD',
      expected_close_date: opp.expected_close_date || '',
      notes: opp.notes || '',
      attachment_name: opp.attachment_name || '',
      attachment_url: opp.attachment_url || '',
    });
  };

  const handleUpdateOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpp) return;
    try {
      const updated = await updateCommercialOpportunity(editingOpp.id, editOppForm);
      setEditingOpp(null);
      if (selectedOpp?.id === editingOpp.id) {
        setSelectedOpp(updated);
      }
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to update tender opportunity');
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

  // Metrics
  const totalVal = opportunities.reduce((acc, o) => acc + (Number(o.estimated_value) || 0), 0);
  const weightedVal = opportunities.reduce((acc, o) => acc + ((Number(o.estimated_value) || 0) * (Number(o.win_probability_pct) || 0) / 100), 0);
  const activeCount = opportunities.filter((o) => o.tender_stage !== 'WON' && o.tender_stage !== 'LOST').length;
  const avgWinProb = opportunities.length > 0 ? (opportunities.reduce((acc, o) => acc + (Number(o.win_probability_pct) || 0), 0) / opportunities.length) : 0;

  const filteredOpps = opportunities.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || (o.title || '').toLowerCase().includes(q) || (o.opportunity_number || '').toLowerCase().includes(q);
    const matchesStage = !stageFilter || o.tender_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'WON': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'LOST': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'CONTRACT_PENDING': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'IN_NEGOTIATION': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-amber-500" />
              Tender Pipeline & Commercial Opportunities
            </h1>
            <p className="text-sm text-muted-foreground">
              Commercial tender tracking, win probability analysis, estimated contract values, and bid documentation
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
              onClick={() => setShowAddOpp(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Tender
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border bg-card space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">TOTAL ESTIMATED PIPELINE</span>
            <div className="text-2xl font-bold text-foreground">${totalVal.toLocaleString()}</div>
            <span className="text-xs text-muted-foreground">{opportunities.length} total active & closed bids</span>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">WEIGHTED PIPELINE VALUE</span>
            <div className="text-2xl font-bold text-emerald-600">${weightedVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <span className="text-xs text-muted-foreground">Adjusted by win probability %</span>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ACTIVE TENDERS</span>
            <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
            <span className="text-xs text-muted-foreground">Proposals in progress & negotiation</span>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AVG WIN PROBABILITY</span>
            <div className="text-2xl font-bold text-purple-600">{avgWinProb.toFixed(1)}%</div>
            <span className="text-xs text-muted-foreground">Overall commercial win likelihood</span>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tenders by title or opportunity number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm border rounded-lg pl-9 pr-3 py-1.5 bg-background"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 bg-background"
            >
              <option value="">All Tender Stages</option>
              <option value="PROPOSAL_SENT">Proposal Sent</option>
              <option value="IN_NEGOTIATION">In Negotiation</option>
              <option value="CONTRACT_PENDING">Contract Pending</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>

          </div>
        </div>

        {/* Opportunities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOpps.map((opp) => (
            <div
              key={opp.id}
              className="p-4 rounded-xl border bg-card space-y-3 shadow-sm hover:border-primary/50 transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-muted-foreground">{opp.opportunity_number}</span>
                  <span className={`px-2 py-0.5 rounded text-xs border font-semibold ${getStageBadge(opp.tender_stage)}`}>
                    {opp.tender_stage}
                  </span>
                </div>

                <h3 className="font-bold text-base leading-snug">{opp.title}</h3>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground block">Est. Value</span>
                    <span className="font-bold text-emerald-600 text-sm">${Number(opp.estimated_value).toLocaleString()} {opp.currency}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Win Probability</span>
                    <span className="font-bold text-purple-600 text-sm">{opp.win_probability_pct}%</span>
                  </div>
                </div>

                {opp.expected_close_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Expected Close: <strong className="text-foreground">{opp.expected_close_date}</strong></span>
                  </div>
                )}

                {opp.attachment_name && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 font-medium pt-0.5">
                    <Paperclip className="h-3 w-3" /> Attachment: {opp.attachment_name}
                  </div>
                )}
              </div>

              <div className="border-t pt-3 flex items-center justify-between text-xs font-medium">
                <button
                  onClick={() => handleOpenEditOpp(opp)}
                  className="px-2.5 py-1 border rounded hover:bg-muted flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3 text-amber-600" /> Edit Tender
                </button>
                <button
                  onClick={() => setSelectedOpp(opp)}
                  className="px-2.5 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" /> View Details
                </button>
              </div>
            </div>
          ))}

          {filteredOpps.length === 0 && (
            <div className="col-span-full p-8 text-center border rounded-xl bg-card text-muted-foreground">
              No tender opportunities match the specified criteria. Click "New Tender" to register a bid.
            </div>
          )}
        </div>
      </div>

      {/* VIEW TENDER MODAL */}
      {selectedOpp && (
        <Modal title={`Tender Opportunity: ${selectedOpp.opportunity_number}`} onClose={() => setSelectedOpp(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <span className="text-xs text-muted-foreground block">Title</span>
                <span className="font-bold text-foreground text-base">{selectedOpp.title}</span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">Stage & Status</span>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs border font-semibold ${getStageBadge(selectedOpp.tender_stage)}`}>
                  {selectedOpp.tender_stage}
                </span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">Estimated Contract Value</span>
                <span className="font-bold text-emerald-600 text-lg">${Number(selectedOpp.estimated_value).toLocaleString()} {selectedOpp.currency}</span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">Win Probability</span>
                <span className="font-bold text-purple-600 text-lg">{selectedOpp.win_probability_pct}%</span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">Expected Close Date</span>
                <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> {selectedOpp.expected_close_date || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">Associated Client</span>
                <span className="font-medium text-foreground">
                  {clients.find((c) => c.id === selectedOpp.client_id)?.name || selectedOpp.client_id || 'N/A'}
                </span>
              </div>

              {selectedOpp.notes && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground block">Notes & Strategy</span>
                  <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded border mt-1">{selectedOpp.notes}</p>
                </div>
              )}
            </div>

            {/* Attached Tender File */}
            {selectedOpp.attachment_name && selectedOpp.attachment_url && (
              <div className="p-3 border rounded-lg bg-card flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <Paperclip className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-medium truncate">{selectedOpp.attachment_name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => window.open(selectedOpp.attachment_url, '_blank')}
                    className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded border hover:bg-muted flex items-center gap-1 font-medium"
                  >
                    <Eye className="h-3 w-3" /> View Document
                  </button>
                  <button
                    onClick={() => triggerDownload(selectedOpp.attachment_url!, selectedOpp.attachment_name!)}
                    className="px-2.5 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-1 font-medium"
                  >
                    <Download className="h-3 w-3" /> Download
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => setSelectedOpp(null)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleOpenEditOpp(selectedOpp);
                  setSelectedOpp(null);
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 flex items-center gap-1.5"
              >
                <Pencil className="h-4 w-4" /> Edit Opportunity
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE TENDER MODAL */}
      {showAddOpp && (
        <Modal title="Create Commercial Opportunity (Tender)" onClose={() => setShowAddOpp(false)}>
          <form onSubmit={handleCreateOpp} className="space-y-4 text-sm p-1">
            <div>
              <label className="block text-xs font-medium mb-1">Client</label>
              <select
                required
                value={newOpp.client_id}
                onChange={(e) => setNewOpp({ ...newOpp, client_id: e.target.value })}
                className="w-full text-xs border rounded p-2 bg-background"
              >
                <option value="">Select Client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Opportunity Title</label>
              <input
                type="text"
                required
                value={newOpp.title}
                onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
                className="w-full text-xs border rounded p-2 bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Tender Stage</label>
                <select
                  value={newOpp.tender_stage}
                  onChange={(e) => setNewOpp({ ...newOpp, tender_stage: e.target.value })}
                  className="w-full text-xs border rounded p-2 bg-background"
                >
                  <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
                  <option value="IN_NEGOTIATION">IN_NEGOTIATION</option>
                  <option value="CONTRACT_PENDING">CONTRACT_PENDING</option>
                  <option value="WON">WON</option>
                  <option value="LOST">LOST</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Win Probability (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newOpp.win_probability_pct}
                  onChange={(e) => setNewOpp({ ...newOpp, win_probability_pct: Number(e.target.value) })}
                  className="w-full text-xs border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Estimated Value</label>
                <input
                  type="number"
                  required
                  value={newOpp.estimated_value}
                  onChange={(e) => setNewOpp({ ...newOpp, estimated_value: Number(e.target.value) })}
                  className="w-full text-xs border rounded p-2 bg-background font-bold text-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Expected Close Date</label>
                <input
                  type="date"
                  value={newOpp.expected_close_date}
                  onChange={(e) => setNewOpp({ ...newOpp, expected_close_date: e.target.value })}
                  className="w-full text-xs border rounded p-2 bg-background"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Tender File Attachment</label>
              <input
                type="file"
                onChange={(e) => handleFileUpload(e, false)}
                className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded file:border file:text-xs file:font-medium file:bg-muted hover:file:bg-muted/80 cursor-pointer"
              />
              {newOpp.attachment_name && (
                <p className="text-xs text-blue-600 font-medium mt-1">Attached: {newOpp.attachment_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Notes & Commercial Strategy</label>
              <textarea
                rows={3}
                value={newOpp.notes}
                onChange={(e) => setNewOpp({ ...newOpp, notes: e.target.value })}
                className="w-full text-xs border rounded p-2 bg-background"
                placeholder="Key scope details, pricing assumptions, risks..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowAddOpp(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save Opportunity
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT TENDER MODAL */}
      {editingOpp && (
        <Modal title={`Edit Commercial Opportunity: ${editingOpp.opportunity_number}`} onClose={() => setEditingOpp(null)}>
          <form onSubmit={handleUpdateOpp} className="space-y-4 text-sm p-1">
            <div>
              <label className="block text-xs font-medium mb-1">Opportunity Title</label>
              <input
                type="text"
                required
                value={editOppForm.title}
                onChange={(e) => setEditOppForm({ ...editOppForm, title: e.target.value })}
                className="w-full text-xs border rounded p-2 bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Tender Stage</label>
                <select
                  value={editOppForm.tender_stage}
                  onChange={(e) => setEditOppForm({ ...editOppForm, tender_stage: e.target.value })}
                  className="w-full text-xs border rounded p-2 bg-background"
                >
                  <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
                  <option value="IN_NEGOTIATION">IN_NEGOTIATION</option>
                  <option value="CONTRACT_PENDING">CONTRACT_PENDING</option>
                  <option value="WON">WON</option>
                  <option value="LOST">LOST</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Win Probability (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editOppForm.win_probability_pct}
                  onChange={(e) => setEditOppForm({ ...editOppForm, win_probability_pct: Number(e.target.value) })}
                  className="w-full text-xs border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Estimated Value</label>
                <input
                  type="number"
                  required
                  value={editOppForm.estimated_value}
                  onChange={(e) => setEditOppForm({ ...editOppForm, estimated_value: Number(e.target.value) })}
                  className="w-full text-xs border rounded p-2 bg-background font-bold text-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Expected Close Date</label>
                <input
                  type="date"
                  value={editOppForm.expected_close_date}
                  onChange={(e) => setEditOppForm({ ...editOppForm, expected_close_date: e.target.value })}
                  className="w-full text-xs border rounded p-2 bg-background"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Tender File Attachment</label>
              <input
                type="file"
                onChange={(e) => handleFileUpload(e, true)}
                className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded file:border file:text-xs file:font-medium file:bg-muted hover:file:bg-muted/80 cursor-pointer"
              />
              {editOppForm.attachment_name && (
                <p className="text-xs text-blue-600 font-medium mt-1">Attached: {editOppForm.attachment_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Notes & Commercial Strategy</label>
              <textarea
                rows={3}
                value={editOppForm.notes}
                onChange={(e) => setEditOppForm({ ...editOppForm, notes: e.target.value })}
                className="w-full text-xs border rounded p-2 bg-background"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingOpp(null)}
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
    </AppLayout>
  );
}
