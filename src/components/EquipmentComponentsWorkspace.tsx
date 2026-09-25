'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Truck, ArrowLeft, RefreshCw, Plus, Search, Filter, Wrench, CheckCircle, ShieldAlert, FileText, Upload, Eye, Download, Edit } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import { toast } from 'sonner';
import { Row, display, Modal } from './DataUI';
import SearchableSelect from './SearchableSelect';

export default function EquipmentComponentsWorkspace() {
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [adding, setAdding] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Row | null>(null);

  // Form State for New Component with File Upload
  const [targetAssetId, setTargetAssetId] = useState('');
  const [compName, setCompName] = useState('');
  const [compNumber, setCompNumber] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [lifeCycles, setLifeCycles] = useState('');
  const [compStatus, setCompStatus] = useState('INSTALLED');
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State for Edit Component
  const [editingComp, setEditingComp] = useState<Row | null>(null);
  const [editCompName, setEditCompName] = useState('');
  const [editCompNumber, setEditCompNumber] = useState('');
  const [editPartNumber, setEditPartNumber] = useState('');
  const [editLifeCycles, setEditLifeCycles] = useState('');
  const [editCompStatus, setEditCompStatus] = useState('INSTALLED');
  const [editSpecFile, setEditSpecFile] = useState<File | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState('');

  // Preview Document Modal
  const [previewDoc, setPreviewDoc] = useState<Row | null>(null);

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiFetch<any>('/api/v1/assets?page_size=50')
      .then(async (assetsData) => {
        if (!active) return;
        const assetList = Array.isArray(assetsData) ? assetsData : assetsData?.items || [];
        setAssets(assetList);
        if (assetList.length > 0 && !targetAssetId) {
          setTargetAssetId(assetList[0].id);
        }

        // Parallel batch fetch using Promise.all
        const compPromises = assetList.slice(0, 15).map(async (asset: Row) => {
          try {
            const compData = await apiFetch<any>(`/api/v1/assets/${asset.id}/components`);
            const compList = Array.isArray(compData) ? compData : compData?.items || [];

            let assetDocs: Row[] = [];
            try {
              const docsData = await apiFetch<any>(`/api/v1/assets/${asset.id}/documents`);
              assetDocs = Array.isArray(docsData) ? docsData : docsData?.items || [];
            } catch (_) {}

            return compList.map((c: Row) => {
              const matchedDoc = assetDocs.find(
                (d: Row) =>
                  (d.title || '').toLowerCase().includes((c.name || '').toLowerCase()) ||
                  (d.title || '').toLowerCase().includes((c.part_number || '').toLowerCase())
              );

              return {
                ...c,
                asset_name: asset.name,
                asset_number: asset.asset_number,
                asset_id: asset.id,
                attached_doc: matchedDoc || (assetDocs[0] ? assetDocs[0] : null),
              };
            });
          } catch (_) {
            return [];
          }
        });

        const results = await Promise.all(compPromises);
        if (active) {
          setComponents(results.flat());
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

  async function handleCreateComponent(e: React.FormEvent) {
    e.preventDefault();
    if (!targetAssetId || !compName.trim() || submitting) return;
    setSubmitting(true);
    setFormError('');

    try {
      // 1. Post component to asset
      const createdComp = await apiFetch<Row>(`/api/v1/assets/${targetAssetId}/components`, {
        method: 'POST',
        body: JSON.stringify({
          name: compName.trim(),
          component_number: compNumber.trim() || undefined,
          part_number: partNumber.trim() || undefined,
          expected_life_cycles: lifeCycles ? Number(lifeCycles) : undefined,
          status: compStatus,
        }),
      });

      // 2. Upload file attachment if provided
      if (specFile) {
        try {
          const formData = new FormData();
          formData.append('file', specFile);
          formData.append('title', `Spec Sheet - ${compName.trim()}`);
          formData.append('document_type', 'MANUAL');
          await apiFetch(`/api/v1/assets/${targetAssetId}/documents/upload`, {
            method: 'POST',
            body: formData,
          });
        } catch (uploadErr) {
          console.warn('Component document upload failed:', uploadErr);
        }
      }

      setAdding(false);
      setCompName('');
      setCompNumber('');
      setPartNumber('');
      setLifeCycles('');
      setSpecFile(null);
      reload();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create component');
    } finally {
      setSubmitting(false);
    }
  }

  function openEditModal(comp: Row) {
    setEditingComp(comp);
    setEditCompName(comp.name || '');
    setEditCompNumber(comp.component_number || comp.serial_number || '');
    setEditPartNumber(comp.part_number || '');
    setEditLifeCycles(comp.expected_life_cycles != null ? String(comp.expected_life_cycles) : '');
    setEditCompStatus(comp.status || 'INSTALLED');
    setEditSpecFile(null);
    setEditFormError('');
  }

  async function handleUpdateComponent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingComp || !editCompName.trim() || editSubmitting) return;
    setEditSubmitting(true);
    setEditFormError('');

    try {
      const assetId = editingComp.asset_id;
      const compId = editingComp.id;

      await apiFetch<Row>(`/api/v1/assets/${assetId}/components/${compId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editCompName.trim(),
          component_number: editCompNumber.trim() || undefined,
          part_number: editPartNumber.trim() || undefined,
          expected_life_cycles: editLifeCycles ? Number(editLifeCycles) : undefined,
          status: editCompStatus,
        }),
      });

      if (editSpecFile) {
        try {
          const formData = new FormData();
          formData.append('file', editSpecFile);
          formData.append('title', `Spec Sheet - ${editCompName.trim()}`);
          formData.append('document_type', 'MANUAL');
          await apiFetch(`/api/v1/assets/${assetId}/documents/upload`, {
            method: 'POST',
            body: formData,
          });
        } catch (uploadErr) {
          console.warn('Component document upload failed:', uploadErr);
        }
      }

      setEditingComp(null);
      reload();
    } catch (err: any) {
      setEditFormError(err.message || 'Failed to update component');
    } finally {
      setEditSubmitting(false);
    }
  }

  const filteredComponents = components.filter((c) => {
    const searchStr = `${c.name || ''} ${c.component_number || ''} ${c.part_number || ''} ${c.asset_name || ''}`.toLowerCase();
    const matchesSearch = !search || searchStr.includes(search.toLowerCase());
    const matchesAsset = assetFilter === 'ALL' || String(c.asset_id) === assetFilter;
    const matchesStatus = statusFilter === 'ALL' || String(c.status || '').toUpperCase() === statusFilter;

    return matchesSearch && matchesAsset && matchesStatus;
  });

  const totalCount = components.length;
  const installedCount = components.filter((c) => String(c.status || 'INSTALLED').toUpperCase() === 'INSTALLED').length;
  const maintenanceCount = components.filter((c) => ['MAINTENANCE', 'UNDER_REPAIR'].includes(String(c.status).toUpperCase())).length;
  const replacedCount = components.filter((c) => ['REMOVED', 'REPLACED', 'SCRAPPED'].includes(String(c.status).toUpperCase())).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <div>
          <Link href="/workspace/assets" className="text-xs text-primary flex items-center gap-1 mb-2 hover:underline">
            <ArrowLeft size={12} /> Equipment Fleet
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Equipment Components Register & Specification Documents</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Register major mechanical sub-assemblies, track parts & expected life cycles, and attach technical spec sheets and manuals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-secondary text-xs p-2.5" title="Refresh data">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {assets.length > 0 && (
            <button onClick={() => setAdding(true)} className="btn-primary text-xs flex items-center gap-1">
              <Plus size={14} /> Add Component & Upload Spec
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1.5 border-l-4 border-l-primary">
          <span className="text-xs font-semibold text-muted-foreground block">Total Components</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">{loading ? '…' : totalCount}</span>
            <Truck size={18} className="text-primary opacity-80" />
          </div>
          <p className="text-[11px] text-muted-foreground">Registered equipment sub-components</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-muted-foreground block">Installed & Active</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700">{loading ? '…' : installedCount}</span>
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Currently in active service</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-muted-foreground block">In Repair / Overhaul</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-700">{loading ? '…' : maintenanceCount}</span>
            <Wrench size={18} className="text-amber-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Under repair or maintenance</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-slate-400">
          <span className="text-xs font-semibold text-muted-foreground block">Replaced / Removed</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-700">{loading ? '…' : replacedCount}</span>
            <ShieldAlert size={18} className="text-slate-500" />
          </div>
          <p className="text-[11px] text-muted-foreground">Retired or decommissioned components</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search component name, serial #, or part #..."
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

            <div className="w-44">
              <SearchableSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'ALL', label: 'All Component Statuses' },
                  { value: 'INSTALLED', label: 'Installed' },
                  { value: 'UNDER_REPAIR', label: 'Under Repair' },
                  { value: 'REMOVED', label: 'Removed' },
                  { value: 'REPLACED', label: 'Replaced' },
                ]}
                searchable={false}
                ariaLabel="Filter Component Status"
              />
            </div>

            {(search || assetFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                className="btn-secondary text-xs py-1.5 px-3"
                onClick={() => {
                  setSearch('');
                  setAssetFilter('ALL');
                  setStatusFilter('ALL');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-semibold">
          Showing {filteredComponents.length} components
        </span>
      </div>

      {/* Main Table */}
      <div className="card p-5 overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading components database...</p>
        ) : filteredComponents.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Truck size={32} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm font-semibold">No equipment components recorded matching filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">Component Name</th>
                  <th className="p-3">Part & Serial #</th>
                  <th className="p-3">Assigned Equipment</th>
                  <th className="p-3">Life Cycles</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Spec Sheet / Attachment</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredComponents.map((comp) => {
                  const status = String(comp.status || 'INSTALLED').toUpperCase();
                  const doc = comp.attached_doc;

                  return (
                    <tr key={comp.id || comp.name} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                            <Truck size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">{comp.name}</span>
                            <span className="text-[11px] text-muted-foreground">ID: {comp.component_number || '—'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-mono text-foreground block">{comp.part_number || '—'}</span>
                        <span className="text-[11px] text-muted-foreground">SN: {comp.serial_number || comp.component_number || '—'}</span>
                      </td>

                      <td className="p-3">
                        <Link href={`/workspace/assets/${comp.asset_id}`} className="font-semibold text-primary hover:underline block">
                          {comp.asset_name}
                        </Link>
                        {comp.asset_number && (
                          <span className="text-[11px] text-muted-foreground">Tag: {comp.asset_number}</span>
                        )}
                      </td>

                      <td className="p-3">
                        <span className="font-medium text-foreground">
                          {comp.expected_life_cycles != null ? `${comp.expected_life_cycles} Hours / Cycles` : 'Unlimited'}
                        </span>
                      </td>

                      <td className="p-3">
                        {status === 'INSTALLED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle size={10} /> Installed
                          </span>
                        ) : status === 'UNDER_REPAIR' || status === 'MAINTENANCE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                            <Wrench size={10} /> Under Repair
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {status}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {doc ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              <FileText size={11} /> {doc.title || doc.file_name || 'Technical Manual'}
                            </span>
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="text-primary hover:underline text-[11px] flex items-center gap-0.5"
                            >
                              <Eye size={12} /> View
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">No attachment</span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(comp)}
                            className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1 text-primary border-primary/30"
                          >
                            <Edit size={11} /> Edit
                          </button>
                          <button
                            onClick={() => setSelectedComponent(comp)}
                            className="btn-secondary py-1 px-2.5 text-[11px]"
                          >
                            Details
                          </button>
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

      {/* Add Component with File Upload Modal */}
      {adding && (
        <Modal name="Add Equipment Component & Spec Sheet" onClose={() => setAdding(false)}>
          <form onSubmit={handleCreateComponent} className="space-y-4 text-xs">
            {formError && (
              <p role="alert" className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded border border-rose-200">
                {formError}
              </p>
            )}

            <div>
              <label className="text-[11px] font-semibold block mb-1">Target Equipment Asset *</label>
              <SearchableSelect
                value={targetAssetId}
                onChange={(val) => setTargetAssetId(val)}
                options={assets.map((a) => ({
                  value: String(a.id),
                  label: `${a.asset_number ? `${a.asset_number} — ` : ''}${a.name}`,
                }))}
                searchable={assets.length > 5}
                required
                ariaLabel="Target Equipment Asset"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold block mb-1">Component Name *</label>
              <input
                type="text"
                placeholder="e.g. Hydraulic Main Pump Assembly"
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                className="input-field text-xs w-full"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold block mb-1">Component Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. CMP-HYD-9901"
                  value={compNumber}
                  onChange={(e) => setCompNumber(e.target.value)}
                  className="input-field text-xs w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1">Manufacturer Part Number</label>
                <input
                  type="text"
                  placeholder="e.g. CAT-9928-HYD"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="input-field text-xs w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold block mb-1">Expected Life Cycles / Hours</label>
                <input
                  type="number"
                  placeholder="e.g. 12000"
                  value={lifeCycles}
                  onChange={(e) => setLifeCycles(e.target.value)}
                  className="input-field text-xs w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1">Status *</label>
                <SearchableSelect
                  value={compStatus}
                  onChange={(val) => setCompStatus(val)}
                  options={[
                    { value: 'INSTALLED', label: 'Installed & Active' },
                    { value: 'UNDER_REPAIR', label: 'Under Repair' },
                    { value: 'REMOVED', label: 'Removed' },
                    { value: 'REPLACED', label: 'Replaced' },
                  ]}
                  searchable={false}
                  ariaLabel="Status"
                />
              </div>
            </div>

            {/* Spec Sheet File Upload Input */}
            <div className="card p-3 bg-muted/20 border space-y-2">
              <label className="text-[11px] font-semibold block flex items-center gap-1.5 text-foreground">
                <Upload size={13} className="text-primary" /> Technical Spec Sheet / User Manual Attachment (File Upload)
              </label>
              <input
                type="file"
                onChange={(e) => setSpecFile(e.target.files?.[0] || null)}
                className="input-field text-xs file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
              />
              <span className="text-[10px] text-muted-foreground block">
                Accepted formats: PDF, DOCX, PNG, JPG (e.g. Component spec diagram, parts breakdown, warranty receipt).
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setAdding(false)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary text-xs flex items-center gap-1">
                {submitting ? 'Creating Component & Uploading...' : 'Save Component'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details Modal */}
      {selectedComponent && (
        <Modal name={`Component Details · ${selectedComponent.name}`} onClose={() => setSelectedComponent(null)}>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Component Name</span>
                <strong className="text-sm font-semibold">{selectedComponent.name}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Assigned Asset</span>
                <strong className="text-sm font-semibold text-primary">{selectedComponent.asset_name}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Part Number</span>
                <strong className="text-sm font-mono">{selectedComponent.part_number || '—'}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Component Status</span>
                <strong className="text-sm font-semibold">{selectedComponent.status}</strong>
              </div>
            </div>

            {selectedComponent.attached_doc && (
              <div className="card p-3 bg-blue-50/50 border border-blue-200 rounded space-y-2">
                <span className="font-bold text-xs text-blue-900 block flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-700" /> Attached Specification Sheet / Manual
                </span>
                <div className="flex justify-between items-center bg-white p-2 rounded border border-blue-200">
                  <span className="font-semibold text-foreground">{selectedComponent.attached_doc.title || 'Technical Manual'}</span>
                  <button
                    onClick={() => setPreviewDoc(selectedComponent.attached_doc)}
                    className="btn-primary py-0.5 px-2 text-[10px] flex items-center gap-1"
                  >
                    <Eye size={11} /> View Document
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedComponent(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Preview Document Modal */}
      {previewDoc && (
        <Modal name={`Spec Sheet · ${previewDoc.title || 'Document'}`} onClose={() => setPreviewDoc(null)}>
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-muted/20 border rounded text-center space-y-3">
              <FileText size={40} className="mx-auto text-primary" />
              <div>
                <h4 className="font-bold text-sm text-foreground">{previewDoc.title || previewDoc.file_name || 'Component Specification'}</h4>
                <p className="text-muted-foreground text-[11px] mt-0.5">Type: {previewDoc.document_type || 'TECHNICAL MANUAL'}</p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                {previewDoc.file_url ? (
                  <button
                    type="button"
                    onClick={() => openUniversalFileViewer({ fileUrl: previewDoc.file_url, fileName: previewDoc.file_name || previewDoc.title || 'Component specification', title: 'Component specification' })}
                    className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                  >
                    <Download size={13} /> Download Spec Document
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toast.info(`Downloading specification document: ${previewDoc.title || 'Component Spec'}`)}
                    className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                  >
                    <Download size={13} /> Download Spec Document
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={() => setPreviewDoc(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Component Modal */}
      {editingComp && (
        <Modal name={`Edit Component — ${editingComp.name}`} onClose={() => setEditingComp(null)}>
          <form onSubmit={handleUpdateComponent} className="space-y-4 text-xs">
            {editFormError && (
              <p role="alert" className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded border border-rose-200">
                {editFormError}
              </p>
            )}

            <div>
              <label className="text-[11px] font-semibold block mb-1">Component Name *</label>
              <input
                type="text"
                value={editCompName}
                onChange={(e) => setEditCompName(e.target.value)}
                className="input-field text-xs w-full"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold block mb-1">Component Serial Number</label>
                <input
                  type="text"
                  value={editCompNumber}
                  onChange={(e) => setEditCompNumber(e.target.value)}
                  className="input-field text-xs w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1">Manufacturer Part Number</label>
                <input
                  type="text"
                  value={editPartNumber}
                  onChange={(e) => setEditPartNumber(e.target.value)}
                  className="input-field text-xs w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold block mb-1">Expected Life Cycles / Hours</label>
                <input
                  type="number"
                  value={editLifeCycles}
                  onChange={(e) => setEditLifeCycles(e.target.value)}
                  className="input-field text-xs w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold block mb-1">Status *</label>
                <SearchableSelect
                  value={editCompStatus}
                  onChange={(val) => setEditCompStatus(val)}
                  options={[
                    { value: 'INSTALLED', label: 'Installed & Active' },
                    { value: 'UNDER_REPAIR', label: 'Under Repair' },
                    { value: 'REMOVED', label: 'Removed' },
                    { value: 'REPLACED', label: 'Replaced' },
                  ]}
                  searchable={false}
                  ariaLabel="Status"
                />
              </div>
            </div>

            {/* Spec Sheet File Upload Input */}
            <div className="card p-3 bg-muted/20 border space-y-2">
              <label className="text-[11px] font-semibold block flex items-center gap-1.5 text-foreground">
                <Upload size={13} className="text-primary" /> Update Technical Spec Sheet / Manual Attachment
              </label>
              <input
                type="file"
                onChange={(e) => setEditSpecFile(e.target.files?.[0] || null)}
                className="input-field text-xs file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
              />
              <p className="text-[11px] text-muted-foreground">
                Uploading a new file will attach an updated technical manual to this equipment asset.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingComp(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="btn-primary text-xs flex items-center gap-1"
              >
                {editSubmitting ? 'Saving Changes...' : 'Update Component'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
