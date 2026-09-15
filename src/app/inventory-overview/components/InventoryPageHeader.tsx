'use client';

import React, { useState } from 'react';
import { Plus, MinusCircle, Download, RefreshCw, SlidersHorizontal, Filter, X } from 'lucide-react';
import { Modal, useData, rows } from '@/components/DataUI';
import RecordForm from '@/components/RecordForm';
import { operation } from '@/components/ResourceWorkspace';

interface InventoryPageHeaderProps {
  onRefresh?: () => void;
  storeId: string;
  setStoreId: (s: string) => void;
  categoryId: string;
  setCategoryId: (c: string) => void;
  supplierId: string;
  setSupplierId: (s: string) => void;
  projectId: string;
  setProjectId: (p: string) => void;
  dateFrom: string;
  setDateFrom: (d: string) => void;
  dateTo: string;
  setDateTo: (d: string) => void;
}

export default function InventoryPageHeader({
  onRefresh,
  storeId,
  setStoreId,
  categoryId,
  setCategoryId,
  supplierId,
  setSupplierId,
  projectId,
  setProjectId,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: InventoryPageHeaderProps) {
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  // Draft state
  const [draftStore, setDraftStore] = useState(storeId);
  const [draftCategory, setDraftCategory] = useState(categoryId);
  const [draftSupplier, setDraftSupplier] = useState(supplierId);
  const [draftProject, setDraftProject] = useState(projectId);
  const [draftDateFrom, setDraftDateFrom] = useState(dateFrom);
  const [draftDateTo, setDraftDateTo] = useState(dateTo);

  // Fetch dropdown data
  const storesRes = useData('/api/v1/inventory/stores');
  const storeList = rows(storesRes.data);

  const catsRes = useData('/api/v1/inventory/categories');
  const catList = rows(catsRes.data);

  const suppsRes = useData('/api/v1/inventory/suppliers?page_size=100');
  const suppList = rows(suppsRes.data);

  const projsRes = useData('/api/v1/projects?page_size=100');
  const projList = rows(projsRes.data);

  const activeCount =
    (storeId ? 1 : 0) +
    (categoryId ? 1 : 0) +
    (supplierId ? 1 : 0) +
    (projectId ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setStoreId(draftStore);
    setCategoryId(draftCategory);
    setSupplierId(draftSupplier);
    setProjectId(draftProject);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setFilterModalOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stock levels, movements, and reorder status across all stores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className="px-3 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition flex items-center gap-1.5 shadow-sm"
          >
            <SlidersHorizontal size={14} />
            Filter Data
            {activeCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-primary font-bold">
                {activeCount}
              </span>
            )}
          </button>

          <button onClick={onRefresh} className="btn-secondary text-sm">
            <RefreshCw size={14} />
            Refresh
          </button>
          <button className="btn-secondary text-sm">
            <Download size={14} />
            Export
          </button>
          <button
            type="button"
            onClick={() => setIssueModalOpen(true)}
            title="Log items taken out of store for a project, work order, or asset (automatically reduces stock on hand)"
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <MinusCircle size={14} />
            Take / Pick Stock (-)
          </button>
          <button
            type="button"
            onClick={() => setReceiptModalOpen(true)}
            title="Log new items received from a supplier delivery (automatically increases stock on hand)"
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Plus size={14} />
            Receive Stock (+)
          </button>
          <button
            type="button"
            onClick={() => setAdjustModalOpen(true)}
            title="Correct physical stock count discrepancies or log damaged items"
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <SlidersHorizontal size={14} />
            Adjust Count
          </button>
        </div>
      </div>

      {/* Active Filter Pills */}
      {activeCount > 0 && (
        <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-primary" />
            <span className="font-semibold text-foreground">Active DB Query Filters:</span>
            {storeId && (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium border">
                Store ID: {storeId.substring(0, 8)}...
              </span>
            )}
            {dateFrom && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
                From: {dateFrom}
              </span>
            )}
            {dateTo && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
                To: {dateTo}
              </span>
            )}
            {categoryId && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
                Category ID: {categoryId.substring(0, 8)}...
              </span>
            )}
            {supplierId && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200">
                Supplier ID: {supplierId.substring(0, 8)}...
              </span>
            )}
            {projectId && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px] font-medium border border-purple-200">
                Project ID: {projectId.substring(0, 8)}...
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setStoreId('');
              setCategoryId('');
              setSupplierId('');
              setProjectId('');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
          >
            <X size={12} /> Clear all filters
          </button>
        </div>
      )}

      {/* Filter Modal */}
      {filterModalOpen && (
        <Modal name="Filter Inventory Data" onClose={() => setFilterModalOpen(false)}>
          <form onSubmit={handleApply} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-foreground mb-1">Target Store</label>
                <select
                  value={draftStore}
                  onChange={(e) => setDraftStore(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-card text-foreground"
                >
                  <option value="">All Stores</option>
                  {storeList.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Item Category</label>
                <select
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-card text-foreground"
                >
                  <option value="">All Categories</option>
                  {catList.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Supplier</label>
                <select
                  value={draftSupplier}
                  onChange={(e) => setDraftSupplier(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-card text-foreground"
                >
                  <option value="">All Suppliers</option>
                  {suppList.map((sup: any) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Associated Project</label>
                <select
                  value={draftProject}
                  onChange={(e) => setDraftProject(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-card text-foreground"
                >
                  <option value="">All Projects</option>
                  {projList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Date Range (From)</label>
                <input
                  type="date"
                  value={draftDateFrom}
                  onChange={(e) => setDraftDateFrom(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-card text-foreground"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">Date Range (To)</label>
                <input
                  type="date"
                  value={draftDateTo}
                  onChange={(e) => setDraftDateTo(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-card text-foreground"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                className="px-4 py-2 text-xs border rounded-lg hover:bg-muted font-medium"
                onClick={() => setFilterModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* New Stock Receipt Modal */}
      {receiptModalOpen && (
        <Modal name="New Stock Receipt (GRN)" onClose={() => setReceiptModalOpen(false)}>
          <RecordForm
            resource="inventory/receipts"
            operation={
              operation('/api/v1/inventory/receipts', 'POST') || {
                method: 'POST',
                permissions: ['inventory.receipts.create'],
              }
            }
            path="/api/v1/inventory/receipts"
            allowFile={true}
            initial={storeId ? { store_id: storeId } : undefined}
            onClose={() => setReceiptModalOpen(false)}
            onSaved={() => {
              setReceiptModalOpen(false);
              onRefresh?.();
            }}
          />
        </Modal>
      )}

      {/* New Goods Issue Modal */}
      {issueModalOpen && (
        <Modal name="Log Item Pick (Reduces Stock on Hand)" onClose={() => setIssueModalOpen(false)}>
          <RecordForm
            resource="inventory/issues"
            operation={
              operation('/api/v1/inventory/issues', 'POST') || {
                method: 'POST',
                permissions: ['inventory.issues.create'],
              }
            }
            path="/api/v1/inventory/issues"
            initial={storeId ? { store_id: storeId } : undefined}
            onClose={() => setIssueModalOpen(false)}
            onSaved={() => {
              setIssueModalOpen(false);
              onRefresh?.();
            }}
          />
        </Modal>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && (
        <Modal name="Adjust Physical Stock Count" onClose={() => setAdjustModalOpen(false)}>
          <RecordForm
            resource="inventory/adjustments"
            operation={
              operation('/api/v1/inventory/adjustments', 'POST') || {
                method: 'POST',
                permissions: ['inventory.adjustments.create'],
              }
            }
            path="/api/v1/inventory/adjustments"
            initial={storeId ? { store_id: storeId } : undefined}
            onClose={() => setAdjustModalOpen(false)}
            onSaved={() => {
              setAdjustModalOpen(false);
              onRefresh?.();
            }}
          />
        </Modal>
      )}
    </div>
  );
}