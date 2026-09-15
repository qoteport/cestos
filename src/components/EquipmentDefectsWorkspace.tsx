'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RefreshCw, Plus, Search, Filter, CheckCircle, Clock, Eye, Download, Upload, ShieldAlert, Paperclip } from 'lucide-react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { Row, display, Modal } from './DataUI';
import RecordForm from './RecordForm';

export default function EquipmentDefectsWorkspace() {
  const [loading, setLoading] = useState(true);
  const [defects, setDefects] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal
  const [reporting, setReporting] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<Row | null>(null);

  // Files
  const [evidenceFiles, setEvidenceFiles] = useState<Row[]>([]);
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  const [fileTitle, setFileTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState('');

  const [previewFile, setPreviewFile] = useState<{
    id?: string;
    title: string;
    filename: string;
    size_bytes?: number;
    url?: string;
    blob?: Blob;
  } | null>(null);

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiFetch<any>('/api/v1/assets?page_size=50')
      .then(async (assetsData) => {
        if (!active) return;
        const assetList = Array.isArray(assetsData) ? assetsData : assetsData?.items || [];
        setAssets(assetList);

        const defectPromises = assetList.slice(0, 15).map(async (asset: Row) => {
          try {
            const dData = await apiFetch<any>(`/api/v1/assets/${asset.id}/defects`);
            const dList = Array.isArray(dData) ? dData : dData?.items || [];
            return dList.map((d: Row) => ({
              ...d,
              asset_name: asset.name,
              asset_number: asset.asset_number,
              asset_id: asset.id,
            }));
          } catch (_) {
            return [];
          }
        });

        const results = await Promise.all(defectPromises);
        if (active) {
          setDefects(results.flat());
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

  // Load evidence files when selectedDefect changes
  useEffect(() => {
    let active = true;
    setEvidenceFiles([]);
    setUploadFile(null);
    setFileTitle('');
    setFileUploadOpen(false);

    if (selectedDefect) {
      apiFetch<Row[]>(`/api/v1/assets/${selectedDefect.asset_id}/logs/DEFECT/${selectedDefect.id}/files`)
        .then((f) => {
          if (active) setEvidenceFiles(f || []);
        })
        .catch(() => {
          if (active) setEvidenceFiles([]);
        });
    }
    return () => {
      active = false;
    };
  }, [selectedDefect]);

  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDefect || !uploadFile || uploadBusy) return;
    setUploadBusy(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('title', fileTitle.trim() || uploadFile.name);
      fd.append('file', uploadFile);

      await apiFetch(`/api/v1/assets/${selectedDefect.asset_id}/logs/DEFECT/${selectedDefect.id}/files`, {
        method: 'POST',
        body: fd,
      });

      setFileUploadOpen(false);
      setFileTitle('');
      setUploadFile(null);

      const files = await apiFetch<Row[]>(`/api/v1/assets/${selectedDefect.asset_id}/logs/DEFECT/${selectedDefect.id}/files`);
      setEvidenceFiles(files || []);
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleFileView(f: Row) {
    if (!selectedDefect) return;
    setError('');
    try {
      const blob = await apiFetchBlob(`/api/v1/assets/${selectedDefect.asset_id}/log-files/${f.id}/download`);
      const objectUrl = URL.createObjectURL(blob);
      setPreviewFile({
        id: String(f.id),
        title: f.title || f.file_name || 'Defect Evidence File',
        filename: f.file_name || 'file',
        size_bytes: f.size_bytes,
        url: objectUrl,
        blob,
      });
    } catch (err: any) {
      setError(err.message || 'Unable to view file preview');
    }
  }

  async function handleFileDownload(fileId: string, filename: string) {
    if (!selectedDefect) return;
    try {
      const blob = await apiFetchBlob(`/api/v1/assets/${selectedDefect.asset_id}/log-files/${fileId}/download`);
      downloadBlob(blob, filename);
    } catch (err: any) {
      setError(err.message || 'Download failed');
    }
  }

  const filteredDefects = defects.filter((d) => {
    const searchStr = `${d.description || ''} ${d.notes || ''} ${d.asset_name || ''}`.toLowerCase();
    const matchesSearch = !search || searchStr.includes(search.toLowerCase());
    const matchesAsset = assetFilter === 'ALL' || String(d.asset_id) === assetFilter;
    const matchesSeverity = severityFilter === 'ALL' || String(d.severity || '').toUpperCase() === severityFilter;
    const matchesStatus = statusFilter === 'ALL' || String(d.status || '').toUpperCase() === statusFilter;

    return matchesSearch && matchesAsset && matchesSeverity && matchesStatus;
  });

  const totalDefects = defects.length;
  const criticalCount = defects.filter((d) => String(d.severity || '').toUpperCase() === 'CRITICAL').length;
  const openCount = defects.filter((d) => String(d.status || 'OPEN').toUpperCase() === 'OPEN').length;
  const resolvedCount = defects.filter((d) => ['RESOLVED', 'CLOSED'].includes(String(d.status || '').toUpperCase())).length;

  const defectCreateOp = {
    schema: {
      type: 'object',
      required: ['description'],
      properties: {
        asset_id: { type: 'string', format: 'uuid', title: 'Target Equipment Asset' },
        description: { type: 'string', title: 'Defect Description / Fault Notes' },
        severity: {
          type: 'string',
          enum: ['MINOR', 'MAJOR', 'CRITICAL'],
          title: 'Severity Level',
          default: 'MINOR',
        },
        status: {
          type: 'string',
          enum: ['OPEN', 'RESOLVED', 'CLOSED'],
          title: 'Initial Status',
          default: 'OPEN',
        },
        reported_at: { type: 'string', format: 'date-time', title: 'Reported Date & Time' },
        notes: { type: 'string', title: 'Action Taken / Corrective Notes' },
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
          <h1 className="text-2xl font-bold text-foreground">Defect & Fault Reporting Register</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log machinery faults, report breakdown defects, upload evidence photos, and track resolution workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-secondary text-xs p-2.5" title="Refresh data">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {assets.length > 0 && (
            <button onClick={() => setReporting(true)} className="btn-primary text-xs flex items-center gap-1">
              <Plus size={14} /> Report Defect / Fault
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1.5 border-l-4 border-l-primary">
          <span className="text-xs font-semibold text-muted-foreground block">Total Defects Logged</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">{loading ? '…' : totalDefects}</span>
            <AlertTriangle size={18} className="text-primary opacity-80" />
          </div>
          <p className="text-[11px] text-muted-foreground">Reported equipment faults</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-muted-foreground block">Critical Grounding Faults</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-700">{loading ? '…' : criticalCount}</span>
            <ShieldAlert size={18} className="text-rose-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Requires immediate fleet grounding</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-muted-foreground block">Open Defects</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-700">{loading ? '…' : openCount}</span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Pending maintenance resolution</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-muted-foreground block">Resolved & Closed</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700">{loading ? '…' : resolvedCount}</span>
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Repairs completed & signed off</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search defect description, equipment or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground shrink-0" />
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="input-field text-xs py-1.5 w-44 bg-background"
            >
              <option value="ALL">All Equipment Fleet</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.asset_number ? `${a.asset_number} — ` : ''}{a.name}
                </option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="input-field text-xs py-1.5 w-36 bg-background"
            >
              <option value="ALL">All Severities</option>
              <option value="MINOR">Minor</option>
              <option value="MAJOR">Major</option>
              <option value="CRITICAL">Critical</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-xs py-1.5 w-36 bg-background"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            {(search || assetFilter !== 'ALL' || severityFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                className="btn-secondary text-xs py-1.5 px-3"
                onClick={() => {
                  setSearch('');
                  setAssetFilter('ALL');
                  setSeverityFilter('ALL');
                  setStatusFilter('ALL');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-semibold">
          Showing {filteredDefects.length} defect reports
        </span>
      </div>

      {/* Main Table */}
      <div className="card p-5 overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading equipment defect reports...</p>
        ) : filteredDefects.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <AlertTriangle size={32} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm font-semibold">No equipment defects recorded matching filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">Defect Description</th>
                  <th className="p-3">Equipment Asset</th>
                  <th className="p-3">Severity Level</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reported Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDefects.map((def, idx) => {
                  const severity = String(def.severity || 'MINOR').toUpperCase();
                  const status = String(def.status || 'OPEN').toUpperCase();

                  return (
                    <tr key={def.id || idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-foreground block">{def.description || 'Equipment Defect'}</span>
                        {def.notes && (
                          <span className="text-[11px] text-muted-foreground line-clamp-1">Notes: {def.notes}</span>
                        )}
                      </td>

                      <td className="p-3">
                        <Link href={`/workspace/assets/${def.asset_id}`} className="font-semibold text-primary hover:underline block">
                          {def.asset_name}
                        </Link>
                        {def.asset_number && (
                          <span className="text-[11px] text-muted-foreground">Tag: {def.asset_number}</span>
                        )}
                      </td>

                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : severity === 'MAJOR' ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {severity}
                        </span>
                      </td>

                      <td className="p-3">
                        {status === 'RESOLVED' || status === 'CLOSED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle size={10} /> {status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-900 border border-rose-300">
                            <Clock size={10} /> Open Fault
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-muted-foreground font-medium">
                        {def.reported_at ? new Date(def.reported_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedDefect(def)}
                          className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1 inline-flex"
                        >
                          <Paperclip size={11} /> Details & Evidence
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

      {/* Report Modal */}
      {reporting && (
        <Modal name="Report Equipment Defect / Fault" onClose={() => setReporting(false)}>
          <RecordForm
            operation={defectCreateOp}
            path={assets[0] ? `/api/v1/assets/${assets[0].id}/defects` : ''}
            method="POST"
            onSuccess={() => {
              setReporting(false);
              reload();
            }}
          />
        </Modal>
      )}

      {/* Details & Evidence Modal */}
      {selectedDefect && (
        <Modal name={`Defect Evidence & Details · ${selectedDefect.description}`} onClose={() => setSelectedDefect(null)}>
          <div className="space-y-4 text-xs">
            {error && (
              <p role="alert" className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Defect Description</span>
                <strong className="text-sm font-semibold">{selectedDefect.description}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Equipment Asset</span>
                <strong className="text-sm font-semibold text-primary">{selectedDefect.asset_name}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Severity Level</span>
                <strong className="text-sm font-semibold">{selectedDefect.severity}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Defect Status</span>
                <strong className="text-sm font-semibold">{selectedDefect.status}</strong>
              </div>
            </div>

            {/* Evidence Files Section */}
            <div className="card p-3 space-y-3 bg-muted/20 border">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <Paperclip size={13} className="text-primary" /> Fault Evidence Photos & Attached Files
                </h4>
                <button
                  type="button"
                  onClick={() => setFileUploadOpen(!fileUploadOpen)}
                  className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                >
                  <Upload size={12} /> Upload File
                </button>
              </div>

              {fileUploadOpen && (
                <form onSubmit={handleFileUpload} className="p-3 bg-white rounded border space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Evidence File Title</label>
                    <input
                      type="text"
                      placeholder="Photo title or evidence description..."
                      value={fileTitle}
                      onChange={(e) => setFileTitle(e.target.value)}
                      className="input-field text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Select File / Photo</label>
                    <input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="text-xs"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setFileUploadOpen(false)} className="btn-secondary text-xs">
                      Cancel
                    </button>
                    <button type="submit" disabled={uploadBusy || !uploadFile} className="btn-primary text-xs">
                      {uploadBusy ? 'Uploading...' : 'Upload Evidence'}
                    </button>
                  </div>
                </form>
              )}

              {evidenceFiles.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No evidence files uploaded yet for this fault.</p>
              ) : (
                <div className="space-y-2">
                  {evidenceFiles.map((f) => (
                    <div key={f.id} className="flex justify-between items-center bg-white p-2.5 rounded border text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip size={13} className="text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground truncate">{f.title || f.file_name}</span>
                        {f.size_bytes != null && (
                          <span className="text-[10px] text-muted-foreground">({Math.round(f.size_bytes / 1024)} KB)</span>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleFileView(f)}
                          className="btn-secondary py-0.5 px-2 text-[10px] flex items-center gap-1"
                        >
                          <Eye size={10} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFileDownload(String(f.id), f.file_name || 'evidence')}
                          className="btn-secondary py-0.5 px-2 text-[10px] flex items-center gap-1"
                        >
                          <Download size={10} /> Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedDefect(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <Modal name={`Evidence File Preview · ${previewFile.title}`} onClose={() => setPreviewFile(null)}>
          <div className="space-y-4">
            <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center p-2">
              {previewFile.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img src={previewFile.url} alt={previewFile.title} className="max-h-full max-w-full object-contain" />
              ) : (
                <iframe src={previewFile.url} title={previewFile.title} className="w-full h-full border-0" />
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">{previewFile.filename}</span>
              <button
                onClick={() => handleFileDownload(previewFile.id || '', previewFile.filename)}
                className="btn-primary text-xs flex items-center gap-1"
              >
                <Download size={12} /> Download File
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
