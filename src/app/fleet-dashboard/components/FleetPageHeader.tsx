'use client';

import React, { useState } from 'react';
import { Plus, RefreshCw, SlidersHorizontal, Filter, X } from 'lucide-react';
import { Modal, useData, rows } from '@/components/DataUI';
import SearchableSelect from '@/components/SearchableSelect';
import AppDateTimePicker from '@/components/ui/AppDateTimePicker';

interface FleetPageHeaderProps {
  onAddAsset?: () => void;
  onRefresh?: () => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  categoryId: string;
  setCategoryId: (c: string) => void;
  locationId: string;
  setLocationId: (l: string) => void;
  projectId: string;
  setProjectId: (p: string) => void;
  dateFrom: string;
  setDateFrom: (d: string) => void;
  dateTo: string;
  setDateTo: (d: string) => void;
}

export default function FleetPageHeader({
  onAddAsset,
  onRefresh,
  statusFilter,
  setStatusFilter,
  categoryId,
  setCategoryId,
  locationId,
  setLocationId,
  projectId,
  setProjectId,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: FleetPageHeaderProps) {
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Draft state
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draftCategory, setDraftCategory] = useState(categoryId);
  const [draftLocation, setDraftLocation] = useState(locationId);
  const [draftProject, setDraftProject] = useState(projectId);
  const [draftDateFrom, setDraftDateFrom] = useState(dateFrom);
  const [draftDateTo, setDraftDateTo] = useState(dateTo);

  // Fetch Categories, Locations & Projects for filter dropdowns
  const catsRes = useData('/api/v1/asset-categories');
  const catList = rows(catsRes.data);

  const locsRes = useData('/api/v1/locations?page_size=100');
  const locList = rows(locsRes.data);

  const projsRes = useData('/api/v1/projects?page_size=100');
  const projList = rows(projsRes.data);

  const activeCount =
    (statusFilter ? 1 : 0) +
    (categoryId ? 1 : 0) +
    (locationId ? 1 : 0) +
    (projectId ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusFilter(draftStatus);
    setCategoryId(draftCategory);
    setLocationId(draftLocation);
    setProjectId(draftProject);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setFilterModalOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Fleet & Equipment Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Equipment status, inspections, defects, and assignments across all projects.
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

          <button onClick={onRefresh} className="btn-secondary text-sm flex items-center gap-1.5">
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={onAddAsset}
            className="btn-primary text-sm flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800"
          >
            <Plus size={14} />
            Add Asset
          </button>
        </div>
      </div>

      {/* Active Filter Pills */}
      {activeCount > 0 && (
        <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-primary" />
            <span className="font-semibold text-foreground">Active DB Query Filters:</span>
            {statusFilter && (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium border">
                Status: {statusFilter}
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
            {locationId && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200">
                Location ID: {locationId.substring(0, 8)}...
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
              setStatusFilter('');
              setCategoryId('');
              setLocationId('');
              setProjectId('');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1"
          >
            <X size={12} /> Clear DB Filters
          </button>
        </div>
      )}

      {/* FILTER POPUP MODAL */}
      {filterModalOpen && (
        <Modal name="Filter Fleet Database Data" onClose={() => setFilterModalOpen(false)}>
          <form onSubmit={handleApply} className="space-y-4 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg border text-muted-foreground">
              <p className="font-semibold text-foreground text-xs">Database Level Filtering</p>
              <p className="text-[11px] mt-0.5">
                Applies directly to backend SQL queries fetching equipment inventory, operational counts, and defect statistics.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-foreground">Start Date (Date From)</label>
                <AppDateTimePicker
                  mode="date"
                  value={draftDateFrom}
                  onChange={setDraftDateFrom}
                  placeholder="Select start date"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">End Date (Date To)</label>
                <AppDateTimePicker
                  mode="date"
                  value={draftDateTo}
                  onChange={setDraftDateTo}
                  placeholder="Select end date"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Asset Operational Status</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Operational Statuses' },
                  { value: 'OPERATING', label: 'Operating' },
                  { value: 'AVAILABLE', label: 'Available' },
                  { value: 'STANDBY', label: 'Standby' },
                  { value: 'BREAKDOWN', label: 'Breakdown' },
                  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
                  { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
                ]}
                value={draftStatus}
                onChange={setDraftStatus}
                searchable={false}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Equipment Category</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Categories' },
                  ...catList.map((c: any) => ({
                    value: c.id,
                    label: `${c.name}${c.code ? ` (${c.code})` : ''}`,
                  })),
                ]}
                value={draftCategory}
                onChange={setDraftCategory}
                searchable={catList.length > 5}
                placeholder="Select category..."
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Site Location</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Locations' },
                  ...locList.map((l: any) => ({
                    value: l.id,
                    label: `${l.name}${l.code ? ` (${l.code})` : ''}`,
                  })),
                ]}
                value={draftLocation}
                onChange={setDraftLocation}
                searchable={locList.length > 5}
                placeholder="Select location..."
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Assigned Project</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Projects' },
                  ...projList.map((p: any) => ({
                    value: p.id,
                    label: `${p.name}${p.code ? ` (${p.code})` : ''}`,
                  })),
                ]}
                value={draftProject}
                onChange={setDraftProject}
                searchable={projList.length > 5}
                placeholder="Select project..."
              />
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
                Apply Database Filters
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}