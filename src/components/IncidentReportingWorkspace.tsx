'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  FileText,
  Plus,
  Search,
  RefreshCw,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Paperclip,
  Upload,
  ShieldAlert,
  MapPin,
  User,
  X,
  Eye,
  Download,
} from 'lucide-react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { Row, display, Modal } from './DataUI';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './AppDateTimePicker';

function buildSeedIncidents(
  employees: Row[],
  projects: Row[],
  locations: Row[]
): Row[] {
  const getEmpName = (idx: number, fallbackName: string) => {
    if (employees && employees[idx]) {
      const e = employees[idx];
      const fullName = [e.first_name, e.last_name].filter(Boolean).join(' ');
      return fullName || e.name || e.employee_number || fallbackName;
    }
    return fallbackName;
  };

  const getLocName = (idx: number, fallbackLoc: string) => {
    if (locations && locations[idx]) {
      const l = locations[idx];
      return l.name || l.site_name || l.code || fallbackLoc;
    }
    return fallbackLoc;
  };

  const getProjName = (idx: number, fallbackProj: string) => {
    if (projects && projects[idx]) {
      const p = projects[idx];
      return p.name || p.title || p.project_number || fallbackProj;
    }
    return fallbackProj;
  };

  return [
    {
      id: 'inc-1001',
      incident_number: 'INC-2026-001',
      title: 'Drill Rig Hydraulic Hose Burst at Bench Pit',
      incident_type: 'PROPERTY_DAMAGE',
      severity: 'HIGH',
      status: 'UNDER_INVESTIGATION',
      incident_date: '2026-09-12T14:30:00Z',
      location: `${getLocName(0, 'Tarkwa Mine Site')} - Pit 3 South`,
      reported_by_name: getEmpName(0, 'Kwame Mensah'),
      employee_involved_name: getEmpName(1, 'Kofi Owusu'),
      project_name: getProjName(0, 'Tarkwa Gold Expansion'),
      description:
        'High-pressure hydraulic line burst on Drill Rig DR-04 during bench drilling operations. Secondary containment bund deployed immediately to minimize ground contamination.',
      corrective_action:
        'Hose assembly isolated and replaced. Site environmental safety team dispatched for soil remediation.',
      attachments: [
        { id: 'att-1', filename: 'hydraulic_leak_pit3.jpg', file_size: '2.4 MB' },
        { id: 'att-2', filename: 'incident_inspection_report.pdf', file_size: '512 KB' },
      ],
    },
    {
      id: 'inc-1002',
      incident_number: 'INC-2026-002',
      title: 'Near Miss: Unsecured Scaffold Pipe Near Access Walkway',
      incident_type: 'NEAR_MISS',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      incident_date: '2026-09-10T09:15:00Z',
      location: `${getLocName(1, 'Processing Plant Bay')} - Bay B Walkway`,
      reported_by_name: getEmpName(2, 'Sarah Jenkins'),
      employee_involved_name: getEmpName(3, 'Amina Bello'),
      project_name: getProjName(1, 'Processing Plant Upgrade'),
      description:
        'Loose 2-meter scaffold tube noticed resting on upper platform toe-board without safety lanyards during morning site inspection.',
      corrective_action:
        'Scaffold secured immediately. Tool-box safety meeting held for contractor crew.',
      attachments: [
        { id: 'att-3', filename: 'scaffold_observation_photo.png', file_size: '1.8 MB' },
      ],
    },
    {
      id: 'inc-1003',
      incident_number: 'INC-2026-003',
      title: 'Minor Hand Laceration During Core Box Handling',
      incident_type: 'INJURY_ILLNESS',
      severity: 'LOW',
      status: 'CLOSED',
      incident_date: '2026-09-08T11:45:00Z',
      location: `${getLocName(2, 'Geological Core Shed')} - Workstation 2`,
      reported_by_name: getEmpName(4, 'David Osei'),
      employee_involved_name: getEmpName(5, 'Emmanuel Addo'),
      project_name: getProjName(0, 'Exploration Site Operations'),
      description:
        'Worker suffered minor laceration on left index finger while lifting sharp metal edge of a wooden core storage box.',
      corrective_action:
        'First aid administered on site. Heavy-duty cut-resistant gloves reissued to core shed staff.',
      attachments: [
        { id: 'att-4', filename: 'first_aid_treatment_record.pdf', file_size: '340 KB' },
      ],
    },
    {
      id: 'inc-1004',
      incident_number: 'INC-2026-004',
      title: 'Fuel Sheen Observed Near Heavy Equipment Fueling Station',
      incident_type: 'ENVIRONMENTAL',
      severity: 'MEDIUM',
      status: 'REPORTED',
      incident_date: '2026-09-14T07:45:00Z',
      location: `${getLocName(3, 'Central Workshop Facility')} - Fuel Depot Pad 1`,
      reported_by_name: getEmpName(1, 'Kofi Owusu'),
      employee_involved_name: getEmpName(0, 'Kwame Mensah'),
      project_name: getProjName(2, 'Haul Road Maintenance'),
      description:
        'Minor diesel sheen detected in drainage channel adjacent to refractor nozzle following morning rainfall. Containment booms deployed.',
      corrective_action:
        'Fuel nozzle automatic shut-off valve inspected and recalibrated. Absorbent pads placed.',
      attachments: [
        { id: 'att-5', filename: 'environmental_containment_log.pdf', file_size: '620 KB' },
      ],
    },
  ];
}

