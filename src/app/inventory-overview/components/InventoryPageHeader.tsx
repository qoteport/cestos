import React from 'react';
import { Plus, Download, RefreshCw } from 'lucide-react';

export default function InventoryPageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="page-title">Inventory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stock levels, movements, and reorder status across all stores.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn-secondary text-sm">
          <RefreshCw size={14} />
          Refresh
        </button>
        <button className="btn-secondary text-sm">
          <Download size={14} />
          Export
        </button>
        <button className="btn-primary text-sm">
          <Plus size={14} />
          New Receipt
        </button>
      </div>
    </div>
  );
}