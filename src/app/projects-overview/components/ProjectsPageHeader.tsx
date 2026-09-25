'use client';

import React, { useState } from 'react';
import { Plus, Download, SlidersHorizontal, Filter, X } from 'lucide-react';
import { Modal, useData, rows } from '@/components/DataUI';
import SearchableSelect from '@/components/SearchableSelect';
import AppDateTimePicker from '@/components/ui/AppDateTimePicker';

interface ProjectsPageHeaderProps {
  onAddProject?: () => void;
  onExport?: () => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  clientId: string;
  setClientId: (c: string) => void;
  locationId: string;
  setLocationId: (l: string) => void;
  dateFrom: string;
  setDateFrom: (d: string) => void;
  dateTo: string;
  setDateTo: (d: string) => void;
}

export default function ProjectsPageHeader({
  onAddProject,
  onExport,
  statusFilter,
  setStatusFilter,
  clientId,
  setClientId,
  locationId,
  setLocationId,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: ProjectsPageHeaderProps) {
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Draft state
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draftClientId, setDraftClientId] = useState(clientId);
  const [draftLocationId, setDraftLocationId] = useState(locationId);
  const [draftDateFrom, setDraftDateFrom] = useState(dateFrom);
  const [draftDateTo, setDraftDateTo] = useState(dateTo);

  // Fetch clients & locations for filter dropdowns
  const clientsRes = useData('/api/v1/clients?page_size=100');
  const clientList = rows(clientsRes.data);

  const locationsRes = useData('/api/v1/locations?page_size=100');
  const locationList = rows(locationsRes.data);

  const activeCount =
    (statusFilter ? 1 : 0) +
    (clientId ? 1 : 0) +
    (locationId ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusFilter(draftStatus);
    setClientId(draftClientId);
    setLocationId(draftLocationId);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setFilterModalOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Operations portfolio</p>
          <h1 className="page-title">Projects Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Delivery, drilling performance and projects that need attention.
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

          <button className="btn-secondary text-sm" onClick={onExport}>
            <Download size={14} />
            Export
          </button>
          <button type="button" className="btn-primary text-sm" onClick={onAddProject}>
            <Plus size={14} />
            New Project
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
            {clientId && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px] font-medium border border-purple-200">
                Client ID: {clientId.substring(0, 8)}...
              </span>
            )}
            {locationId && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200">
                Location ID: {locationId.substring(0, 8)}...
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setStatusFilter('');
              setClientId('');
              setLocationId('');
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
        <Modal name="Filter Projects Database Data" onClose={() => setFilterModalOpen(false)}>
          <form onSubmit={handleApply} className="space-y-4 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg border text-muted-foreground">
              <p className="font-semibold text-foreground text-xs">Database Level Filtering</p>
              <p className="text-[11px] mt-0.5">
                Applies directly to backend SQL queries fetching project registers, KPIs, and site metrics.
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
              <label className="block font-semibold mb-1 text-foreground">Project Operational Status</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Operational Statuses' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'MOBILIZING', label: 'Mobilizing' },
                  { value: 'PLANNING', label: 'Planning' },
                  { value: 'PAUSED', label: 'Paused' },
                  { value: 'COMPLETED', label: 'Completed' },
                ]}
                value={draftStatus}
                onChange={setDraftStatus}
                searchable={false}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Client Organization</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Client Accounts' },
                  ...clientList.map((c: any) => ({
                    value: c.id,
                    label: `${c.name}${c.code ? ` (${c.code})` : ''}`,
                  })),
                ]}
                value={draftClientId}
                onChange={setDraftClientId}
                searchable={clientList.length > 5}
                placeholder="Select client..."
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Site Location / Territory</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Site Locations' },
                  ...locationList.map((loc: any) => ({
                    value: loc.id,
                    label: `${loc.name}${loc.code ? ` (${loc.code})` : ''}`,
                  })),
                ]}
                value={draftLocationId}
                onChange={setDraftLocationId}
                searchable={locationList.length > 5}
                placeholder="Select location..."
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