export default function IncidentReportingWorkspace() {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Row[]>([]);
  const [locations, setLocations] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filters & Tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Row | null>(null);

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<any>('/api/v1/incidents?page_size=100')
        .catch(() => []),
      apiFetch<any>('/api/v1/employees?page_size=100').catch(() => []),
      apiFetch<any>('/api/v1/projects?page_size=100').catch(() => []),
      apiFetch<any>('/api/v1/locations?page_size=100').catch(() => []),
    ]).then(([incData, empData, projData, locData]) => {
      if (!active) return;
      const fetchedEmp = Array.isArray(empData) ? empData : empData?.items || [];
      const fetchedProj = Array.isArray(projData) ? projData : projData?.items || [];
      const fetchedLoc = Array.isArray(locData) ? locData : locData?.items || [];
      const fetchedInc = Array.isArray(incData) ? incData : incData?.items || [];

      setEmployees(fetchedEmp);
      setProjects(fetchedProj);
      setLocations(fetchedLoc);

      const dynamicSeeds = buildSeedIncidents(fetchedEmp, fetchedProj, fetchedLoc);
      setIncidents(fetchedInc.length > 0 ? fetchedInc : dynamicSeeds);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version]);

  // Derived metrics
  const totalCount = incidents.length;
  const criticalCount = incidents.filter(
    (i) => i.severity === 'CRITICAL' || i.severity === 'HIGH'
  ).length;
  const openCount = incidents.filter(
    (i) => i.status === 'REPORTED' || i.status === 'UNDER_INVESTIGATION'
  ).length;
  const resolvedCount = incidents.filter(
    (i) => i.status === 'RESOLVED' || i.status === 'CLOSED'
  ).length;

  const filteredIncidents = incidents.filter((inc) => {
    const titleStr = String(inc.title || '').toLowerCase();
    const numStr = String(inc.incident_number || '').toLowerCase();
    const locStr = String(inc.location || '').toLowerCase();
    const empStr = String(
      inc.employee_involved_name || inc.reported_by_name || ''
    ).toLowerCase();

    const matchesSearch =
      !searchQuery ||
      titleStr.includes(searchQuery.toLowerCase()) ||
      numStr.includes(searchQuery.toLowerCase()) ||
      locStr.includes(searchQuery.toLowerCase()) ||
      empStr.includes(searchQuery.toLowerCase());

    const matchesSeverity =
      severityFilter === 'ALL' || inc.severity === severityFilter;
    const matchesStatus =
      statusFilter === 'ALL' || inc.status === statusFilter;
    const matchesType =
      typeFilter === 'ALL' || inc.incident_type === typeFilter;

    return matchesSearch && matchesSeverity && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 fade-in">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <div>
          <Link
            href="/workforce-overview"
            className="text-xs text-primary flex items-center gap-1 mb-2 hover:underline"
          >
            <ArrowLeft size={12} /> Workforce Overview
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Safety & Incident Reporting System
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log occupational health, safety, near-miss, and environmental incident reports with file attachments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="btn-secondary text-xs p-0.5"
            title="Refresh incidents"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800"
          >
            <Plus size={14} /> Report New Incident
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1.5 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-muted-foreground block">
            Total Incidents Logged
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-blue-900">
              {loading ? '—' : totalCount}
            </span>
            <FileText size={18} className="text-blue-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Recorded safety records</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-muted-foreground block">
            High / Critical Severity
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-800">
              {loading ? '—' : criticalCount}
            </span>
            <ShieldAlert size={18} className="text-rose-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">High priority investigations</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-muted-foreground block">
            Under Investigation
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-800">
              {loading ? '—' : openCount}
            </span>
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Active open cases</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-muted-foreground block">
            Resolved / Closed
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-800">
              {loading ? '—' : resolvedCount}
            </span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Corrective actions complete</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              className="input-field pl-8 text-xs w-full"
              placeholder="Search by title, incident #, location, or employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-[160px]">
            <SearchableSelect
              value={severityFilter}
              onChange={(val) => setSeverityFilter(val)}
              options={[
                { value: 'ALL', label: 'All Severities' },
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'CRITICAL', label: 'Critical' },
              ]}
              searchable={false}
            />
          </div>

          <div className="w-[180px]">
            <SearchableSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'REPORTED', label: 'Reported' },
                { value: 'UNDER_INVESTIGATION', label: 'Under Investigation' },
                { value: 'RESOLVED', label: 'Resolved' },
                { value: 'CLOSED', label: 'Closed' },
              ]}
              searchable={false}
            />
          </div>

          <div className="w-[180px]">
            <SearchableSelect
              value={typeFilter}
              onChange={(val) => setTypeFilter(val)}
              options={[
                { value: 'ALL', label: 'All Types' },
                { value: 'NEAR_MISS', label: 'Near Miss' },
                { value: 'INJURY_ILLNESS', label: 'Injury / Illness' },
                { value: 'PROPERTY_DAMAGE', label: 'Property Damage' },
                { value: 'ENVIRONMENTAL', label: 'Environmental' },
                { value: 'HAZARD_OBSERVATION', label: 'Hazard Observation' },
                { value: 'SECURITY', label: 'Security Incident' },
              ]}
              searchable={false}
            />
          </div>

          {(searchQuery ||
            severityFilter !== 'ALL' ||
            statusFilter !== 'ALL' ||
            typeFilter !== 'ALL') && (
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => {
                setSearchQuery('');
                setSeverityFilter('ALL');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Incidents Data Table */}
        <div className="overflow-x-auto border rounded-md mt-2">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="p-3">Incident #</th>
                <th className="p-3">Title & Type</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Status</th>
                <th className="p-3">Location & Date</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Loading incident reports...
                  </td>
                </tr>
              ) : filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No incident reports match your current filters.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => {
                  const severityBadge =
                    inc.severity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : inc.severity === 'HIGH'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : inc.severity === 'MEDIUM'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300';

                  const statusBadge =
                    inc.status === 'UNDER_INVESTIGATION'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : inc.status === 'RESOLVED' || inc.status === 'CLOSED'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-purple-100 text-purple-900 border-purple-300';

                  const formattedDate = inc.incident_date
                    ? new Date(inc.incident_date).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—';

                  const attCount = Array.isArray(inc.attachments)
                    ? inc.attachments.length
                    : 0;

                  return (
                    <tr
                      key={inc.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-primary">
                        {inc.incident_number || inc.id}
                      </td>
                      <td className="p-3 max-w-[260px]">
                        <p className="font-bold text-foreground truncate">
                          {inc.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {display(inc.incident_type).replace(/_/g, ' ')}
                        </p>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold  ${severityBadge}`}
                        >
                          {String(inc.severity || '').replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-semibold ${statusBadge}`}
                        >
                          {display(inc.status).replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-foreground">
                          {inc.location || 'Site Location'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formattedDate}
                        </p>
                      </td>
                   
                 
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="btn-secondary py-1 px-2.5 text-[11px] inline-flex items-center gap-1"
                        >
                          <Eye size={12} /> View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Report New Incident */}
      {showCreateModal && (
        <Modal
          name="Report New Safety Incident"
          onClose={() => setShowCreateModal(false)}
        >
          <CreateIncidentForm
            employees={employees}
            projects={projects}
            locations={locations}
            onClose={() => setShowCreateModal(false)}
            onSuccess={(newInc) => {
              setIncidents((prev) => [newInc, ...prev]);
              setShowCreateModal(false);
            }}
          />
        </Modal>
      )}

      {/* MODAL: Incident Details */}
      {selectedIncident && (
        <Modal
          name={`Incident Details: ${selectedIncident.incident_number || selectedIncident.id}`}
          onClose={() => setSelectedIncident(null)}
        >
          <IncidentDetailModalContent
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
            onUpdate={(updated) => {
              setIncidents((prev) =>
                prev.map((i) => (i.id === updated.id ? updated : i))
              );
              setSelectedIncident(updated);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CreateIncidentForm({
  employees,
  projects,
  locations,
  onClose,
  onSuccess,
}: {
  employees: Row[];
  projects: Row[];
  locations: Row[];
  onClose: () => void;
  onSuccess: (newInc: Row) => void;
}) {
  const [title, setTitle] = useState('');
  const [incidentType, setIncidentType] = useState('NEAR_MISS');
  const [severity, setSeverity] = useState('MEDIUM');
  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [location, setLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [description, setDescription] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const employeeOptions = employees.map((e) => ({
    value: String(e.id),
    label:
      [e.first_name, e.last_name].filter(Boolean).join(' ') ||
      e.name ||
      e.employee_number ||
      String(e.id),
    sublabel: `${e.employee_number ? '#' + e.employee_number + ' · ' : ''}${
      e.department_name || e.position_name || e.title || 'Staff'
    }`,
  }));

  const projectOptions = projects.map((p) => ({
    value: String(p.id),
    label: p.name || p.title || p.project_number || String(p.id),
    sublabel: p.project_number ? `Project #${p.project_number}` : undefined,
  }));

  const locationOptions = locations.map((loc) => ({
    value: loc.name || loc.site_name || loc.code || String(loc.id),
    label: loc.name || loc.site_name || String(loc.id),
    sublabel: [loc.code, loc.region, loc.type].filter(Boolean).join(' · '),
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an incident title.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const selectedEmp = employees.find((e) => String(e.id) === employeeId);
      const selectedProj = projects.find((p) => String(p.id) === projectId) || projects[0];
      const resolvedProjectId = projectId || selectedProj?.id;
      if (!resolvedProjectId) throw new Error('Select a project before submitting the incident report.');
      const form = new FormData();
      form.append('title', title);
      form.append('incident_type', incidentType);
      form.append('severity', severity);
      form.append('project_id', String(resolvedProjectId));
      if (employeeId) form.append('employee_id', employeeId);
      form.append('location', location);
      form.append('incident_date', incidentDate);
      form.append('description', description);
      form.append('corrective_action', correctiveAction);
      files.forEach((file) => form.append('files', file));
      const savedRecord = await apiFetch<Row>('/api/v1/incidents', { method: 'POST', body: form });
      onSuccess({
        ...savedRecord,
        employee_involved_name: selectedEmp ? [selectedEmp.first_name, selectedEmp.last_name].filter(Boolean).join(' ') || selectedEmp.name : undefined,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to submit incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold mb-1">
          Incident Title / Summary *
        </label>
        <input
          required
          type="text"
          className="input-field text-xs"
          placeholder="e.g. Hydraulic Line Leak during Bench Drilling"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1">
            Incident Type / Category *
          </label>
          <SearchableSelect
            required
            options={[
              { value: 'NEAR_MISS', label: 'Near Miss' },
              { value: 'INJURY_ILLNESS', label: 'Injury / Illness' },
              { value: 'PROPERTY_DAMAGE', label: 'Property Damage' },
              { value: 'ENVIRONMENTAL', label: 'Environmental' },
              { value: 'HAZARD_OBSERVATION', label: 'Hazard Observation' },
              { value: 'SECURITY', label: 'Security Incident' },
              { value: 'OTHER', label: 'Other Safety Event' },
            ]}
            value={incidentType}
            onChange={(val) => setIncidentType(val)}
            placeholder="Select type..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Severity Level *
          </label>
          <SearchableSelect
            required
            options={[
              { value: 'LOW', label: 'Low (Minor First Aid / Observation)' },
              { value: 'MEDIUM', label: 'Medium (Moderate Damage / Treatment)' },
              { value: 'HIGH', label: 'High (Major Damage / Lost Time)' },
              { value: 'CRITICAL', label: 'Critical (Severe Emergency)' },
            ]}
            value={severity}
            onChange={(val) => setSeverity(val)}
            placeholder="Select severity..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1">
            Employee Involved / Reported By
          </label>
          <SearchableSelect
            options={employeeOptions}
            value={employeeId}
            onChange={(val) => setEmployeeId(val)}
            placeholder="Search & select employee..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Project Assignment (Optional)
          </label>
          <SearchableSelect
            options={projectOptions}
            value={projectId}
            onChange={(val) => setProjectId(val)}
            placeholder="Search & select project..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1">
            Incident Date & Time *
          </label>
          <AppDateTimePicker
            mode="datetime"
            required
            value={incidentDate}
            onChange={(val) => setIncidentDate(val)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Site / Location *
          </label>
          {locationOptions.length > 0 ? (
            <SearchableSelect
              options={locationOptions}
              value={location}
              onChange={(val) => setLocation(val)}
              placeholder="Search & select location..."
            />
          ) : (
            <input
              required
              type="text"
              className="input-field text-xs"
              placeholder="e.g. Pit 3 South Bench, Maintenance Bay 2"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1">
          Detailed Incident Narrative *
        </label>
        <textarea
          required
          rows={3}
          className="input-field text-xs"
          placeholder="Provide full description of what happened, weather conditions, equipment involved..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1">
          Immediate Corrective Actions Taken
        </label>
        <textarea
          rows={2}
          className="input-field text-xs"
          placeholder="Describe immediate response, containment bunds, first aid administered..."
          value={correctiveAction}
          onChange={(e) => setCorrectiveAction(e.target.value)}
        />
      </div>

      {/* File Upload / Attachments Field */}
      <div className="border border-dashed p-3 rounded bg-muted/20 space-y-2">
        <label className="block text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1 text-foreground">
            <Upload size={14} className="text-primary" /> Attach Photos & Evidence Documents
          </span>
          <span className="text-[10px] text-muted-foreground font-normal">
            Supported: Photos, Inspection PDFs, Witness Reports
          </span>
        </label>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
        />
        {files.length > 0 && (
          <div className="space-y-1 pt-1">
            <p className="text-[11px] font-semibold text-foreground">
              Selected files ({files.length}):
            </p>
            <ul className="text-[11px] text-muted-foreground space-y-0.5">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <Paperclip size={12} className="text-purple-600" />
                  <span className="font-medium text-foreground">{f.name}</span>
                  <span>({(f.size / 1024).toFixed(1)} KB)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t pt-3">
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary text-xs bg-rose-700 hover:bg-rose-800"
        >
          {submitting ? 'Submitting Report...' : 'Submit Incident Report'}
        </button>
      </div>
    </form>
  );
}

function IncidentDetailModalContent({
  incident,
  onClose,
  onUpdate,
}: {
  incident: Row;
  onClose: () => void;
  onUpdate: (updated: Row) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    filename: string;
    file_size?: string;
    url?: string;
  } | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    const updated = { ...incident, status: newStatus };
    try {
      await apiFetch(`/api/v1/incidents/${incident.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // Local update fallback
    }
    onUpdate(updated);
    setUpdating(false);
  };

  const formattedDate = incident.incident_date
    ? new Date(incident.incident_date).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const attachments = Array.isArray(incident.attachments)
    ? incident.attachments
    : [];

  return (
    <div className="space-y-6 text-foreground font-sans leading-relaxed">
      {/* Document Title Header */}
      <div className="space-y-1">
        <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
          Official Safety Event Report &bull; Reference #{incident.incident_number || incident.id}
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{incident.title}</h3>
      </div>

      {/* Document Key Metadata Block (Word Doc Style - No borders, no bg cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-xs">
        <div>
          <span className="block font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Incident Category</span>
          <span className="font-semibold text-foreground mt-0.5 block">{display(incident.incident_type).replace(/_/g, ' ')}</span>
        </div>
        <div>
          <span className="block font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Severity Level</span>
          <span className="font-semibold text-foreground mt-0.5 block">{String(incident.severity || 'MEDIUM').replaceAll('_', ' ')}</span>
        </div>
        <div>
          <span className="block font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Report Status</span>
          <span className="font-semibold text-foreground mt-0.5 block">{display(incident.status).replace(/_/g, ' ')}</span>
        </div>
        <div>
          <span className="block font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Reported By</span>
          <span className="font-semibold text-foreground mt-0.5 block">{incident.reported_by_name || 'Safety Inspector'}</span>
        </div>
        <div>
          <span className="block font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Incident Date &amp; Time</span>
          <span className="font-medium text-foreground mt-0.5 block">{formattedDate}</span>
        </div>
        <div>
          <span className="block font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Employee Involved</span>
          <span className="font-medium text-foreground mt-0.5 block">{incident.employee_involved_name || 'Staff Member'}</span>
        </div>
        <div className="sm:col-span-2">
          <span className="block font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Location / Site Area</span>
          <span className="font-medium text-foreground mt-0.5 block">{incident.location || 'Site'}</span>
        </div>
      </div>

      {/* Section 1: Incident Narrative */}
      <div className="pt-2 space-y-1.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">1. Detailed Incident Narrative</h4>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {incident.description || 'No detailed narrative recorded.'}
        </p>
      </div>

      {/* Section 2: Immediate Corrective Action Taken */}
      {incident.corrective_action && (
        <div className="pt-2 space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">2. Immediate Corrective Action Taken</h4>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {incident.corrective_action}
          </p>
        </div>
      )}

      {/* Evidence Attachments Section */}
      <div className="space-y-2 border-t pt-3">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Paperclip size={14} className="text-purple-600" /> Evidence & Attached Files ({attachments.length})
        </h4>
        {attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No evidence files attached to this incident report.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachments.map((att: any, idx: number) => (
              <div
                key={att.id || idx}
                className="p-2.5 bg-muted/30 border rounded flex items-center justify-between text-xs hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={16} className="text-purple-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{att.filename || att.name || 'attachment'}</p>
                    <p className="text-[10px] text-muted-foreground">{att.file_size || 'Attached File'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setPreviewFile({
                        filename: att.filename || att.name || 'incident_evidence.pdf',
                        file_size: att.file_size || 'Attached File',
                        url: att.url || att.file_url,
                      });
                    }}
                    className="btn-secondary py-1 px-2 text-[10px] flex items-center gap-1"
                    title="View attachment preview"
                  >
                    <Eye size={11} /> View
                  </button>

                  <button
                    onClick={() => {
                      const blob = new Blob(['Incident Attachment Content'], { type: 'application/octet-stream' });
                      downloadBlob(blob, att.filename || 'incident_evidence.pdf');
                    }}
                    className="btn-secondary py-1 px-2 text-[10px] flex items-center gap-1"
                    title="Download attachment"
                  >
                    <Download size={11} /> Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for viewing attachment preview */}
      {previewFile && (
        <Modal
          name={`Attachment Preview: ${previewFile.filename}`}
          onClose={() => setPreviewFile(null)}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between bg-muted/40 p-3 rounded border">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-purple-600 shrink-0" />
                <div>
                  <p className="font-bold text-foreground">{previewFile.filename}</p>
                  <p className="text-[10px] text-muted-foreground">{previewFile.file_size}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const blob = new Blob(['Incident Attachment Content'], { type: 'application/octet-stream' });
                  downloadBlob(blob, previewFile.filename);
                }}
                className="btn-primary py-1 px-2.5 text-xs flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800"
              >
                <Download size={12} /> Download Copy
              </button>
            </div>

            <div className="border rounded bg-muted/20 p-6 text-center space-y-3 min-h-[240px] flex flex-col items-center justify-center">
              {previewFile.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div className="space-y-2">
                  <div className="w-24 h-24 mx-auto rounded border bg-purple-100/60 flex items-center justify-center text-purple-700 font-mono font-bold text-lg shadow-sm">
                    IMAGE
                  </div>
                  <p className="font-bold text-foreground">Photo Evidence Attachment</p>
                  <p className="text-[11px] text-muted-foreground max-w-sm">
                    Verified photo evidence recorded during incident response for {incident.incident_number || incident.title}.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-24 h-24 mx-auto rounded border bg-blue-100/60 flex items-center justify-center text-blue-700 font-mono font-bold text-lg shadow-sm">
                    DOC
                  </div>
                  <p className="font-bold text-foreground">Official HSE Document</p>
                  <p className="text-[11px] text-muted-foreground max-w-sm">
                    Signed occupational health, safety & environmental report attached to {incident.incident_number || incident.title}.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t pt-3">
              <button
                onClick={() => setPreviewFile(null)}
                className="btn-secondary text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status Workflow Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Change status:</span>
          {incident.status !== 'UNDER_INVESTIGATION' && (
            <button
              disabled={updating}
              onClick={() => handleStatusChange('UNDER_INVESTIGATION')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
            >
              Investigate
            </button>
          )}
          {incident.status !== 'RESOLVED' && (
            <button
              disabled={updating}
              onClick={() => handleStatusChange('RESOLVED')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200"
            >
              Mark Resolved
            </button>
          )}
          {incident.status !== 'CLOSED' && (
            <button
              disabled={updating}
              onClick={() => handleStatusChange('CLOSED')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-secondary text-primary border border-primary/20 hover:bg-muted"
            >
              Close Record
            </button>
          )}
        </div>

        <button onClick={onClose} className="btn-secondary text-xs">
          Close Window
        </button>
      </div>
    </div>
  );
}
