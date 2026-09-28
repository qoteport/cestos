'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { FileText, AlertTriangle, Search, RefreshCw, ArrowLeft, Eye, CheckCircle, ArrowRight, ShieldAlert, Clock } from 'lucide-react';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import { toast } from 'sonner';
import { normalizeExpiringDocument } from '@/lib/expiringDocuments';
import { Row, display } from './DataUI';

export interface ExpiringDocumentsWorkspaceProps {
  baseRoute?: string;
  colorScheme?: 'emerald' | 'indigo' | 'violet' | 'orange' | 'blue' | 'primary';
}

function getPortalTheme(schemeProp?: string, pathname?: string) {
  const path = pathname || '';
  const scheme = schemeProp || (
    path.includes('/hr-portal') ? 'emerald' :
    path.includes('/executive-portal') ? 'indigo' :
    path.includes('/finance-portal') ? 'violet' :
    path.includes('/field-admin-portal') ? 'orange' :
    'blue'
  );

  switch (scheme) {
    case 'emerald':
      return {
        text: 'text-emerald-600 dark:text-emerald-400',
        textHover: 'hover:text-emerald-700 dark:hover:text-emerald-300',
        bg: 'bg-emerald-600 text-white hover:bg-emerald-700',
        lightBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        activeToggle: 'bg-emerald-600 text-white font-bold shadow-xs',
        badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/30',
        ring: 'focus:ring-emerald-500',
      };
    case 'indigo':
      return {
        text: 'text-indigo-600 dark:text-indigo-400',
        textHover: 'hover:text-indigo-700 dark:hover:text-indigo-300',
        bg: 'bg-indigo-600 text-white hover:bg-indigo-700',
        lightBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
        activeToggle: 'bg-indigo-600 text-white font-bold shadow-xs',
        badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-500/30',
        ring: 'focus:ring-indigo-500',
      };
    case 'violet':
      return {
        text: 'text-violet-600 dark:text-violet-400',
        textHover: 'hover:text-violet-700 dark:hover:text-violet-300',
        bg: 'bg-violet-600 text-white hover:bg-violet-700',
        lightBg: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
        activeToggle: 'bg-violet-600 text-white font-bold shadow-xs',
        badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        border: 'border-violet-500/30',
        ring: 'focus:ring-violet-500',
      };
    case 'orange':
      return {
        text: 'text-orange-600 dark:text-orange-400',
        textHover: 'hover:text-orange-700 dark:hover:text-orange-300',
        bg: 'bg-orange-600 text-white hover:bg-orange-700',
        lightBg: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
        activeToggle: 'bg-orange-600 text-white font-bold shadow-xs',
        badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        border: 'border-orange-500/30',
        ring: 'focus:ring-orange-500',
      };
    default:
      return {
        text: 'text-blue-600 dark:text-blue-400',
        textHover: 'hover:text-blue-700 dark:hover:text-blue-300',
        bg: 'bg-blue-600 text-white hover:bg-blue-700',
        lightBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
        activeToggle: 'bg-blue-600 text-white font-bold shadow-xs',
        badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        border: 'border-blue-500/30',
        ring: 'focus:ring-blue-500',
      };
  }
}

