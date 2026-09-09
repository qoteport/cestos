import React from 'react';
import { Plus, Download, RefreshCw } from 'lucide-react';

export default function FleetPageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="page-title">Fleet</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Equipment status, inspections, defects, and assignments across all projects.
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
          Add Asset
        </button>
      </div>
    </div>
  );
}