'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Plus, RefreshCw, CheckCircle2, Clock, FileText, Layers, CheckSquare, Search, Eye
} from 'lucide-react';
import { apiFetch, HseIncidentRead, HseActionRead } from '@/lib/api';
import { Modal } from './DataUI';
import SearchableSelect from './SearchableSelect';

export default function HseIncidentsWorkspace({ subResource }: { subResource?: string }) {
  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'CAPA'>('INCIDENTS');
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<HseIncidentRead[]>([]);
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<HseIncidentRead | null>(null);

  // New Incident Form State
  const [showAddIncident, setShowAddIncident] = useState(false);
  const [newIncident, setNewIncident] = useState({
    incident_type: 'NEAR_MISS',
    severity: 'LOW',
    title: '',
    description: '',
    occurred_at: new Date().toISOString(),
  });

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiFetch<HseIncidentRead[]>('/api/v1/hse/incidents')
      .then((res) => {
        if (!active) return;
        setIncidents(Array.isArray(res) ? res : []);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [version]);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/hse/incidents', {
        method: 'POST',
        body: JSON.stringify(newIncident),
      });
      setShowAddIncident(false);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create HSE incident');
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  const filteredIncidents = (Array.isArray(incidents) ? incidents : []).filter((inc) =>
    !search || (inc.title || '').toLowerCase().includes(search.toLowerCase()) || (inc.incident_number || '').toLowerCase().includes(search.toLowerCase()) || (inc.incident_type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            HSE Incident & CAPA Action Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Near-miss reports, lost-time injury tracking, root cause analysis, and corrective actions (CAPA)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search HSE incidents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg bg-background"
            />
          </div>
          <button
            onClick={reload}
            className="flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddIncident(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Report HSE Incident
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b space-x-4">
        <button
          onClick={() => setActiveTab('INCIDENTS')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'INCIDENTS'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Incidents & Near-Misses ({incidents.length})
        </button>
      </div>

      {/* INCIDENTS LIST */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Incident #</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Title & Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredIncidents.map((inc) => (
              <tr key={inc.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono font-medium text-xs">{inc.incident_number}</td>
                <td className="px-4 py-3 font-semibold text-xs">{inc.incident_type}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${getSeverityBadge(inc.severity)}`}>
                    {inc.severity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <strong className="block">{inc.title}</strong>
                  <span className="text-xs text-muted-foreground line-clamp-1">{inc.description}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {inc.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{inc.occurred_at?.slice(0, 10)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelectedIncident(inc)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredIncidents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No HSE incidents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* VIEW INCIDENT DETAILS MODAL */}
      {selectedIncident && (
        <Modal title={`HSE Incident - ${selectedIncident.incident_number}`} onClose={() => setSelectedIncident(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 border-b pb-3">
              <div>
                <span className="text-xs text-muted-foreground block">Incident Type</span>
                <span className="font-semibold">{selectedIncident.incident_type}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Severity</span>
                <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${getSeverityBadge(selectedIncident.severity)}`}>
                  {selectedIncident.severity}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Status</span>
                <span className="font-semibold text-primary">{selectedIncident.status}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Occurred At</span>
                <span className="font-mono text-xs">{selectedIncident.occurred_at}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Title</h4>
              <p className="font-semibold text-base">{selectedIncident.title}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Description & Immediate Actions</h4>
              <p className="text-xs text-muted-foreground p-3 border rounded-lg bg-muted/20 whitespace-pre-wrap">{selectedIncident.description}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* NEW INCIDENT MODAL */}
      {showAddIncident && (
        <Modal
          title="Report HSE Incident / Near-Miss"
          onClose={() => setShowAddIncident(false)}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowAddIncident(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="hse-add-incident-form"
                className="px-5 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition shadow-sm"
              >
                Submit Incident Report
              </button>
            </div>
          }
        >
          <form id="hse-add-incident-form" onSubmit={handleCreateIncident} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Incident Type</label>
                <SearchableSelect
                  value={newIncident.incident_type}
                  onChange={(val) => setNewIncident({ ...newIncident, incident_type: val })}
                  options={[
                    { value: 'NEAR_MISS', label: 'NEAR_MISS' },
                    { value: 'FIRST_AID', label: 'FIRST_AID' },
                    { value: 'MEDICAL_TREATMENT', label: 'MEDICAL_TREATMENT' },
                    { value: 'LOST_TIME_INJURY', label: 'LOST_TIME_INJURY' },
                    { value: 'ENVIRONMENTAL_SPILL', label: 'ENVIRONMENTAL_SPILL' },
                    { value: 'PROPERTY_DAMAGE', label: 'PROPERTY_DAMAGE' },
                  ]}
                  searchable={false}
                  ariaLabel="Incident Type"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Severity</label>
                <SearchableSelect
                  value={newIncident.severity}
                  onChange={(val) => setNewIncident({ ...newIncident, severity: val })}
                  options={[
                    { value: 'LOW', label: 'LOW' },
                    { value: 'MEDIUM', label: 'MEDIUM' },
                    { value: 'HIGH', label: 'HIGH' },
                    { value: 'CRITICAL', label: 'CRITICAL' },
                  ]}
                  searchable={false}
                  ariaLabel="Severity"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Title</label>
              <input
                type="text"
                required
                placeholder="Brief summary of incident"
                value={newIncident.title}
                onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Description & Immediate Actions Taken</label>
              <textarea
                rows={3}
                required
                placeholder="Detailed description of what occurred..."
                value={newIncident.description}
                onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              />
            </div>

          </form>
        </Modal>
      )}
    </div>
  );
}
