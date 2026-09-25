'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, RefreshCw, Plus, Search, Filter, CheckCircle, AlertTriangle, Clock, Gauge } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Row, display, Modal } from './DataUI';
import RecordForm from './RecordForm';
import SearchableSelect from './SearchableSelect';

export default function EquipmentInspectionsWorkspace() {
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');

  // Modal
  const [recording, setRecording] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Row | null>(null);

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiFetch<any>('/api/v1/assets?page_size=50')
      .then(async (assetsData) => {
        if (!active) return;
        const assetList = Array.isArray(assetsData) ? assetsData : assetsData?.items || [];
        setAssets(assetList);

        const inspectionPromises = assetList.slice(0, 15).map(async (asset: Row) => {
          try {
            const iData = await apiFetch<any>(`/api/v1/assets/${asset.id}/inspections?page_size=50`);
            const iList = Array.isArray(iData) ? iData : iData?.items || [];
            return iList.map((ins: Row) => ({
              ...ins,
              asset_name: asset.name,
              asset_number: asset.asset_number,
              asset_id: asset.id,
            }));
          } catch (_) {
            return [];
          }
        });

        const results = await Promise.all(inspectionPromises);
        if (active) {
          setInspections(results.flat());
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [version]);

  const filteredInspections = inspections.filter((ins) => {
    const searchStr = `${ins.inspector_name || ins.inspector || ''} ${ins.notes || ''} ${ins.asset_name || ''}`.toLowerCase();
    const matchesSearch = !search || searchStr.includes(search.toLowerCase());
    const matchesAsset = assetFilter === 'ALL' || String(ins.asset_id) === assetFilter;
    const matchesResult = resultFilter === 'ALL' || String(ins.result || ins.status || '').toUpperCase() === resultFilter;

    return matchesSearch && matchesAsset && matchesResult;
  });

  const totalInspections = inspections.length;
  const passedCount = inspections.filter((ins) => ['PASS', 'PASSED'].includes(String(ins.result || ins.status || '').toUpperCase())).length;
  const failedCount = inspections.filter((ins) => ['FAIL', 'FAILED'].includes(String(ins.result || ins.status || '').toUpperCase())).length;

  const inspectionCreateOp = {
    schema: {
      type: 'object',
      required: ['result'],
      properties: {
        asset_id: { type: 'string', format: 'uuid', title: 'Target Equipment Asset' },
        result: {
          type: 'string',
          enum: ['PASSED', 'FAILED'],
          title: 'Inspection Result',
          default: 'PASSED',
        },
        inspected_at: { type: 'string', format: 'date-time', title: 'Inspection Date & Time' },
        inspector_name: { type: 'string', title: 'Inspector / Auditor Name' },
        meter_reading: { type: 'number', title: 'Current Meter Reading' },
        checklist_notes: { type: 'string', title: 'Safety Checklist Notes' },
      },
    },
    permissions: ['assets.update'],
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <div>
          <Link href="/workspace/assets" className="text-xs text-primary flex items-center gap-1 mb-2 hover:underline">
            <ArrowLeft size={12} /> Equipment Fleet
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Pre-Operational & Safety Inspections</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit pre-start checklists, daily safety inspections, regulatory compliance certifications, and inspector logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-secondary text-xs p-2.5" title="Refresh data">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {assets.length > 0 && (
            <button onClick={() => setRecording(true)} className="btn-primary text-xs flex items-center gap-1">
              <Plus size={14} /> Record Inspection
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4 space-y-1.5 border-l-4 border-l-primary">
          <span className="text-xs font-semibold text-muted-foreground block">Total Inspections</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">{loading ? '…' : totalInspections}</span>
            <ShieldCheck size={18} className="text-primary opacity-80" />
          </div>
          <p className="text-[11px] text-muted-foreground">Logged safety check records</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-muted-foreground block">Passed Inspections</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700">{loading ? '…' : passedCount}</span>
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Certified fit for deployment</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-muted-foreground block">Failed / Defect Checks</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-700">{loading ? '…' : failedCount}</span>
            <AlertTriangle size={18} className="text-rose-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Inspections requiring corrective action</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search inspector, equipment or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground shrink-0" />
            <div className="w-48">
              <SearchableSelect
                value={assetFilter}
                onChange={(val) => setAssetFilter(val)}
                options={[
                  { value: 'ALL', label: 'All Equipment Fleet' },
                  ...assets.map((a) => ({
                    value: String(a.id),
                    label: `${a.asset_number ? `${a.asset_number} — ` : ''}${a.name}`,
                  })),
                ]}
                searchable={assets.length > 5}
                ariaLabel="Filter Equipment Fleet"
              />
            </div>

            <div className="w-36">
              <SearchableSelect
                value={resultFilter}
                onChange={(val) => setResultFilter(val)}
                options={[
                  { value: 'ALL', label: 'All Results' },
                  { value: 'PASSED', label: 'Passed' },
                  { value: 'FAILED', label: 'Failed' },
                ]}
                searchable={false}
                ariaLabel="Filter Results"
              />
            </div>

            {(search || assetFilter !== 'ALL' || resultFilter !== 'ALL') && (
              <button
                type="button"
                className="btn-secondary text-xs py-1.5 px-3"
                onClick={() => {
                  setSearch('');
                  setAssetFilter('ALL');
                  setResultFilter('ALL');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-semibold">
          Showing {filteredInspections.length} inspection records
        </span>
      </div>

      {/* Main Table */}
      <div className="card p-5 overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading inspection records...</p>
        ) : filteredInspections.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <ShieldCheck size={32} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm font-semibold">No equipment safety inspections recorded matching filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">Equipment Asset</th>
                  <th className="p-3">Inspection Result</th>
                  <th className="p-3">Inspector / Auditor</th>
                  <th className="p-3">Inspection Date & Time</th>
                  <th className="p-3">Meter Reading</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInspections.map((ins, idx) => {
                  const result = String(ins.result || ins.status || 'PASSED').toUpperCase();
                  const isPass = ['PASS', 'PASSED'].includes(result);

                  return (
                    <tr key={ins.id || idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <Link href={`/workspace/assets/${ins.asset_id}`} className="font-bold text-primary hover:underline block">
                          {ins.asset_name}
                        </Link>
                        {ins.asset_number && (
                          <span className="text-[11px] text-muted-foreground">Tag: {ins.asset_number}</span>
                        )}
                      </td>

                      <td className="p-3">
                        {isPass ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle size={10} /> PASSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle size={10} /> FAILED
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-muted-foreground font-medium">
                        <span>{ins.inspector_name || ins.inspector || 'Site Auditor'}</span>
                      </td>

                      <td className="p-3 text-muted-foreground font-medium">
                        {ins.inspected_at || ins.created_at ? new Date(ins.inspected_at || ins.created_at).toLocaleString() : '—'}
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-foreground">
                          {ins.meter_reading != null ? `${ins.meter_reading}` : '—'}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedInspection(ins)}
                          className="btn-secondary py-1 px-2.5 text-[11px]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Modal */}
      {recording && (
        <Modal name="Record Safety Inspection" onClose={() => setRecording(false)}>
          <RecordForm
            operation={inspectionCreateOp}
            path={assets[0] ? `/api/v1/assets/${assets[0].id}/inspections` : ''}
            method="POST"
            onSuccess={() => {
              setRecording(false);
              reload();
            }}
          />
        </Modal>
      )}

      {/* Details Modal */}
      {selectedInspection && (
        <Modal name={`Inspection Details · ${selectedInspection.asset_name}`} onClose={() => setSelectedInspection(null)}>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Equipment Asset</span>
                <strong className="text-sm font-semibold text-primary">{selectedInspection.asset_name}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Inspection Result</span>
                <strong className="text-sm font-semibold">{selectedInspection.result || selectedInspection.status}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Inspector</span>
                <strong className="text-sm font-semibold">{selectedInspection.inspector_name || 'Auditor'}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Inspected At</span>
                <strong className="text-sm font-semibold">{selectedInspection.inspected_at || '—'}</strong>
              </div>
            </div>

            {selectedInspection.checklist_notes && (
              <div className="bg-muted/30 p-3 rounded space-y-1">
                <span className="font-semibold text-muted-foreground block uppercase text-[10px]">Checklist Notes</span>
                <p className="leading-relaxed">{selectedInspection.checklist_notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedInspection(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
