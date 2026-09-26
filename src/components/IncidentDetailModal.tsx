'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, ShieldAlert, AlertTriangle, Info, Calendar, MapPin, User, FileText, Printer, Pencil, Save } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import SearchableSelect from './SearchableSelect';

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  const map: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    APPROVED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300',
    WAITING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    'ACTIVE / AVAILABLE': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    SUBMITTED: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    RECEIVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
    CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    LOW: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
    UNDER_INVESTIGATION: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300',
    RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    CLOSED: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${map[s] || 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}`}>
      {s}
    </span>
  );
}

export default function IncidentDetailModal({
  incident,
  onClose,
  onUpdate,
}: {
  incident: any;
  onClose: () => void;
  onUpdate?: (updated: any) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(() => ({
    title: incident?.title || '',
    incident_type: incident?.incident_type || 'NEAR_MISS',
    severity: incident?.severity || 'MEDIUM',
    status: incident?.status || 'OPEN',
    location: incident?.location || '',
    description: incident?.description || '',
    corrective_action: incident?.corrective_action || incident?.immediate_actions_taken || '',
  }));
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState('');
  const [closing, setClosing] = useState(false);

  if (!incident) return null;

  // Calculate 10-day edit window
  const createDate = incident.created_at || incident.incident_date || incident.occurred_at;
  let daysOld = 0;
  let isEditable = true;
  if (createDate) {
    const createdTime = new Date(createDate).getTime();
    if (!isNaN(createdTime)) {
      daysOld = Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24));
      isEditable = daysOld <= 10;
    }
  }

  // Determine colors based on severity
  const severity = isEditing ? editForm.severity : (incident.severity || 'MEDIUM');
  let themeColor = 'bg-slate-500';
  let icon = <Info size={24} className="text-slate-600" />;

  if (severity === 'CRITICAL') {
    themeColor = 'bg-red-600';
    icon = <ShieldAlert size={28} className="text-red-600" />;
  } else if (severity === 'HIGH') {
    themeColor = 'bg-orange-500';
    icon = <AlertTriangle size={28} className="text-orange-600" />;
  } else if (severity === 'MEDIUM') {
    themeColor = 'bg-amber-500';
    icon = <AlertTriangle size={28} className="text-amber-600" />;
  } else {
    themeColor = 'bg-emerald-500';
    icon = <ShieldCheck size={28} className="text-emerald-600" />;
  }

  const printReport = () => {
    window.print();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setEditError('');

    try {
      const payload = {
        title: editForm.title.trim(),
        incident_type: editForm.incident_type,
        severity: editForm.severity,
        status: editForm.status,
        location: editForm.location.trim(),
        description: editForm.description.trim(),
        immediate_actions_taken: editForm.corrective_action.trim(),
      };

      await apiFetch(`/api/v1/incidents/${incident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const updated = {
        ...incident,
        ...editForm,
        corrective_action: editForm.corrective_action,
        immediate_actions_taken: editForm.corrective_action,
      };

      toast.success('HSE Incident Report updated successfully.');
      if (onUpdate) onUpdate(updated);
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update HSE report.');
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 190);
  };

  return createPortal(
    <div className={`fixed inset-0 bg-black/70 z-[99999] flex items-center justify-center p-0 sm:p-4 overflow-hidden backdrop-blur-xs print:bg-white print:p-0 ${closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'}`} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #incident-report-printable-area,
          #incident-report-printable-area * {
            visibility: visible !important;
          }
          #incident-report-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          .print\\:hidden, .print\\:hidden * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>
      <div id="incident-report-printable-area" className={`bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[95vh] max-w-full sm:max-w-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative print:shadow-none print:h-auto print:max-h-none print:w-full ${closing ? 'animate-modal-content-out' : 'animate-modal-content-in'}`}>
        
        {/* Action Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <FileText size={16} />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white tracking-wide uppercase">
              {isEditing ? 'Edit HSE Incident Report' : 'Incident Report View'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                {isEditable ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
                    title="Edit HSE report (allowed within 10 days of creation)"
                  >
                    <Pencil size={14} /> Edit Report
                  </button>
                ) : (
                  <span
                    className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-semibold cursor-not-allowed"
                    title="Edit window closed (Report was created over 10 days ago)"
                  >
                    Edit Closed (10d Limit)
                  </span>
                )}
                <button
                  type="button"
                  onClick={printReport}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Printer size={16} /> Print
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Report Content or Edit Form */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-10 space-y-6 bg-white dark:bg-slate-900 print:p-0 print:overflow-visible">
          {editError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg text-xs font-medium">
              {editError}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-[11px]">
                <strong>Note:</strong> Field Admins may update HSE incident reports within 10 days of creation. (Report created {daysOld} {daysOld === 1 ? 'day' : 'days'} ago).
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Incident Title / Summary *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Incident Type / Category *
                  </label>
                  <SearchableSelect
                    value={editForm.incident_type}
                    onChange={(val) => setEditForm({ ...editForm, incident_type: val })}
                    options={[
                      { value: 'NEAR_MISS', label: 'Near Miss' },
                      { value: 'INJURY', label: 'Injury / First Aid' },
                      { value: 'HAZARD_OBSERVATION', label: 'Hazard Observation' },
                      { value: 'ENVIRONMENTAL_SPILL', label: 'Environmental Spill' },
                      { value: 'PROPERTY_DAMAGE', label: 'Property / Equipment Damage' },
                      { value: 'SECURITY', label: 'Security Incident' },
                    ]}
                    searchable={false}
                    ariaLabel="Incident Type / Category"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Severity Level *
                  </label>
                  <SearchableSelect
                    value={editForm.severity}
                    onChange={(val) => setEditForm({ ...editForm, severity: val })}
                    options={[
                      { value: 'LOW', label: 'Low' },
                      { value: 'MEDIUM', label: 'Medium' },
                      { value: 'HIGH', label: 'High' },
                      { value: 'CRITICAL', label: 'Critical' },
                    ]}
                    searchable={false}
                    ariaLabel="Severity Level"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Incident Status *
                  </label>
                  <SearchableSelect
                    value={editForm.status}
                    onChange={(val) => setEditForm({ ...editForm, status: val })}
                    options={[
                      { value: 'OPEN', label: 'Open' },
                      { value: 'UNDER_INVESTIGATION', label: 'Under Investigation' },
                      { value: 'RESOLVED', label: 'Resolved' },
                      { value: 'CLOSED', label: 'Closed' },
                    ]}
                    searchable={false}
                    ariaLabel="Incident Status"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Location / Site Area
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Incident Narrative *
                </label>
                <textarea
                  rows={4}
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Immediate Corrective Actions Taken
                </label>
                <textarea
                  rows={3}
                  value={editForm.corrective_action}
                  onChange={(e) => setEditForm({ ...editForm, corrective_action: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow"
                >
                  <Save size={14} /> {updating ? 'Saving...' : 'Save Report Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 font-sans leading-relaxed">
              {/* Document Title Header */}
              <div className="space-y-1">
                <div className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                  Official Safety Event Report &bull; Reference #{incident.incident_number || incident.reference_number || (incident.id ? `INC-${String(incident.id).slice(0, 8).toUpperCase()}` : 'SYS-INC')}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                  {incident.title || 'Safety Event Report'}
                </h1>
              </div>

              {/* Document Key Metadata Block (Word Doc Style - No borders, no bg cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 pt-2 text-xs">
                <div>
                  <span className="block font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Incident Category</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">{String(incident.incident_type || 'INCIDENT').replaceAll('_', ' ')}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Severity Level</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">{String(incident.severity || 'MEDIUM').replaceAll('_', ' ')}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Report Status</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">{String(incident.status || 'OPEN').replaceAll('_', ' ')}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Reported By</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">{incident.reported_by || 'Field Personnel'}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Incident Date &amp; Time</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {incident.incident_date ? new Date(incident.incident_date).toLocaleString() : incident.occurred_at ? new Date(incident.occurred_at).toLocaleString() : 'Date Not Recorded'}
                  </span>
                </div>
                <div className="sm:col-span-3">
                  <span className="block font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Location / Site Area</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">{incident.location || 'Site Field Area'}</span>
                </div>
              </div>

              {/* Section 1: Detailed Incident Description */}
              <div className="pt-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  1. Detailed Incident Description
                </h3>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {incident.description || 'No additional narrative recorded for this incident.'}
                </p>
              </div>

              {/* Section 2: Immediate Corrective Actions Taken */}
              <div className="pt-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  2. Immediate Corrective Actions Taken
                </h3>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {incident.corrective_action || incident.immediate_actions_taken || 'No immediate corrective action noted.'}
                </p>
              </div>

              {/* Section 3: Official Signatures */}
              <div className="pt-8 space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  3. Official Signatures &amp; Authorization
                </h3>
                <div className="grid grid-cols-2 gap-12 pt-2">
                  <div>
                    <div className="border-b border-slate-400 dark:border-slate-600 h-10 mb-2"></div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">HSE Officer Signature</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Date: __________________</p>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 dark:border-slate-600 h-10 mb-2"></div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Site Manager Signature</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Date: __________________</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 gap-3 sticky bottom-0 z-10 print:hidden">
          <p className="text-xs text-slate-500 font-mono text-center sm:text-left">
            {isEditable ? `Editable (${10 - daysOld} days remaining in edit window)` : 'Read Only (10-day edit window expired)'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition w-full sm:w-auto"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