export default function ExpiringDocumentsWorkspace({ baseRoute = '/workspace', colorScheme }: ExpiringDocumentsWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = getPortalTheme(colorScheme, pathname);

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Row[]>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, Row>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [daysFilter, setDaysFilter] = useState<'30' | '60' | '90'>('60');
  const [version, setVersion] = useState(0);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const reload = () => setVersion(v => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setActionError('');

    Promise.all([
      apiFetch<any>(`/api/v1/employee-documents/expiring?days=${daysFilter}`),
      apiFetch<any>('/api/v1/employees?page_size=100').catch(() => []),
    ]).then(([docData, empData]) => {
      if (!active) return;
      const docList = Array.isArray(docData) ? docData : docData?.items || [];
      const empList = Array.isArray(empData) ? empData : empData?.items || [];

      const eMap: Record<string, Row> = {};
      empList.forEach((e: Row) => {
        if (e.id) eMap[e.id] = e;
      });

      setDocuments(docList.map(normalizeExpiringDocument));
      setEmployeesMap(eMap);
      setLoading(false);
    }).catch((err) => {
      if (!active) return;
      setDocuments([]);
      setActionError(err.message || 'Could not load expiring documents');
      setLoading(false);
    });

    return () => { active = false; };
  }, [daysFilter, version]);

  const handleViewDoc = async (doc: Row) => {
    const empId = doc.employee_id;
    const docId = doc.id || doc.document_id;
    if (!empId || !docId) {
      toast.error('Document download path unavailable.');
      return;
    }

    setBusyDocId(docId);
    setActionError('');
    try {
      const blob = await apiFetchBlob(`/api/v1/employees/${empId}/documents/${docId}/download`);
      openUniversalFileViewer({ blob, fileName: doc.file_name || doc.name || doc.title || 'Employee document', title: doc.title || 'Employee document' });
    } catch (err: any) {
      setActionError(err?.message || 'Failed to view document.');
    } finally {
      setBusyDocId(null);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const emp = employeesMap[doc.employee_id] || {};
    const empName = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.name || doc.employee_name || '';
    const docTitle = doc.title || doc.document_type || doc.name || '';
    const searchStr = `${docTitle} ${empName} ${doc.employee_number || emp.employee_number || ''}`.toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
  });

  const totalExpiring = documents.length;
  const criticalCount = documents.filter(d => {
    const days = d.days_until_expiry ?? d.days_left ?? d.days_remaining ?? Number.POSITIVE_INFINITY;
    return days <= 7;
  }).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <div>
          <Link href={baseRoute === '/workspace' ? '/workforce-overview' : baseRoute} className={`text-xs ${theme.text} inline-flex items-center gap-1.5 mb-2 hover:underline text-left justify-start font-semibold`}>
            <ArrowLeft size={12} /> {baseRoute === '/workspace' ? 'Workforce Overview' : 'Back to Portal'}
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Expiring Employee Documents & Licences</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor compliance documentation, passports, permits, and tickets approaching expiration dates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-secondary text-xs p-2.5" title="Refresh expiring list">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <div className="flex items-center border rounded-lg overflow-hidden bg-muted/40 p-0.5 text-xs">
            {(['30', '60', '90'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDaysFilter(d)}
                className={`px-2.5 py-1 font-semibold rounded-md transition-all ${
                  daysFilter === d ? theme.activeToggle : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert KPI Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Expiring Documents</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground">{loading ? '—' : totalExpiring}</div>
          <p className="text-[11px] text-muted-foreground">Due for renewal within next {daysFilter} days</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Critical Expirations (≤ 7 Days)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground">{loading ? '—' : criticalCount}</div>
          <p className="text-[11px] text-muted-foreground">Requires immediate renewal action</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Compliance Window</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground">{daysFilter} Days</div>
          <p className="text-[11px] text-muted-foreground">Active monitoring filter window</p>
        </div>
      </div>

      {actionError && (
        <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
          {actionError}
        </div>
      )}

      {/* Filter & Table Workspace */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by document title, type, or employee name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-9 text-xs py-1.5"
            />
          </div>
          <span className="text-xs text-muted-foreground font-semibold">
            Showing {filteredDocs.length} of {documents.length} records
          </span>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <CheckCircle size={32} className="mx-auto text-emerald-500/80" />
            <p className="text-sm font-semibold">No expiring documents found in the next {daysFilter} days.</p>
            <p className="text-xs text-muted-foreground">All employee compliance documents are currently up to date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">Document Title / Type</th>
                  <th className="p-3">Employee Name</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Urgency / Days Remaining</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDocs.map((doc, idx) => {
                  const emp = employeesMap[doc.employee_id] || {};
                  const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.name || doc.employee_name || 'Employee';
                  const empNum = emp.employee_number || doc.employee_number || (doc.employee_id ? doc.employee_id.slice(0, 8) : null);
                  const docTitle = doc.title || doc.name || display(doc.document_type || 'Document');
                  const daysLeft = doc.days_until_expiry ?? doc.days_left ?? doc.days_remaining ?? null;

                  const badgeStyle =
                    daysLeft !== null && daysLeft <= 7
                      ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                      : daysLeft !== null && daysLeft <= 15
                      ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold' :'bg-blue-100 text-blue-800 border-blue-200';

                  return (
                    <tr key={doc.id || idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded ${theme.lightBg} shrink-0 border ${theme.border}`}>
                            <FileText size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">{docTitle}</span>
                            <span className="text-[11px] text-muted-foreground uppercase">{display(doc.document_type || 'Document')}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        {doc.employee_id ? (
                          <Link href={`${baseRoute}/employees/${doc.employee_id}`} className={`font-bold text-foreground ${theme.textHover} transition-colors block`}>
                            {fullName}
                          </Link>
                        ) : (
                          <span className="font-bold text-foreground">{fullName}</span>
                        )}
                        {empNum && (
                          <span className="text-[11px] text-muted-foreground block">ID: {empNum} • {display(emp.position_name || emp.title || 'Staff')}</span>
                        )}
                      </td>

                      <td className="p-3 font-semibold text-rose-700">
                        {display(doc.expiry_date || doc.valid_until || 'Not recorded')}
                      </td>

                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] border inline-flex items-center gap-1 ${badgeStyle}`}>
                          <Clock size={11} />
                          {daysLeft === null ? 'Expiry not recorded' : daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago` : `Expiring in ${daysLeft} days`}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewDoc(doc)}
                            disabled={busyDocId === (doc.id || doc.document_id)}
                            className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1"
                            title="View Document File"
                          >
                            <Eye size={12} /> View Document
                          </button>

                          {doc.employee_id && (
                            <Link
                              href={`${baseRoute}/employees/${doc.employee_id}?tab=documents`}
                              className={`py-1 px-2.5 text-[11px] flex items-center gap-1 font-bold rounded-lg transition shadow-xs ${theme.bg}`}
                              title="Resolve / Renew Document on Employee Profile"
                            >
                              Resolve <ArrowRight size={12} />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
