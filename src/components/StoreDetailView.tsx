'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Package, FileText, Plus, Upload, Download, AlertTriangle, Boxes, DollarSign,  } from 'lucide-react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { useData, State, Row, rows, Table, Facts, Modal } from './DataUI';
import RecordForm from './RecordForm';
import { operation } from './ResourceWorkspace';

export default function StoreDetailView({ storeId }: { storeId: string }) {
  const auth = useAuth();
  const root = '/api/v1/inventory/stores/' + storeId;
  const storeRes = useData(root);
  const dashboardRes = useData(root + '/dashboard');
  const stockRes = useData(root + '/stock?page_size=100');
  const binsRes = useData(root + '/bins');
  const filesRes = useData(root + '/files');

  const [tab, setTab] = useState<'stock' | 'bins' | 'movements' | 'files'>('stock');
  const [selectedItem, setSelectedItem] = useState<Row | null>(null);
  const [addBinModalOpen, setAddBinModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [fileTitle, setFileTitle] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState('');

  const store = storeRes.data || {};
  const dashboard = dashboardRes.data || {};
  const stockList = rows(stockRes.data);
  const binsList = rows(binsRes.data);
  const filesList = rows(filesRes.data);

  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!fileToUpload || uploadBusy) return;
    setUploadBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', fileToUpload);
      if (fileTitle.trim()) fd.append('title', fileTitle.trim());
      await apiFetch(root + '/files', {
        method: 'POST',
        body: fd,
      });
      setUploadModalOpen(false);
      setFileTitle('');
      setFileToUpload(null);
      filesRes.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to upload store file');
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleDownloadFile(fileId: string, filename: string) {
    try {
      const blob = await apiFetchBlob('/api/v1/inventory/store-files/' + fileId + '/download');
      downloadBlob(blob, filename);
    } catch (err: any) {
      setError(err.message || 'Failed to download file');
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <Link
            href="/workspace/inventory/stores"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft size={13} />
            Back to Inventory Stores
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {store.name || 'Inventory Store Facility'}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="font-mono font-medium">#{store.store_number || 'STORE'}</span>
                <span>·</span>
                <span className="badge badge-active text-[11px]">
                  {store.store_type?.replace(/_/g, ' ') || 'MAIN WAREHOUSE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {auth.can('inventory.catalog.manage') && (
            <button
              className="btn-primary text-xs"
              onClick={() => setAddBinModalOpen(true)}
            >
              <Plus size={13} />
              Add Storage Bin
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Metrics Strip */}
      <State loading={dashboardRes.loading} error={dashboardRes.error} retry={dashboardRes.reload}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 space-y-1 bg-white border">
            <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold block">
              Stocked Inventory Items
            </span>
            <div className="flex items-baseline justify-between">
              <strong className="text-xl font-bold text-slate-900">
                {dashboard.total_items ?? stockList.length}
              </strong>
              <Package size={18} className="text-blue-600" />
            </div>
            <span className="text-[11px] text-muted-foreground block">Distinct SKUs in facility</span>
          </div>

          <div className="card p-4 space-y-1 bg-white border">
            <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold block">
              Total Stock Valuation
            </span>
            <div className="flex items-baseline justify-between">
              <strong className="text-xl font-bold text-green-700">
                ${Number(dashboard.total_valuation || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </strong>
              <DollarSign size={18} className="text-green-600" />
            </div>
            <span className="text-[11px] text-muted-foreground block">Valued at standard cost</span>
          </div>

          <div className="card p-4 space-y-1 bg-white border">
            <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold block">
              Critical / Low Stock Items
            </span>
            <div className="flex items-baseline justify-between">
              <strong className="text-xl font-bold text-amber-700">
                {dashboard.critical_items_count ?? stockList.filter((s) => Number(s.quantity_on_hand) <= Number(s.reorder_point || 0)).length}
              </strong>
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <span className="text-[11px] text-muted-foreground block">Requires reorder attention</span>
          </div>

          <div className="card p-4 space-y-1 bg-white border">
            <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold block">
              Storage Bins & Locations
            </span>
            <div className="flex items-baseline justify-between">
              <strong className="text-xl font-bold text-indigo-700">
                {binsList.length} Bins
              </strong>
              <Boxes size={18} className="text-indigo-600" />
            </div>
            <span className="text-[11px] text-muted-foreground block">Active zones & aisles</span>
          </div>
        </div>
      </State>

      {/* Main Workspace Navigation Tabs */}
      <div className="border-b flex gap-4 text-xs font-semibold">
        <button
          className={`pb-2 border-b-2 flex items-center gap-1.5 ${
            tab === 'stock' ?'border-primary text-primary font-bold' :'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('stock')}
        >
          <Package size={14} />
          Inventory Stock ({stockList.length})
        </button>
        <button
          className={`pb-2 border-b-2 flex items-center gap-1.5 ${
            tab === 'bins' ?'border-primary text-primary font-bold' :'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('bins')}
        >
          <Boxes size={14} />
          Storage Bins ({binsList.length})
        </button>
        <button
          className={`pb-2 border-b-2 flex items-center gap-1.5 ${
            tab === 'files' ?'border-primary text-primary font-bold' :'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('files')}
        >
          <FileText size={14} />
          Store Files & Layouts ({filesList.length})
        </button>
      </div>

      {/* Tab Contents */}
      {tab === 'stock' && (
        <section className="card p-4 space-y-4">
          <State loading={stockRes.loading} error={stockRes.error} retry={stockRes.reload}>
            <Table
              data={stockList.map((r: Row) => ({
                ...r,
                item_name: r.name || r.item?.name || 'Inventory Item',
                sku_code: r.sku || r.item?.sku || '—',
                bin_location: r.bin_code || r.bin?.code || 'Default Stock Area',
                qty_on_hand: `${r.quantity_on_hand || 0} ${r.unit_symbol || ''}`,
                total_value: `$${(Number(r.quantity_on_hand || 0) * Number(r.standard_unit_cost || 0)).toFixed(2)}`,
              }))}
              columns={['sku_code', 'item_name', 'bin_location', 'qty_on_hand', 'total_value']}
              onSelect={(item) => setSelectedItem(item)}
            />
          </State>
        </section>
      )}

      {tab === 'bins' && (
        <section className="card p-4 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Storage Bins & Racks Layout
            </h3>
            {auth.can('inventory.catalog.manage') && (
              <button
                className="btn-secondary text-xs"
                onClick={() => setAddBinModalOpen(true)}
              >
                <Plus size={12} />
                Create Storage Bin
              </button>
            )}
          </div>
          <State loading={binsRes.loading} error={binsRes.error} retry={binsRes.reload}>
            {binsList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-6 text-center">
                No specific storage bins configured for this facility yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {binsList.map((bin: Row) => (
                  <div key={bin.id} className="p-3.5 border rounded-lg bg-white space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-sm text-primary">
                        {bin.code}
                      </span>
                      <span className="badge badge-active text-[10px]">BIN</span>
                    </div>
                    <p className="text-xs font-medium text-slate-800">{bin.name || 'Storage Location'}</p>
                    <div className="grid grid-cols-3 gap-1 text-[11px] text-muted-foreground pt-1 border-t">
                      <div>Zone: <strong className="text-slate-700">{bin.zone || 'A'}</strong></div>
                      <div>Aisle: <strong className="text-slate-700">{bin.aisle || '1'}</strong></div>
                      <div>Shelf: <strong className="text-slate-700">{bin.shelf || '1'}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </State>
        </section>
      )}

      {tab === 'files' && (
        <section className="card p-4 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Store Facility Layout Plans, Permits & Media Files
            </h3>
            {auth.can('inventory.catalog.manage') && (
              <button
                className="btn-primary text-xs"
                onClick={() => setUploadModalOpen(true)}
              >
                <Upload size={12} />
                Attach Store File
              </button>
            )}
          </div>
          <State loading={filesRes.loading} error={filesRes.error} retry={filesRes.reload}>
            {filesList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-6 text-center">
                No store layout plans, photos, or file attachments uploaded yet.
              </p>
            ) : (
              <ul className="divide-y border rounded bg-white text-xs">
                {filesList.map((f: Row) => (
                  <li key={f.id} className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded">
                        <FileText size={18} />
                      </div>
                      <div>
                        <strong className="block font-semibold text-slate-900">
                          {f.title || f.file_name}
                        </strong>
                        <span className="text-muted-foreground text-[11px]">
                          {f.file_name} ·{' '}
                          {f.size_bytes ? Math.round(f.size_bytes / 1024) + ' KB' : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => handleDownloadFile(f.id, f.file_name || 'store_file')}
                    >
                      <Download size={12} />
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </State>
        </section>
      )}

      {/* Selected Stock Item Details Modal */}
      {selectedItem && (
        <Modal
          name={'Item Details · ' + (selectedItem.item_name || selectedItem.name || 'Stock Item')}
          onClose={() => setSelectedItem(null)}
        >
          <Facts data={selectedItem} />
          <div className="flex gap-2 mt-4 pt-3 border-t">
            <Link
              href={'/workspace/inventory/items/' + (selectedItem.item_id || selectedItem.id)}
              className="btn-primary text-xs"
            >
              View Full Item Workspace
            </Link>
          </div>
        </Modal>
      )}

      {/* Add Storage Bin Modal */}
      {addBinModalOpen && (
        <Modal
          name="Create Storage Bin Location"
          onClose={() => setAddBinModalOpen(false)}
        >
          <RecordForm
            resource="inventory/storage-bins"
            operation={operation('/api/v1/inventory/stores/{id}/bins', 'POST') || { method: 'POST', permissions: ['inventory:write'] }}
            path={'/api/v1/inventory/stores/' + storeId + '/bins'}
            initial={{ store_id: storeId }}
            onClose={() => setAddBinModalOpen(false)}
            onSaved={() => {
              setAddBinModalOpen(false);
              binsRes.reload();
            }}
          />
        </Modal>
      )}

      {/* File Upload Modal */}
      {uploadModalOpen && (
        <Modal
          name="Attach File to Store Facility"
          onClose={() => setUploadModalOpen(false)}
        >
          <form onSubmit={handleFileUpload} className="space-y-4 text-xs p-1">
            {error && <p className="text-red-600">{error}</p>}
            <div>
              <label className="block font-semibold mb-1">Select Layout Plan / File *</label>
              <input
                type="file"
                required
                className="input-field p-1"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFileToUpload(f);
                  if (f && !fileTitle) setFileTitle(f.name);
                }}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Title / Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Store Layout Diagram, Fire Permit"
                className="input-field"
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setUploadModalOpen(false)}
              >
                Cancel
              </button>
              <button disabled={uploadBusy} className="btn-primary">
                {uploadBusy ? 'Uploading…' : 'Upload File'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
