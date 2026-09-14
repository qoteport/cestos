'use client';

import React, { useState } from 'react';
import { Plus, Download, SlidersHorizontal, Filter, X } from 'lucide-react';
import { Modal, useData, rows } from '@/components/DataUI';

interface WorkforcePageHeaderProps {
  onAddEmployee?: () => void;
  departmentId: string;
  setDepartmentId: (d: string) => void;
  employmentStatus: string;
  setEmploymentStatus: (s: string) => void;
  availabilityStatus: string;
  setAvailabilityStatus: (a: string) => void;
  projectId: string;
  setProjectId: (p: string) => void;
  dateFrom: string;
  setDateFrom: (d: string) => void;
  dateTo: string;
  setDateTo: (d: string) => void;
}

export default function WorkforcePageHeader({
  onAddEmployee,
  departmentId,
  setDepartmentId,
  employmentStatus,
  setEmploymentStatus,
  availabilityStatus,
  setAvailabilityStatus,
  projectId,
  setProjectId,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: WorkforcePageHeaderProps) {
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Draft state
  const [draftDept, setDraftDept] = useState(departmentId);
  const [draftEmpStatus, setDraftEmpStatus] = useState(employmentStatus);
  const [draftAvailStatus, setDraftAvailStatus] = useState(availabilityStatus);
  const [draftProj, setDraftProj] = useState(projectId);
  const [draftDateFrom, setDraftDateFrom] = useState(dateFrom);
  const [draftDateTo, setDraftDateTo] = useState(dateTo);

  // Fetch departments & projects for filter dropdowns
  const deptsRes = useData('/api/v1/departments');
  const deptList = rows(deptsRes.data);

  const projsRes = useData('/api/v1/projects?page_size=100');
  const projList = rows(projsRes.data);

  const activeCount =
    (departmentId ? 1 : 0) +
    (employmentStatus ? 1 : 0) +
    (availabilityStatus ? 1 : 0) +
    (projectId ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setDepartmentId(draftDept);
    setEmploymentStatus(draftEmpStatus);
    setAvailabilityStatus(draftAvailStatus);
    setProjectId(draftProj);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setFilterModalOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Workforce</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Employee deployment, availability, rotations, and compliance across all projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className="px-3 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition flex items-center gap-1.5 shadow-sm"
          >
            <SlidersHorizontal size={14} />
            Filter Database Data
            {activeCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-primary font-bold">
                {activeCount}
              </span>
            )}
          </button>

          <button className="btn-secondary text-sm">
            <Download size={14} />
            Export Register
          </button>
          <button type="button" className="btn-primary text-sm" onClick={onAddEmployee}>
            <Plus size={14} />
            Add Employee
          </button>
        </div>
      </div>

      {/* Active Filter Pills */}
      {activeCount > 0 && (
        <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-primary" />
            <span className="font-semibold text-foreground">Active DB Query Filters:</span>
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
            {departmentId && (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium border">
                Dept ID: {departmentId.substring(0, 8)}...
              </span>
            )}
            {employmentStatus && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
                Emp Status: {employmentStatus}
              </span>
            )}
            {availabilityStatus && (
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                Availability: {availabilityStatus}
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
              setDepartmentId('');
              setEmploymentStatus('');
              setAvailabilityStatus('');
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
        <Modal name="Filter Workforce Database Data" onClose={() => setFilterModalOpen(false)}>
          <form onSubmit={handleApply} className="space-y-4 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg border text-muted-foreground">
              <p className="font-semibold text-foreground text-xs">Database Level Filtering</p>
              <p className="text-[11px] mt-0.5">
                Applies directly to backend SQL queries fetching workforce directories, assignment status, and KPI cards.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-foreground">Start Date (Date From)</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                  value={draftDateFrom}
                  onChange={(e) => setDraftDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">End Date (Date To)</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                  value={draftDateTo}
                  onChange={(e) => setDraftDateTo(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Department</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                value={draftDept}
                onChange={(e) => setDraftDept(e.target.value)}
              >
                <option value="">All Departments</option>
                {deptList.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.code ? `(${d.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Employment Status</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                value={draftEmpStatus}
                onChange={(e) => setDraftEmpStatus(e.target.value)}
              >
                <option value="">All Employment Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PROBATION">Probation</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="TERMINATED">Terminated</option>
                <option value="RESIGNED">Resigned</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Availability Status</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                value={draftAvailStatus}
                onChange={(e) => setDraftAvailStatus(e.target.value)}
              >
                <option value="">All Availability States</option>
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="REST_DAY">Rest Day</option>
                <option value="STANDBY">Standby</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Assigned Project</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                value={draftProj}
                onChange={(e) => setDraftProj(e.target.value)}
              >
                <option value="">All Projects</option>
                {projList.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </option>
                ))}
              </select>
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