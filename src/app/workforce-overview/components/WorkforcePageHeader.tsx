import React from 'react';
import { Plus, Download } from 'lucide-react';

export default function WorkforcePageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="page-title">Workforce</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Employee deployment, availability, rotations, and compliance across all projects.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn-secondary text-sm">
          <Download size={14} />
          Export Register
        </button>
        <button className="btn-primary text-sm">
          <Plus size={14} />
          Add Employee
        </button>
      </div>
    </div>
  );
}