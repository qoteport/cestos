'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Plus, RefreshCw, CheckCircle2, Clock, FileText, Layers, CheckSquare
} from 'lucide-react';
import { apiFetch, HseIncidentRead, HseActionRead } from '@/lib/api';
import { Modal } from './DataUI';

export default function HseIncidentsWorkspace() {
  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'CAPA'>('INCIDENTS');
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<HseIncidentRead[]>([]);
  const [version, setVersion] = useState(0);

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
            </tr>
          </thead>
          <tbody className="divide-y">
            {(Array.isArray(incidents) ? incidents : []).map((inc) => (
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
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No HSE incidents recorded. Click "Report HSE Incident" to file near-misses or safety logs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NEW INCIDENT MODAL */}
      {showAddIncident && (
        <Modal title="Report HSE Incident / Near-Miss" onClose={() => setShowAddIncident(false)}>
          <form onSubmit={handleCreateIncident} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Incident Type</label>
                <select
                  value={newIncident.incident_type}
                  onChange={(e) => setNewIncident({ ...newIncident, incident_type: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="NEAR_MISS">NEAR_MISS</option>
                  <option value="FIRST_AID">FIRST_AID</option>
                  <option value="MEDICAL_TREATMENT">MEDICAL_TREATMENT</option>
                  <option value="LOST_TIME_INJURY">LOST_TIME_INJURY</option>
                  <option value="ENVIRONMENTAL_SPILL">ENVIRONMENTAL_SPILL</option>
                  <option value="PROPERTY_DAMAGE">PROPERTY_DAMAGE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Severity</label>
                <select
                  value={newIncident.severity}
                  onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddIncident(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Submit Incident Report
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
